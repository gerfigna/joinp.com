#!/usr/bin/env node
'use strict';

/**
 * Parses microdatos-etl/db/renta-nacional.csv (INE: renta media y mediana por
 * municipio, multi-year, municipio+distrito+sección level) and
 * db/poblacion.csv (INE: población por municipio) and builds the `municipios`
 * SQLite table, keyed by the same 5-digit INE code used in
 * matriculaciones_moto.COD_MUNICIPIO_INE_VEH so the two tables can be joined
 * on that value. Also builds `provincia` and `comunidad_autonoma` (INE
 * catalog, lib/geografia.js) and links municipios → provincia →
 * comunidad_autonoma with real FOREIGN KEY constraints (coverage is 100%:
 * every municipio id's first 2 digits match one of the 52 INE provincias).
 *
 * Only year 2023 and municipio-level rows (Distritos/Secciones empty) are
 * used from renta-nacional.csv.
 *
 * No FOREIGN KEY is declared between matriculaciones_moto and municipios:
 * matriculaciones_moto has rows for some COD_MUNICIPIO_INE_VEH not present in
 * poblacion.csv (e.g. blank/legacy codes), so a real FK would reject those.
 *
 * Also parses db/poblacion_2025_municipios.csv (INE: población por municipio
 * desglosada por franja de edad, 21 franjas x ~8100 municipios) into 21 extra
 * "POBLACION_EDAD_*" columns on `municipios`, one per franja. This is treated
 * as a single reference snapshot (año 2025), not a time series: the age
 * distribution of a municipio is assumed roughly stable year to year, so a
 * future refresh overwrites these same columns instead of adding a new año.
 * The reference año is documented in code (POBLACION_EDAD_ANIO below) rather
 * than stored as a column/row value.
 *
 * Also parses two DGT censo-de-conductores files (pipe-delimited, provincia +
 * sexo + otra dimensión) into 5 "PERMISOS_MOTO_*" columns on `provincia`,
 * summed by provincia (sexo/edad/antigüedad breakdowns are dropped — nothing
 * else in the DB is disaggregated by sexo or driver edad to correlate them
 * against): total permisos tipo A (de
 * conductores_censo_2025_censo_prov_sexo_clase_edad_2025.txt) plus the AM/A1/
 * A2/A subclasses (de conductores_censo_2025_censo_prov_sexo_clase_antig_2025.txt),
 * which map to the cilindrada tiers used in vehiculos tags (AM≤50cc,
 * A1≤125cc, A2≤400cc aprox., A sin restricción).
 */

const fs = require('fs');
const path = require('path');

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase } = require('./lib/sqlite-store');
const { COMUNIDADES_AUTONOMAS, PROVINCIAS, PROVINCIA_CLIMA_REGION } = require('./lib/geografia');
const { MESES, parseClimaCsv } = require('./lib/clima');

const RENTA_CSV_PATH = path.join(__dirname, 'db', 'renta-nacional.csv');
const POBLACION_CSV_PATH = path.join(__dirname, 'db', 'poblacion.csv');
const RENTA_YEAR = '2023';

// Snapshot reference año for the POBLACION_EDAD_* columns — see file header comment.
const POBLACION_EDAD_CSV_PATH = path.join(__dirname, 'db', 'poblacion_2025_municipios.csv');
const POBLACION_EDAD_ANIO = '2025';

// Snapshot reference año for the PERMISOS_MOTO_* columns — see file header comment.
const PERMISOS_EDAD_CSV_PATH = path.join(__dirname, 'db', 'conductores_censo_2025_censo_prov_sexo_clase_edad_2025.txt');
const PERMISOS_ANTIG_CSV_PATH = path.join(__dirname, 'db', 'conductores_censo_2025_censo_prov_sexo_clase_antig_2025.txt');
const PERMISOS_MOTO_ANIO = '2025';

const CLIMA_DIR = path.join(__dirname, 'db', 'clima');
const CLIMA_FILES = [
  { file: 'PREC_1991_2020_Provincias.csv', prefix: 'PRECIPITACION' },
  { file: 'TMAX_1991_2020_Provincias.csv', prefix: 'TEMPERATURA_MAXIMA' },
  { file: 'TMED_1991_2020_Provincias.csv', prefix: 'TEMPERATURA_MEDIA' },
  { file: 'TMIN_1991_2020_Provincias.csv', prefix: 'TEMPERATURA_MINIMA' },
];

const INDICATOR_ORDER = [
  'Renta neta media por persona',
  'Renta neta media por hogar',
  'Media de la renta por unidad de consumo',
  'Mediana de la renta por unidad de consumo',
  'Renta bruta media por persona',
  'Renta bruta media por hogar',
];

function toSnakeCase(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseValue(raw) {
  const v = raw.trim();
  if (v === '' || v === '.') return null;
  const n = parseInt(v.replace(/\./g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function readCsvLines(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
  return raw.split(/\r\n|\n/).filter((l) => l.trim() !== '');
}

/**
 * Splits one CSV line on commas, respecting double-quoted fields that may
 * contain commas (e.g. "Ballestero, El"). Only handles the simple case used
 * by poblacion_2025_municipios.csv: no escaped quotes inside fields.
 */
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * A "Municipios" field is a real municipio row when it starts with a 5-digit
 * INE code (e.g. "46001 Ademuz"), as opposed to province-level aggregate rows
 * (e.g. "46 Valencia/València").
 */
function isMunicipioField(field) {
  return /^\d{5} /.test(field);
}

function parseRenta() {
  const lines = readCsvLines(RENTA_CSV_PATH);
  const header = lines[0].split(';');
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const indicadorCol = idx['Indicadores de renta media y mediana'] ?? idx['Indicadores de renta media'];

  const renta = new Map(); // id -> { año, valores: { indicador: valor } }

  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    const periodo = cols[idx['Periodo']];
    if (periodo !== RENTA_YEAR) continue;

    const municipioField = cols[idx['Municipios']];
    if (!isMunicipioField(municipioField)) continue;
    // Municipio-level rows only: district/sección breakdown rows have those columns populated.
    if (cols[idx['Distritos']].trim() !== '' || cols[idx['Secciones']].trim() !== '') continue;

    const id = municipioField.slice(0, 5);
    const indicador = cols[indicadorCol];
    const valor = parseValue(cols[idx['Total']]);

    if (!renta.has(id)) renta.set(id, { año: periodo, valores: {} });
    renta.get(id).valores[indicador] = valor;
  }

  return renta;
}

function parsePoblacion() {
  const lines = readCsvLines(POBLACION_CSV_PATH);
  const header = lines[0].split(';');
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const poblacion = new Map(); // id -> { nombre, año, valor }

  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    const municipioField = cols[idx['Municipios']];
    if (!isMunicipioField(municipioField)) continue;

    const id = municipioField.slice(0, 5);
    const nombre = municipioField.slice(6);
    const periodo = cols[idx['Periodo']];
    const valor = parseValue(cols[idx['Total']]);
    poblacion.set(id, { nombre, año: periodo, valor });
  }

  return poblacion;
}

/**
 * Converts an INE franja_edad label ("De 20 a 24 años", "100 y más años")
 * into a column name suffix ("20_24", "100_MAS").
 */
function franjaEdadColumnSuffix(label) {
  const rango = label.match(/^De (\d+) a (\d+) años$/);
  if (rango) return `${rango[1]}_${rango[2]}`;
  const plus = label.match(/^(\d+) y más años$/);
  if (plus) return `${plus[1]}_MAS`;
  throw new Error(`Franja de edad no reconocida: "${label}"`);
}

function franjaEdadSortKey(label) {
  return parseInt(label.match(/\d+/)[0], 10);
}

/**
 * Parses db/poblacion_2025_municipios.csv into { columns, valoresPorMunicipio },
 * where columns is the ordered list of POBLACION_EDAD_* column names and
 * valoresPorMunicipio maps municipioId -> { columnName: poblacion }.
 */
function parsePoblacionEdad() {
  const lines = readCsvLines(POBLACION_EDAD_CSV_PATH);
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const franjas = new Set();
  const valoresPorMunicipio = new Map(); // municipioId -> { columnName: poblacion }

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const municipioId = cols[idx['cod_municipio']];
    const franjaEdad = cols[idx['franja_edad']];
    const poblacion = parseValue(cols[idx['poblacion']]);

    franjas.add(franjaEdad);
    const columnName = `POBLACION_EDAD_${franjaEdadColumnSuffix(franjaEdad)}`;
    if (!valoresPorMunicipio.has(municipioId)) valoresPorMunicipio.set(municipioId, {});
    valoresPorMunicipio.get(municipioId)[columnName] = poblacion;
  }

  const columns = [...franjas]
    .sort((a, b) => franjaEdadSortKey(a) - franjaEdadSortKey(b))
    .map((label) => `POBLACION_EDAD_${franjaEdadColumnSuffix(label)}`);

  return { columns, valoresPorMunicipio };
}

/**
 * Parses the two DGT censo-de-conductores files into per-provincia totals:
 * PERMISOS_MOTO_TOTAL_2025 (NUM_PERMISOS_A summed across sexo+edad) and
 * PERMISOS_MOTO_{AM,A1,A2,A}_2025 (NUM_CONDUCTORES summed across sexo+antigüedad
 * for each CLASE_PERMISO). Returns { columns, valoresPorProvincia }.
 */
function parsePermisosMoto() {
  const columns = [
    'PERMISOS_MOTO_TOTAL_2025',
    'PERMISOS_MOTO_AM_2025',
    'PERMISOS_MOTO_A1_2025',
    'PERMISOS_MOTO_A2_2025',
    'PERMISOS_MOTO_A_2025',
  ];
  const valoresPorProvincia = new Map(); // provinciaId -> { [column]: total }
  const zero = () => Object.fromEntries(columns.map((c) => [c, 0]));

  const edadLines = readCsvLines(PERMISOS_EDAD_CSV_PATH);
  const edadHeader = edadLines[0].split('|');
  const edadIdx = Object.fromEntries(edadHeader.map((h, i) => [h, i]));
  for (const line of edadLines.slice(1)) {
    const cols = line.split('|');
    const provinciaId = cols[edadIdx['COD_PROVINCIA']];
    const total = parseValue(cols[edadIdx['NUM_PERMISOS_A']]) ?? 0;
    if (!valoresPorProvincia.has(provinciaId)) valoresPorProvincia.set(provinciaId, zero());
    valoresPorProvincia.get(provinciaId)['PERMISOS_MOTO_TOTAL_2025'] += total;
  }

  const CLASE_A_COLUMN = { AM: 'PERMISOS_MOTO_AM_2025', A1: 'PERMISOS_MOTO_A1_2025', A2: 'PERMISOS_MOTO_A2_2025', A: 'PERMISOS_MOTO_A_2025' };
  const antigLines = readCsvLines(PERMISOS_ANTIG_CSV_PATH);
  const antigHeader = antigLines[0].split('|');
  const antigIdx = Object.fromEntries(antigHeader.map((h, i) => [h, i]));
  for (const line of antigLines.slice(1)) {
    const cols = line.split('|');
    const provinciaId = cols[antigIdx['COD_PROVINCIA']];
    const clase = cols[antigIdx['CLASE_PERMISO']].trim();
    const column = CLASE_A_COLUMN[clase];
    if (!column) continue; // otras clases (B, C, D, LCM, LVA...) no aplican a motos
    const conductores = parseValue(cols[antigIdx['NUM_CONDUCTORES']]) ?? 0;
    if (!valoresPorProvincia.has(provinciaId)) valoresPorProvincia.set(provinciaId, zero());
    valoresPorProvincia.get(provinciaId)[column] += conductores;
  }

  return { columns, valoresPorProvincia };
}

/**
 * Reads the 4 AEMET db/clima/*_Provincias.csv files and returns, per metric
 * prefix, the ordered column names (13 per metric: 12 meses + anual, suffixed
 * with the reference period) and a lookup by provincia id.
 * @returns {{ metrics: { prefix: string, columns: string[] }[], valoresPorProvincia: Map<string, number[]> }}
 */
function parseClima() {
  const metrics = [];
  const valoresPorProvincia = new Map(); // provinciaId -> concatenated values across metrics, in CLIMA_FILES order

  for (const { file, prefix } of CLIMA_FILES) {
    const { periodo, porRegion } = parseClimaCsv(path.join(CLIMA_DIR, file));
    const periodoSuffix = periodo.replace('-', '_');
    const columns = [...MESES, 'anual'].map((m) => `${prefix}_${toSnakeCase(m)}_${periodoSuffix}`);
    metrics.push({ prefix, columns });

    for (const [provinciaId, region] of Object.entries(PROVINCIA_CLIMA_REGION)) {
      const entry = porRegion.get(region);
      if (!entry) throw new Error(`No hay datos de clima para "${region}" (provincia ${provinciaId}) en ${file}`);
      if (!valoresPorProvincia.has(provinciaId)) valoresPorProvincia.set(provinciaId, []);
      valoresPorProvincia.get(provinciaId).push(...entry.valores);
    }
  }

  return { metrics, valoresPorProvincia };
}

function buildComunidadesYProvincias(db, clima, permisos) {
  const climaColumns = clima.metrics.flatMap((m) => m.columns);
  const permisosColumns = permisos.columns;

  // municipios references provincia/comunidad_autonoma via FOREIGN KEY, so it
  // must be dropped first; buildMunicipios() recreates it afterwards.
  db.exec('DROP TABLE IF EXISTS municipios_renta');
  db.exec('DROP TABLE IF EXISTS municipios');
  db.exec('DROP TABLE IF EXISTS provincia');
  db.exec('DROP TABLE IF EXISTS comunidad_autonoma');
  db.exec(`
    CREATE TABLE comunidad_autonoma (
      id TEXT PRIMARY KEY,
      NOMBRE_COMUNIDAD_AUTONOMA TEXT NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE provincia (
      id TEXT PRIMARY KEY,
      NOMBRE_PROVINCIA TEXT NOT NULL,
      COMUNIDAD_AUTONOMA_ID TEXT NOT NULL,
      ${climaColumns.map((c) => `"${c}" REAL`).join(',\n      ')},
      -- Censo de conductores DGT, snapshot año ${PERMISOS_MOTO_ANIO}. No es serie
      -- temporal: se sobrescribe al refrescar.
      ${permisosColumns.map((c) => `"${c}" INTEGER`).join(',\n      ')},
      FOREIGN KEY (COMUNIDAD_AUTONOMA_ID) REFERENCES comunidad_autonoma(id)
    );
  `);

  const insertComunidad = db.prepare('INSERT INTO comunidad_autonoma (id, NOMBRE_COMUNIDAD_AUTONOMA) VALUES (?, ?)');
  const columns = [...climaColumns, ...permisosColumns];
  const insertProvincia = db.prepare(
    `INSERT INTO provincia (id, NOMBRE_PROVINCIA, COMUNIDAD_AUTONOMA_ID, ${columns.map((c) => `"${c}"`).join(', ')}) VALUES (?, ?, ?, ${columns.map(() => '?').join(', ')})`
  );

  db.exec('BEGIN');
  for (const [id, nombre] of COMUNIDADES_AUTONOMAS) insertComunidad.run(id, nombre);
  for (const [id, nombre, comunidadId] of PROVINCIAS) {
    const permisosValores = permisos.valoresPorProvincia.get(id);
    if (!permisosValores) throw new Error(`No hay datos de permisos de conducir para la provincia ${id}`);
    const permisosValues = permisosColumns.map((c) => permisosValores[c]);
    insertProvincia.run(id, nombre, comunidadId, ...clima.valoresPorProvincia.get(id), ...permisosValues);
  }
  db.exec('COMMIT');

  console.log(`comunidad_autonoma: ${COMUNIDADES_AUTONOMAS.length} filas, provincia: ${PROVINCIAS.length} filas (+${climaColumns.length} columnas de clima, +${permisosColumns.length} columnas de permisos de moto)`);
}

function buildMunicipios(db, renta, poblacion, poblacionEdad) {
  const rentaAño = [...renta.values()][0].año;
  const poblacionAño = [...poblacion.values()][0].año;
  const rentaColumns = INDICATOR_ORDER.map((ind) => `${toSnakeCase(ind)}_${rentaAño}`);
  const poblacionColumn = `POBLACION_${poblacionAño}`;
  const edadColumns = poblacionEdad.columns;

  db.exec('DROP TABLE IF EXISTS municipios_renta');
  db.exec('DROP TABLE IF EXISTS municipios');
  db.exec(`
    CREATE TABLE municipios (
      id TEXT PRIMARY KEY,
      NOMBRE_MUNICIPIO TEXT NOT NULL,
      PROVINCIA_ID TEXT NOT NULL,
      COMUNIDAD_AUTONOMA_ID TEXT NOT NULL,
      ${rentaColumns.map((c) => `"${c}" INTEGER`).join(',\n      ')},
      "${poblacionColumn}" INTEGER,
      -- Distribución de población por franja de edad, snapshot año ${POBLACION_EDAD_ANIO} (INE).
      -- No es serie temporal: se asume estable entre años y se sobrescribe al refrescar.
      ${edadColumns.map((c) => `"${c}" INTEGER`).join(',\n      ')},
      FOREIGN KEY (PROVINCIA_ID) REFERENCES provincia(id),
      FOREIGN KEY (COMUNIDAD_AUTONOMA_ID) REFERENCES comunidad_autonoma(id)
    );
  `);

  const provinciaById = new Map(PROVINCIAS.map(([id, , comunidadId]) => [id, comunidadId]));

  const columns = [...rentaColumns, poblacionColumn, ...edadColumns];
  const insert = db.prepare(
    `INSERT INTO municipios (id, NOMBRE_MUNICIPIO, PROVINCIA_ID, COMUNIDAD_AUTONOMA_ID, ${columns.map((c) => `"${c}"`).join(', ')}) VALUES (?, ?, ?, ?, ${columns.map(() => '?').join(', ')})`
  );

  db.exec('BEGIN');
  for (const [id, { nombre, valor: poblacionValor }] of poblacion) {
    const provinciaId = id.slice(0, 2);
    const comunidadId = provinciaById.get(provinciaId);
    const rentaValues = INDICATOR_ORDER.map((ind) => renta.get(id)?.valores[ind] ?? null);
    const edadValores = poblacionEdad.valoresPorMunicipio.get(id) ?? {};
    const edadValues = edadColumns.map((c) => edadValores[c] ?? null);
    insert.run(id, nombre, provinciaId, comunidadId, ...rentaValues, poblacionValor, ...edadValues);
  }
  db.exec('COMMIT');

  console.log(`municipios: ${poblacion.size} filas (${renta.size} con datos de renta, ${poblacionEdad.valoresPorMunicipio.size} con distribución por edad), columnas: ${columns.join(', ')}`);
}

function ensureMunicipioIndex(db) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='matriculaciones_moto'").get();
  if (!exists) { console.log('matriculaciones_moto no existe todavía — omitiendo índice de JOIN'); return; }
  db.exec('CREATE INDEX IF NOT EXISTS idx_matriculaciones_moto_municipio ON matriculaciones_moto (COD_MUNICIPIO_INE_VEH);');
  console.log('Índice idx_matriculaciones_moto_municipio listo para JOIN con municipios(id)');
}

function main() {
  const renta = parseRenta();
  const poblacion = parsePoblacion();
  const poblacionEdad = parsePoblacionEdad();
  const clima = parseClima();
  const permisos = parsePermisosMoto();
  const db = openDatabase();

  // matriculaciones_moto.MUNICIPIO_ID has a FOREIGN KEY into municipios(id),
  // and node:sqlite enforces FKs by default, so dropping/recreating municipios
  // below would fail once matriculaciones_moto has rows. FK pragma changes are
  // no-ops inside a transaction, so it must be toggled outside any BEGIN/COMMIT.
  // Existing rows aren't re-validated when FKs are turned back on — only future
  // writes are — so this is safe for a schema-maintenance script like this one.
  db.exec('PRAGMA foreign_keys = OFF');
  buildComunidadesYProvincias(db, clima, permisos);
  buildMunicipios(db, renta, poblacion, poblacionEdad);
  db.exec('PRAGMA foreign_keys = ON');
  ensureMunicipioIndex(db);

  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

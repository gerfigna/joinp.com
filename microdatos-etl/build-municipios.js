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

function buildComunidadesYProvincias(db, clima) {
  const climaColumns = clima.metrics.flatMap((m) => m.columns);

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
      FOREIGN KEY (COMUNIDAD_AUTONOMA_ID) REFERENCES comunidad_autonoma(id)
    );
  `);

  const insertComunidad = db.prepare('INSERT INTO comunidad_autonoma (id, NOMBRE_COMUNIDAD_AUTONOMA) VALUES (?, ?)');
  const insertProvincia = db.prepare(
    `INSERT INTO provincia (id, NOMBRE_PROVINCIA, COMUNIDAD_AUTONOMA_ID, ${climaColumns.map((c) => `"${c}"`).join(', ')}) VALUES (?, ?, ?, ${climaColumns.map(() => '?').join(', ')})`
  );

  db.exec('BEGIN');
  for (const [id, nombre] of COMUNIDADES_AUTONOMAS) insertComunidad.run(id, nombre);
  for (const [id, nombre, comunidadId] of PROVINCIAS) {
    insertProvincia.run(id, nombre, comunidadId, ...clima.valoresPorProvincia.get(id));
  }
  db.exec('COMMIT');

  console.log(`comunidad_autonoma: ${COMUNIDADES_AUTONOMAS.length} filas, provincia: ${PROVINCIAS.length} filas (+${climaColumns.length} columnas de clima)`);
}

function buildMunicipios(db, renta, poblacion) {
  const rentaAño = [...renta.values()][0].año;
  const poblacionAño = [...poblacion.values()][0].año;
  const rentaColumns = INDICATOR_ORDER.map((ind) => `${toSnakeCase(ind)}_${rentaAño}`);
  const poblacionColumn = `POBLACION_${poblacionAño}`;

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
      FOREIGN KEY (PROVINCIA_ID) REFERENCES provincia(id),
      FOREIGN KEY (COMUNIDAD_AUTONOMA_ID) REFERENCES comunidad_autonoma(id)
    );
  `);

  const provinciaById = new Map(PROVINCIAS.map(([id, , comunidadId]) => [id, comunidadId]));

  const columns = [...rentaColumns, poblacionColumn];
  const insert = db.prepare(
    `INSERT INTO municipios (id, NOMBRE_MUNICIPIO, PROVINCIA_ID, COMUNIDAD_AUTONOMA_ID, ${columns.map((c) => `"${c}"`).join(', ')}) VALUES (?, ?, ?, ?, ${columns.map(() => '?').join(', ')})`
  );

  db.exec('BEGIN');
  for (const [id, { nombre, valor: poblacionValor }] of poblacion) {
    const provinciaId = id.slice(0, 2);
    const comunidadId = provinciaById.get(provinciaId);
    const rentaValues = INDICATOR_ORDER.map((ind) => renta.get(id)?.valores[ind] ?? null);
    insert.run(id, nombre, provinciaId, comunidadId, ...rentaValues, poblacionValor);
  }
  db.exec('COMMIT');

  console.log(`municipios: ${poblacion.size} filas (${renta.size} con datos de renta), columnas: ${columns.join(', ')}`);
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
  const clima = parseClima();
  const db = openDatabase();

  buildComunidadesYProvincias(db, clima);
  buildMunicipios(db, renta, poblacion);
  ensureMunicipioIndex(db);

  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

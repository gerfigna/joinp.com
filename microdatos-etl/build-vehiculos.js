#!/usr/bin/env node
'use strict';

/**
 * Groups matriculaciones_moto rows by (MARCA_ITV_NORMALIZADO,
 * MODELO_ITV_NORMALIZADO, POTENCIA_ITV) and upserts one `vehiculos` row per
 * combination. For every other column, the value is kept only if every row
 * in the group shares the exact same value (including NULL).
 *
 * A column is dropped from the table entirely if it ever needed a
 * "disagreement NULL" (rows in some group had different values) — that NULL
 * would be an artifact of the grouping, not real data. Columns are kept when
 * their only NULLs are "consensus NULLs" (every matriculación of that
 * vehiculo genuinely had no value for that field).
 *
 * The table is upserted (not dropped/recreated) so that `id` stays stable —
 * matriculaciones_moto.VEHICULO_ID and vehiculo_tags.VEHICULO_ID reference
 * it — and curated columns (PRECIO) survive re-runs.
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase, ALL_COLUMNS } = require('./lib/sqlite-store');

const KEY_COLUMNS = ['MARCA_ITV_NORMALIZADO', 'MODELO_ITV_NORMALIZADO', 'POTENCIA_ITV'];

// Per-registration attributes (date, chassis, geographic data), not
// per-vehiculo attributes: any non-null value on these only reflects that a
// combination happened to have a single matriculación, not a real match.
const EXCLUDED_COLUMNS = [
  // fecha
  'FEC_MATRICULA', 'FEC_TRAMITACION', 'FEC_TRAMITE', 'FEC_PRIM_MATRICULACION', 'FEC_PROCESO',
  // bastidor
  'BASTIDOR_ITV',
  // datos geográficos
  'LOCALIDAD_VEHICULO', 'COD_PROVINCIA_VEH', 'COD_PROVINCIA_MAT', 'CODIGO_POSTAL',
  'COD_MUNICIPIO_INE_VEH', 'MUNICIPIO', 'COD_PROVINCIA_VEH_NORMALIZADO', 'COMUNIDAD_AUTONOMA_NORMALIZADO',
  // atributos del trámite de matriculación, no del vehículo/modelo
  'COD_CLASE_MAT', 'CLAVE_TRAMITE', 'IND_NUEVO_USADO', 'IND_BAJA_DEF', 'BAJA_TELEMATICA', 'NUM_TITULARES',
  'CODIGO_ITV', 'TIPO_ITV', 'CODIGO_ECO_ITV', 'PLAZAS_PIE',
];

const OTHER_COLUMNS = ALL_COLUMNS.filter((c) => !KEY_COLUMNS.includes(c) && !EXCLUDED_COLUMNS.includes(c));

// Columns curated by hand (research, categorization) — never overwritten by
// this script once set, and never dropped even if some group disagrees.
const CURATED_COLUMNS = [['PRECIO', 'REAL']];

function groupRows(db) {
  const selectColumns = [...KEY_COLUMNS, ...OTHER_COLUMNS];
  const rows = db.prepare(`SELECT ${selectColumns.map((c) => `"${c}"`).join(', ')} FROM matriculaciones_moto ORDER BY id`).all();

  const groups = new Map(); // key -> { keyValues, consensus: {col: value}, differs: {col: bool} }
  for (const row of rows) {
    const key = KEY_COLUMNS.map((c) => row[c]).join(' ');
    let g = groups.get(key);
    if (!g) {
      g = {
        keyValues: KEY_COLUMNS.map((c) => row[c]),
        consensus: Object.fromEntries(OTHER_COLUMNS.map((c) => [c, row[c]])),
        differs: Object.fromEntries(OTHER_COLUMNS.map((c) => [c, false])),
      };
      groups.set(key, g);
    } else {
      for (const c of OTHER_COLUMNS) {
        if (!g.differs[c] && g.consensus[c] !== row[c]) g.differs[c] = true;
      }
    }
  }

  return groups;
}

/**
 * A column is kept only if no group ever disagreed on it (g.differs[c] is
 * always false) — its NULLs, if any, come solely from every matriculación of
 * that vehiculo genuinely sharing a NULL value.
 */
function columnsWithoutDisagreement(groups) {
  const hasDisagreement = new Set();
  for (const g of groups.values()) {
    for (const c of OTHER_COLUMNS) {
      if (g.differs[c]) hasDisagreement.add(c);
    }
  }
  return OTHER_COLUMNS.filter((c) => !hasDisagreement.has(c));
}

function ensureVehiculosTable(db, keptColumns) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vehiculos'").get();
  if (!exists) {
    db.exec(`
      CREATE TABLE vehiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${KEY_COLUMNS.map((c) => `"${c}" TEXT NOT NULL`).join(',\n        ')},
        ${keptColumns.map((c) => `"${c}" TEXT`).join(',\n        ')},
        ${CURATED_COLUMNS.map(([c, type]) => `"${c}" ${type}`).join(',\n        ')}
      );
    `);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_vehiculos_key ON vehiculos (${KEY_COLUMNS.map((c) => `"${c}"`).join(', ')})`);

  const existingCols = new Set(db.prepare('PRAGMA table_info(vehiculos)').all().map((c) => c.name));
  for (const c of keptColumns) {
    if (!existingCols.has(c)) db.exec(`ALTER TABLE vehiculos ADD COLUMN "${c}" TEXT`);
  }
  for (const [c, type] of CURATED_COLUMNS) {
    if (!existingCols.has(c)) db.exec(`ALTER TABLE vehiculos ADD COLUMN "${c}" ${type}`);
  }
}

function buildVehiculos(db, groups, keptColumns) {
  ensureVehiculosTable(db, keptColumns);

  const columns = [...KEY_COLUMNS, ...keptColumns];
  const onConflict = keptColumns.length > 0
    ? `DO UPDATE SET ${keptColumns.map((c) => `"${c}" = excluded."${c}"`).join(', ')}`
    : 'DO NOTHING';
  const upsert = db.prepare(`
    INSERT INTO vehiculos (${columns.map((c) => `"${c}"`).join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
    ON CONFLICT (${KEY_COLUMNS.map((c) => `"${c}"`).join(', ')})
    ${onConflict}
  `);

  db.exec('BEGIN');
  for (const g of groups.values()) {
    const otherValues = keptColumns.map((c) => g.consensus[c]);
    upsert.run(...g.keyValues, ...otherValues);
  }
  db.exec('COMMIT');

  console.log(`vehiculos: ${groups.size} filas, ${columns.length + CURATED_COLUMNS.length} columnas (${OTHER_COLUMNS.length - keptColumns.length} descartadas por desacuerdo)`);
}

function main() {
  const db = openDatabase();
  const groups = groupRows(db);
  const keptColumns = columnsWithoutDisagreement(groups);
  buildVehiculos(db, groups, keptColumns);
  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

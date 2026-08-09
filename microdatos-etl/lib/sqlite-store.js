'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const { SQLITE_DB_PATH } = require('./constants');
const { FIELDS } = require('./fields');

const FIELD_NAMES = FIELDS.map(([name]) => name);
const NORMALIZED_COLUMNS = [
  'MARCA_ITV_NORMALIZADO',
  'MODELO_ITV_NORMALIZADO',
  'COD_PROVINCIA_VEH_NORMALIZADO',
  'COMUNIDAD_AUTONOMA_NORMALIZADO',
];
const ALL_COLUMNS = [...FIELD_NAMES, ...NORMALIZED_COLUMNS];

function openDatabase() {
  fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
  const db = new DatabaseSync(SQLITE_DB_PATH);

  const columnDefs = ALL_COLUMNS.map((name) => `"${name}" TEXT`).join(',\n    ');
  db.exec(`
    CREATE TABLE IF NOT EXISTS matriculaciones_moto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      DIA_ORIGEN TEXT NOT NULL,
      ${columnDefs}
    );
    CREATE INDEX IF NOT EXISTS idx_matriculaciones_moto_dia ON matriculaciones_moto (DIA_ORIGEN);
    CREATE TABLE IF NOT EXISTS dias_descargados (
      dia TEXT PRIMARY KEY,
      filas_insertadas INTEGER NOT NULL,
      fecha_proceso TEXT NOT NULL,
      origen TEXT NOT NULL DEFAULT 'diario'
    );
  `);

  const cols = db.prepare("PRAGMA table_info(dias_descargados)").all().map((c) => c.name);
  if (!cols.includes('origen')) {
    db.exec("ALTER TABLE dias_descargados ADD COLUMN origen TEXT NOT NULL DEFAULT 'diario'");
  }

  return db;
}

function isDayDownloaded(db, dia) {
  const row = db.prepare('SELECT 1 FROM dias_descargados WHERE dia = ?').get(dia);
  return !!row;
}

function insertDay(db, dia, rows, origen) {
  const placeholders = ALL_COLUMNS.map(() => '?').join(', ');
  const insertRow = db.prepare(
    `INSERT INTO matriculaciones_moto (DIA_ORIGEN, ${ALL_COLUMNS.map((c) => `"${c}"`).join(', ')}) VALUES (?, ${placeholders})`
  );
  const insertDia = db.prepare(
    'INSERT INTO dias_descargados (dia, filas_insertadas, fecha_proceso, origen) VALUES (?, ?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (const row of rows) insertRow.run(dia, ...ALL_COLUMNS.map((c) => row[c]));
    insertDia.run(dia, rows.length, new Date().toISOString(), origen);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = { ALL_COLUMNS, openDatabase, isDayDownloaded, insertDay };

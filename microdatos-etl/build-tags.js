#!/usr/bin/env node
'use strict';

/**
 * Creates `tags` (catálogo, lib/tags.js) and `vehiculo_tags` (relación
 * many-to-many con vehiculos). Idempotent: re-running upserts the catalog
 * without touching existing vehiculo_tags assignments.
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase } = require('./lib/sqlite-store');
const { TAGS } = require('./lib/tags');

function buildTagsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      NOMBRE TEXT NOT NULL UNIQUE,
      CATEGORIA TEXT NOT NULL
    );
  `);

  const upsert = db.prepare(`
    INSERT INTO tags (NOMBRE, CATEGORIA) VALUES (?, ?)
    ON CONFLICT (NOMBRE) DO UPDATE SET CATEGORIA = excluded.CATEGORIA
  `);

  db.exec('BEGIN');
  for (const [nombre, categoria] of TAGS) upsert.run(nombre, categoria);
  db.exec('COMMIT');

  console.log(`tags: ${TAGS.length} filas`);
}

function buildVehiculoTagsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehiculo_tags (
      VEHICULO_ID INTEGER NOT NULL,
      TAG_ID INTEGER NOT NULL,
      PRIMARY KEY (VEHICULO_ID, TAG_ID),
      FOREIGN KEY (VEHICULO_ID) REFERENCES vehiculos(id),
      FOREIGN KEY (TAG_ID) REFERENCES tags(id)
    );
  `);
  console.log('vehiculo_tags: tabla lista (relación many-to-many)');
}

function main() {
  const db = openDatabase();
  buildTagsTable(db);
  buildVehiculoTagsTable(db);
  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

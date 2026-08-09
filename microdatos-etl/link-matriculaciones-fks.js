#!/usr/bin/env node
'use strict';

/**
 * Rebuilds matriculaciones_moto adding two derived, nullable FK columns:
 *   - MUNICIPIO_ID  → municipios(id),  matched from raw COD_MUNICIPIO_INE_VEH
 *   - VEHICULO_ID   → vehiculos(id),   matched from raw (MARCA_ITV_NORMALIZADO,
 *                                       MODELO_ITV_NORMALIZADO, POTENCIA_ITV)
 *
 * The raw DGT columns (COD_MUNICIPIO_INE_VEH, MARCA_ITV_NORMALIZADO, ...) are
 * never modified — no data is lost. MUNICIPIO_ID/VEHICULO_ID are NULL when the
 * raw value doesn't match a catalog row (bad/unknown code, new vehiculo not
 * yet in the vehiculos snapshot), which makes those inconsistencies queryable
 * instead of silently discarding or corrupting the source data.
 *
 * Must run after build-municipios.js and build-vehiculos.js (both referenced
 * tables must already exist and be populated), and should be re-run whenever
 * new matriculaciones are downloaded so the derived columns stay in sync.
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase, ALL_COLUMNS } = require('./lib/sqlite-store');

const VEHICULO_KEY = ['MARCA_ITV_NORMALIZADO', 'MODELO_ITV_NORMALIZADO', 'POTENCIA_ITV'];

function requireTable(db, name, hint) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (!exists) throw new Error(`Falta la tabla "${name}" — ejecuta ${hint} primero.`);
}

function ensureVehiculoUniqueIndex(db) {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_vehiculos_key ON vehiculos (${VEHICULO_KEY.map((c) => `"${c}"`).join(', ')})`);
}

function rebuildMatriculacionesConFks(db) {
  const columnDefs = ALL_COLUMNS.map((name) => `"${name}" TEXT`).join(',\n      ');
  const vehiculoJoin = VEHICULO_KEY.map((c) => `v."${c}" = m."${c}"`).join(' AND ');

  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE matriculaciones_moto_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        DIA_ORIGEN TEXT NOT NULL,
        ${columnDefs},
        MUNICIPIO_ID TEXT,
        VEHICULO_ID INTEGER,
        FOREIGN KEY (MUNICIPIO_ID) REFERENCES municipios(id),
        FOREIGN KEY (VEHICULO_ID) REFERENCES vehiculos(id)
      );
    `);
    db.exec(`
      INSERT INTO matriculaciones_moto_new (id, DIA_ORIGEN, ${ALL_COLUMNS.map((c) => `"${c}"`).join(', ')}, MUNICIPIO_ID, VEHICULO_ID)
      SELECT m.id, m.DIA_ORIGEN, ${ALL_COLUMNS.map((c) => `m."${c}"`).join(', ')}, mu.id, v.id
      FROM matriculaciones_moto m
      LEFT JOIN municipios mu ON mu.id = m.COD_MUNICIPIO_INE_VEH
      LEFT JOIN vehiculos v ON ${vehiculoJoin};
    `);
    db.exec('DROP TABLE matriculaciones_moto;');
    db.exec('ALTER TABLE matriculaciones_moto_new RENAME TO matriculaciones_moto;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_matriculaciones_moto_dia ON matriculaciones_moto (DIA_ORIGEN);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_matriculaciones_moto_cod_municipio ON matriculaciones_moto (COD_MUNICIPIO_INE_VEH);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_matriculaciones_moto_municipio_id ON matriculaciones_moto (MUNICIPIO_ID);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_matriculaciones_moto_vehiculo_id ON matriculaciones_moto (VEHICULO_ID);');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function reportIncongruencias(db) {
  const municipioHuerfano = db.prepare(`
    SELECT COD_MUNICIPIO_INE_VEH, COUNT(*) n FROM matriculaciones_moto
    WHERE COD_MUNICIPIO_INE_VEH IS NOT NULL AND MUNICIPIO_ID IS NULL
    GROUP BY COD_MUNICIPIO_INE_VEH
  `).all();
  const vehiculoHuerfano = db.prepare(`
    SELECT MARCA_ITV_NORMALIZADO, MODELO_ITV_NORMALIZADO, POTENCIA_ITV, COUNT(*) n FROM matriculaciones_moto
    WHERE VEHICULO_ID IS NULL
    GROUP BY MARCA_ITV_NORMALIZADO, MODELO_ITV_NORMALIZADO, POTENCIA_ITV
  `).all();

  console.log(`MUNICIPIO_ID sin match (COD_MUNICIPIO_INE_VEH inválido/no catalogado): ${municipioHuerfano.length} código(s) — ${JSON.stringify(municipioHuerfano)}`);
  console.log(`VEHICULO_ID sin match (combinación no presente en vehiculos): ${vehiculoHuerfano.length} combinación(es)${vehiculoHuerfano.length ? ' — ' + JSON.stringify(vehiculoHuerfano) : ''}`);
}

function main() {
  const db = openDatabase();

  requireTable(db, 'municipios', 'build-municipios.js');
  requireTable(db, 'vehiculos', 'build-vehiculos.js');

  ensureVehiculoUniqueIndex(db);
  rebuildMatriculacionesConFks(db);
  reportIncongruencias(db);

  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

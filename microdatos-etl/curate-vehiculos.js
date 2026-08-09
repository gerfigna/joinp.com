#!/usr/bin/env node
'use strict';

/**
 * Aplica el precio base y las etiquetas curados en lib/vehiculos-precios.js
 * a la tabla vehiculos. Seguro de re-ejecutar (idempotente) y es el paso a
 * correr después de (re)generar vehiculos con build-vehiculos.js, por
 * ejemplo si hubiera que recrear la tabla desde cero.
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase } = require('./lib/sqlite-store');
const { CURATED } = require('./lib/vehiculos-precios');

function applyCuration(db) {
  const getTagId = db.prepare('SELECT id FROM tags WHERE NOMBRE = ?');
  const setPrecio = db.prepare('UPDATE vehiculos SET PRECIO = ? WHERE id = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO vehiculo_tags (VEHICULO_ID, TAG_ID) VALUES (?, ?)');
  const checkVehiculo = db.prepare('SELECT MARCA_ITV_NORMALIZADO marca, MODELO_ITV_NORMALIZADO modelo FROM vehiculos WHERE id = ?');

  let vehiculosActualizados = 0;
  let tagsAsignados = 0;
  let omitidos = 0;

  db.exec('BEGIN');
  for (const entry of CURATED) {
    const current = checkVehiculo.get(entry.id);
    if (!current) { console.warn(`WARN: vehiculos.id=${entry.id} no existe — omitido`); omitidos++; continue; }
    if (current.marca !== entry.marca || current.modelo !== entry.modelo) {
      console.warn(`WARN: vehiculos.id=${entry.id} esperado ${entry.marca} ${entry.modelo}, encontrado ${current.marca} ${current.modelo} — omitido`);
      omitidos++;
      continue;
    }

    setPrecio.run(entry.precio, entry.id);
    vehiculosActualizados++;

    for (const tagName of entry.tags) {
      const tag = getTagId.get(tagName);
      if (!tag) { console.warn(`WARN: tag "${tagName}" no existe en el catálogo`); continue; }
      linkTag.run(entry.id, tag.id);
      tagsAsignados++;
    }
  }
  db.exec('COMMIT');

  console.log(`Precio actualizado en ${vehiculosActualizados}/${CURATED.length} vehiculos (${omitidos} omitidos por desajuste de id/marca/modelo). ${tagsAsignados} asignaciones vehiculo_tags creadas.`);
}

function main() {
  const db = openDatabase();
  applyCuration(db);
  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

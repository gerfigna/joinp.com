#!/usr/bin/env node
'use strict';

/**
 * Curación manual (investigación web, agosto 2026) de precio base (PVP
 * oficial España, versión más básica cuando hay varias) y etiquetas para los
 * vehiculos más matriculados. Ejecutar de nuevo tras investigar más lotes
 * (top 200) añadiendo entradas a CURATED.
 *
 * VEHICULO_ID corresponde a vehiculos.id en el momento de la investigación
 * (agosto 2026) — estable entre ejecuciones de build-vehiculos.js gracias al
 * upsert por clave natural.
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase } = require('./lib/sqlite-store');

const CURATED = [
  { id: 17, marca: 'YAMAHA', modelo: 'NMAX 125', precio: 3599, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Mainstream', 'Scooter Urban'] },
  { id: 26, marca: 'HONDA', modelo: 'PCX 125', precio: 3499, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Mainstream', 'Scooter Urban'] },
  { id: 30, marca: 'ZONTES', modelo: '368G', precio: 4888, tags: ['Scooter', 'Crossover', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Mixta', 'Scooter Adventure'] },
  { id: 18, marca: 'ZONTES', modelo: '125X', precio: 2688, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 16, marca: 'SYM', modelo: 'SYMPHONY 125', precio: 2399, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 3, marca: 'VOGE', modelo: 'DS800X RALLY', precio: 7888, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 21, marca: 'HONDA', modelo: 'SH125i', precio: 4190, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Premium', 'Mainstream', 'Scooter Urban'] },
  { id: 115, marca: 'HONDA', modelo: 'FORZA125', precio: 5550, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'City/Commuting', 'Carretera', '125cc', 'Carné A1', 'Premium', 'Scooter Sport'] },
  { id: 8, marca: 'KYMCO', modelo: 'AGILITY S', precio: 2450, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 28, marca: 'HONDA', modelo: 'ADV 350', precio: 6740, tags: ['Scooter', 'Crossover', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Mixta', 'Scooter Adventure'] },
  { id: 51, marca: 'YAMAHA', modelo: 'XMAX 125', precio: 5499, tags: ['Scooter', 'Deportivo', 'City/Commuting', 'Carretera', '125cc', 'Carné A1', 'Premium', 'Scooter Sport'] },
  { id: 23, marca: 'VOGE', modelo: 'DS900X', precio: 9192, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Gama media', 'Off-road/Aventura', 'Trail Deportiva'] },
  { id: 10, marca: 'SYM', modelo: 'JET 14', precio: 2599, tags: ['Scooter', 'Urbana', 'Compacto', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 55, marca: 'YAMAHA', modelo: 'RayZR 125', precio: 2399, tags: ['Scooter', 'Urbana', 'Bajo consumo', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Híbrido', 'Scooter Urban'] },
  { id: 64, marca: 'HONDA', modelo: 'VISION 110', precio: 2599, tags: ['Scooter', 'Urbana', 'Bajo consumo', 'City/Commuting', 'Ligera (110-124cc)', 'Carné A1', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 35, marca: 'RIEJU', modelo: 'RALLY 307', precio: 4499, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 78, marca: 'VOGE', modelo: '625DSX', precio: 6592, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Turismo'] },
  { id: 7, marca: 'PIAGGIO', modelo: 'LIBERTY 125 ABS', precio: 2999, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Con ABS', 'Entry-level', 'Scooter Urban'] },
  { id: 110, marca: 'YAMAHA', modelo: 'XMAX 300', precio: 6499, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Carretera', 'Turismo', 'Media (300-400cc)', 'Carné A2', 'Premium', 'Scooter Sport'] },
  { id: 9, marca: 'HONDA', modelo: 'ADV 750', precio: 13500, tags: ['Scooter', 'Crossover', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Premium', 'Mixta', 'Scooter Adventure'] },
  { id: 159, marca: 'YAMAHA', modelo: 'MT-07', precio: 7799, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama media', 'Mainstream'] },
  { id: 6, marca: 'ZONTES', modelo: '125C', precio: 3087, tags: ['Moto Custom', 'Clásico', '125cc', 'Carné A1', 'Económica', 'Urbana', 'Carretera'] },
  { id: 70, marca: 'YAMAHA', modelo: 'XTZ 700 Tenere', precio: 11199, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A', 'Off-road/Aventura', 'Gama alta', 'Trail Deportiva'] },
  { id: 4, marca: 'KAWASAKI', modelo: 'Z900', precio: 10235, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', 'Carné A', 'Carretera', 'Gama alta'] },
  { id: 91, marca: 'HONDA', modelo: 'XL750 Transalp', precio: 9990, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Gama alta', 'Trail Turismo'] },
  { id: 76, marca: 'KYMCO', modelo: 'SKYTOWN 125', precio: 2750, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Con ABS', 'Entry-level', 'Scooter Urban'] },
  { id: 93, marca: 'APRILIA', modelo: 'SR GT 125', precio: 3350, tags: ['Scooter', 'Deportivo', 'City/Commuting', 'Carretera', '125cc', 'Carné A1', 'Premium', 'Scooter Sport'] },
  { id: 69, marca: 'BMW', modelo: 'R 1300 GS', precio: 22230, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Grand Turismo', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 34, marca: 'KYMCO', modelo: 'DTX', precio: 3690, tags: ['Scooter', 'Crossover', 'Adventure', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Mixta', 'Scooter Adventure'] },
  // id 59 RIEJU "N.A." omitido: modelo no identificable de forma fiable.
];

function applyCuration(db) {
  const getTagId = db.prepare('SELECT id FROM tags WHERE NOMBRE = ?');
  const setPrecio = db.prepare('UPDATE vehiculos SET PRECIO = ? WHERE id = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO vehiculo_tags (VEHICULO_ID, TAG_ID) VALUES (?, ?)');
  const checkVehiculo = db.prepare('SELECT MARCA_ITV_NORMALIZADO marca, MODELO_ITV_NORMALIZADO modelo FROM vehiculos WHERE id = ?');

  let vehiculosActualizados = 0;
  let tagsAsignados = 0;

  db.exec('BEGIN');
  for (const entry of CURATED) {
    const current = checkVehiculo.get(entry.id);
    if (!current) { console.warn(`WARN: vehiculos.id=${entry.id} no existe — omitido`); continue; }
    if (current.marca !== entry.marca || current.modelo !== entry.modelo) {
      console.warn(`WARN: vehiculos.id=${entry.id} esperado ${entry.marca} ${entry.modelo}, encontrado ${current.marca} ${current.modelo} — omitido`);
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

  console.log(`Precio actualizado en ${vehiculosActualizados} vehiculos. ${tagsAsignados} asignaciones vehiculo_tags creadas.`);
}

function main() {
  const db = openDatabase();
  applyCuration(db);
  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

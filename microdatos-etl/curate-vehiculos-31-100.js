#!/usr/bin/env node
'use strict';

/**
 * Curación manual (investigación web, agosto 2026) de precio base y
 * etiquetas para los vehiculos en las posiciones 31-100 por matriculaciones.
 * Ver curate-vehiculos-top30.js para la metodología (PVP oficial España,
 * versión más básica cuando hay varias; verificación de marca/modelo antes
 * de escribir).
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase } = require('./lib/sqlite-store');

const CURATED = [
  { id: 12, marca: 'HONDA', modelo: 'SH Mode 125', precio: 3050, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 149, marca: 'YAMAHA', modelo: 'TMAX 560', precio: 14299, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Turismo', 'Carné A2', 'Premium', 'Gama alta', 'Scooter Sport'] },
  { id: 37, marca: 'CFMOTO', modelo: '450MT', precio: 5995, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Con ABS', 'Control de tracción', 'Trail Deportiva'] },
  { id: 199, marca: 'VOGE', modelo: 'R125', precio: 3087, tags: ['Moto Naked', '125cc', 'Carné A1', 'Económica', 'Urbana', 'Carretera'] },
  { id: 25, marca: 'ZONTES', modelo: '125E', precio: 3887, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Urban'] },
  { id: 61, marca: 'ZONTES', modelo: '703RR', precio: 7688, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Carretera', 'Gama media', 'Pantalla TFT', 'Conectividad'] },
  { id: 200, marca: 'HONDA', modelo: 'FORZA 350', precio: 6500, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Media (300-400cc)', 'Carné A2', 'Premium', 'Scooter Sport'] },
  { id: 111, marca: 'VOGE', modelo: 'SR1ADV', precio: 2992, tags: ['Scooter', 'Crossover', 'Adventure', '125cc', 'Carné A1', 'Económica', 'Scooter Adventure'] },
  { id: 140, marca: 'VOGE', modelo: 'DS525X', precio: 5392, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 81, marca: 'HONDA', modelo: 'FORZA 750', precio: 12390, tags: ['Scooter', 'Crossover', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Premium', 'Gama alta', 'Mixta', 'Scooter Adventure'] },
  { id: 193, marca: 'PIAGGIO', modelo: 'VESPA PRIMAVERA 125', precio: 4499, tags: ['Scooter', 'Clásico', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Premium', 'Scooter Urban'] },
  { id: 43, marca: 'YAMAHA', modelo: 'MT-125', precio: 5499, tags: ['Moto Naked', 'Deportivo', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Mainstream'] },
  { id: 197, marca: 'SILENCE', modelo: 'S01', precio: 3600, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Bajo consumo', 'Carné A1', 'Premium', 'Entry-level', 'Scooter Urban'] },
  { id: 166, marca: 'YAMAHA', modelo: 'MT-09', precio: 11299, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama alta', 'Mainstream'] },
  { id: 5, marca: 'KYMCO', modelo: 'SUPER DINK GT 125 E5+', precio: 4250, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'City/Commuting', '125cc', 'Carné A1', 'Premium', 'Con ABS', 'Control de tracción', 'Scooter Sport'] },
  { id: 147, marca: 'ZONTES', modelo: '703F', precio: 7288, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Gama media', 'Trail Turismo'] },
  { id: 119, marca: 'HONDA', modelo: 'NX500', precio: 6450, tags: ['Trail', 'Moto Adventure', 'Crossover', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Mixta', 'Trail Deportiva'] },
  { id: 122, marca: 'QJMOTOR', modelo: 'ATR 125 E5+', precio: 3199, tags: ['Scooter', 'Crossover', 'Adventure', '125cc', 'Carné A1', 'Económica', 'Híbrido', 'Pantalla TFT', 'Scooter Adventure'] },
  { id: 44, marca: 'KYMCO', modelo: 'AGILITY 16+50', precio: 2296, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 144, marca: 'BMW', modelo: 'R 1300 GS ADVENTURE', precio: 24940, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Grand Turismo', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 99, marca: 'PEUGEOT', modelo: 'KISBEE M', precio: 1199, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 38, marca: 'HONDA', modelo: 'SH350i', precio: 6400, tags: ['Scooter', 'Urbana', 'Premium', 'Media (300-400cc)', 'Carné A2', 'City/Commuting', 'Con ABS', 'Control de tracción', 'Mainstream', 'Scooter Urban'] },
  { id: 151, marca: 'PIAGGIO', modelo: 'MEDLEY 125', precio: 3500, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Urban'] },
  { id: 203, marca: 'SYM', modelo: 'JET X', precio: 3399, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 67, marca: 'VOGE', modelo: 'R125S', precio: 3999, tags: ['Moto Naked', 'Deportivo', '125cc', 'Carné A1', 'Carretera', 'Con ABS', 'Pantalla TFT', 'Conectividad'] },
  { id: 176, marca: 'ZONTES', modelo: '368E', precio: 4592, tags: ['Scooter', 'Crossover', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Mixta', 'Scooter Adventure'] },
  { id: 47, marca: 'QJMOTOR', modelo: 'MTX 125 E5+', precio: 2999, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Híbrido', 'Scooter Urban'] },
  { id: 227, marca: 'HONDA', modelo: 'NC 750 X', precio: 9090, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama alta', 'Trail Turismo'] },
  { id: 114, marca: 'KYMCO', modelo: 'DTX', precio: 4650, tags: ['Scooter', 'Crossover', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Mixta', 'Scooter Adventure'] },
  { id: 157, marca: 'HONDA', modelo: 'CB650RA', precio: 9100, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama alta'] },
  { id: 88, marca: 'YAMAHA', modelo: 'TRACER 700', precio: 9999, tags: ['Moto Touring', 'Trail', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Turismo', 'Gama alta', 'Trail Turismo'] },
  { id: 223, marca: 'BMW', modelo: 'F 800 GS', precio: 11180, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Gama alta', 'Trail Deportiva'] },
  { id: 74, marca: 'HONDA', modelo: 'CB750 Hornet', precio: 8350, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Carretera', 'Gama alta'] },
  { id: 101, marca: 'VOGE', modelo: 'SR1', precio: 2792, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Sport'] },
  { id: 304, marca: 'HONDA', modelo: 'CBR 650 R', precio: 11000, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama alta'] },
  { id: 206, marca: 'BMW', modelo: 'C 400 GT', precio: 10340, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Media (300-400cc)', 'Carné A2', 'Premium', 'Gama alta', 'Scooter Sport'] },
  { id: 103, marca: 'YAMAHA', modelo: 'Tracer 9 GT', precio: 16390, tags: ['Moto Touring', 'Grand Turismo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Turismo', 'Premium', 'Gama alta', 'Pantalla TFT', 'Conectividad'] },
  { id: 291, marca: 'ZONTES', modelo: 'ZT125-G1', precio: 3287, tags: ['Moto Naked', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Económica'] },
  { id: 214, marca: 'HONDA', modelo: 'CRF1100L Africa Twin', precio: 15975, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 342, marca: 'MACBOR', modelo: 'MONTANA XR1 125 EVO', precio: 3499, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Económica', 'Trail Deportiva'] },
  { id: 123, marca: 'RIEJU', modelo: 'NKD 125', precio: 3149, tags: ['Moto Naked', 'Deportivo', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Económica'] },
  { id: 210, marca: 'QJMOTOR', modelo: 'FORT 125 N E5+', precio: 3999, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Pantalla TFT', 'Scooter Sport'] },
  { id: 136, marca: 'VOGE', modelo: 'SR16', precio: 2688, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Con ABS', 'Entry-level', 'Scooter Urban'] },
  { id: 216, marca: 'YAMAHA', modelo: 'WR125', precio: 4699, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 150, marca: 'SYM', modelo: 'JET 14', precio: 2299, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 238, marca: 'BMW', modelo: 'R 1300 RT', precio: 25060, tags: ['Moto Touring', 'Grand Turismo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Turismo', 'Premium', 'Gama alta', 'Pantalla TFT', 'Conectividad'] },
  { id: 619, marca: 'SUZUKI', modelo: 'ADDRESS 125', precio: 2599, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Bajo consumo', 'Compacto', 'Scooter Urban'] },
  { id: 355, marca: 'ZONTES', modelo: '125D', precio: 3487, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Pantalla TFT', 'Scooter Urban'] },
  { id: 268, marca: 'ZONTES', modelo: 'ZT125-Z2', precio: 3287, tags: ['Moto Naked', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Económica'] },
  { id: 14, marca: 'ZONTES', modelo: '368K', precio: 4592, tags: ['Scooter', 'Crossover', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Mixta', 'Scooter Adventure'] },
  { id: 145, marca: 'KYMCO', modelo: 'SUPER DINK GT', precio: 4299, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Turismo', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Scooter Sport'] },
  { id: 285, marca: 'BMW', modelo: 'F 900 R', precio: 9960, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Carretera', 'Gama alta'] },
  { id: 269, marca: 'HONDA', modelo: 'GB350S', precio: 4590, tags: ['Moto Custom', 'Clásico', 'Media (300-400cc)', 'Carné A2', 'Urbana', 'Carretera', 'Gama media'] },
  { id: 48, marca: 'HONDA', modelo: 'Rebel 500', precio: 6450, tags: ['Moto Custom', 'Clásico', 'Carné A2', 'Urbana', 'Carretera', 'Gama media'] },
  { id: 75, marca: 'YAMAHA', modelo: 'R125', precio: 5799, tags: ['Moto Sport', 'Deportivo', '125cc', 'Carné A1', 'Carretera', 'Premium'] },
  { id: 42, marca: 'KYMCO', modelo: 'PEOPLE S 125 E5+', precio: 2950, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Con ABS', 'Gama media', 'Scooter Urban'] },
  { id: 153, marca: 'KAWASAKI', modelo: 'Z650', precio: 7750, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 102, marca: 'BMW', modelo: 'F 900 GS', precio: 14210, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Gama alta', 'Trail Deportiva'] },
  { id: 60, marca: 'SUZUKI', modelo: 'GSX-8S', precio: 6499, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 128, marca: 'VOGE', modelo: '300RALLY', precio: 3792, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Off-road/Aventura', 'Económica', 'Trail Deportiva'] },
  { id: 56, marca: 'HONDA', modelo: 'CBF 125', precio: 2999, tags: ['Moto Naked', 'Urbana', '125cc', 'Carné A1', 'Económica', 'Carretera'] },
  { id: 49, marca: 'SUZUKI', modelo: 'V-Strom 800', precio: 8999, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Turismo'] },
  { id: 126, marca: 'KTM', modelo: 'KTM 390 ADVENTURE R', precio: 7499, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 127, marca: 'KEEWAY', modelo: 'XDV 125 EVO PRO', precio: 3190, tags: ['Scooter', 'Crossover', 'Adventure', '125cc', 'Carné A1', 'Económica', 'Scooter Adventure'] },
  { id: 45, marca: 'PEUGEOT', modelo: 'KISBEE S', precio: 2099, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 279, marca: 'SYM', modelo: 'ADX 300 TCS', precio: 4599, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Media (300-400cc)', 'Carné A2', 'Control de tracción', 'Gama media', 'Scooter Sport'] },
  { id: 29, marca: 'MH MOTORCYCLES', modelo: 'TRAY', precio: 3495, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Económica', 'Trail Deportiva'] },
  { id: 292, marca: 'KAWASAKI', modelo: 'NINJA ZX-6R', precio: 13395, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', 'Carné A', 'Carretera', 'Gama alta', 'Premium'] },
  { id: 294, marca: 'KAWASAKI', modelo: 'KLE500', precio: 6500, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  // id 19 SHERCO "N.A" omitido: modelo no identificable de forma fiable.
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

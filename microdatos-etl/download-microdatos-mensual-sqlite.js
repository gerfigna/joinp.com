#!/usr/bin/env node
'use strict';

/**
 * Backfills the SQLite DB (matriculaciones_moto) from DGT monthly ZIPs for a
 * given year. Groups rows by day (from FEC_MATRICULA) and only inserts days
 * not already present in `dias_descargados` — existing records (e.g. from
 * the daily ETL) are left untouched.
 *
 * Usage: node download-microdatos-mensual-sqlite.js [year]
 * Defaults to the current year.
 */

const { httpGet } = require('./lib/http');
const { extractTxtFromZip } = require('./lib/zip');
const { isMotoOrCiclomotorRow, extractFullRowFields } = require('./lib/filter');
const { openDatabase, isDayDownloaded, insertDay } = require('./lib/sqlite-store');

function monthlyZipUrl(year, month) {
  const monthNum = parseInt(month, 10);
  return `https://www.dgt.es/microdatos/salida/${year}/${monthNum}/vehiculos/matriculaciones/export_mensual_mat_${year}${month}.zip`;
}

function diaFromFecMatricula(fec) {
  if (!fec || fec.length !== 8) return null;
  const dd = fec.slice(0, 2), mm = fec.slice(2, 4), yyyy = fec.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function groupRowsByDay(txt) {
  const byDay = new Map();
  for (const line of txt.split('\n')) {
    if (!isMotoOrCiclomotorRow(line)) continue;
    const row = extractFullRowFields(line);
    const dia = diaFromFecMatricula(row.FEC_MATRICULA);
    if (!dia) continue;
    if (!byDay.has(dia)) byDay.set(dia, []);
    byDay.get(dia).push(row);
  }
  return byDay;
}

async function processMonth(db, year, month) {
  const label = `${year}/${month}`;
  const url = monthlyZipUrl(year, month);
  console.log(`Procesando ${label}`);
  console.log(`  Descargando: ${url}`);

  let zipBuf;
  try {
    zipBuf = await httpGet(url);
  } catch (err) {
    console.log(`  No disponible (${err.message}) — omitiendo mes`);
    return;
  }
  console.log(`  Recibidos ${zipBuf.length} bytes`);

  const txt = extractTxtFromZip(zipBuf);
  const byDay = groupRowsByDay(txt);

  let insertedDays = 0, insertedRows = 0, skippedDays = 0;
  for (const [dia, rows] of [...byDay.entries()].sort()) {
    if (isDayDownloaded(db, dia)) { skippedDays++; continue; }
    insertDay(db, dia, rows, 'mensual');
    insertedDays++;
    insertedRows += rows.length;
  }

  console.log(`  ${insertedDays} día(s) nuevo(s) insertados (${insertedRows} filas), ${skippedDays} día(s) ya existentes omitidos`);
}

async function main() {
  const year = process.argv[2] || String(new Date().getFullYear());
  const db = openDatabase();

  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0');
    await processMonth(db, year, month);
  }

  db.close();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

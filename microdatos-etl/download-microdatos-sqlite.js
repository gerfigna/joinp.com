#!/usr/bin/env node
'use strict';

const LISTING_URL =
  `https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html?cachebust=${Date.now()}`;

const { SQLITE_DB_PATH } = require('./lib/constants');
const { httpGet } = require('./lib/http');
const { extractTxtFromZip } = require('./lib/zip');
const { isMotoOrCiclomotorRow, extractFullRowFields } = require('./lib/filter');
const { openDatabase, isDayDownloaded, insertDay } = require('./lib/sqlite-store');

async function fetchZipUrls() {
  console.log('Downloading listing HTML...');
  const buf = await httpGet(LISTING_URL);
  const html = buf.toString('utf8');

  const listMatch = html.match(/<ul[^>]+id=["']listado["'][^>]*>([\s\S]*?)<\/ul>/i);
  if (!listMatch) throw new Error('Could not find #listado in HTML');

  const seen = new Set();
  const urls = [];
  const re = /href=["']([^"']*export_mat_\d{8}\.zip[^"']*)["']/gi;
  let m;
  while ((m = re.exec(listMatch[1])) !== null) {
    const raw = m[1];
    const url = raw.startsWith('http') ? raw : `https://www.dgt.es${raw}`;
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

function dateFromUrl(url) {
  const m = url.match(/export_mat_(\d{4})(\d{2})(\d{2})\.zip/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function processTxt(txt) {
  const rows = [];
  for (const line of txt.split('\n')) {
    if (!isMotoOrCiclomotorRow(line)) continue;
    rows.push(extractFullRowFields(line));
  }
  return rows;
}

async function main() {
  const db = openDatabase();

  const urls = await fetchZipUrls();
  console.log(`Found ${urls.length} ZIP URL(s)`);

  for (const url of urls) {
    const dia = dateFromUrl(url);
    if (!dia) { console.log(`Skipping (no date in URL): ${url}`); continue; }

    if (isDayDownloaded(db, dia)) {
      console.log(`Already in DB: ${dia} — skipping`);
      continue;
    }

    console.log(`Downloading: ${url}`);
    const zipBuf = await httpGet(url);
    console.log(`  Received ${zipBuf.length} bytes`);

    const txt = extractTxtFromZip(zipBuf);
    const rows = processTxt(txt);
    console.log(`  ${rows.length} records after filtering`);

    insertDay(db, dia, rows, 'diario');
    console.log(`  Inserted into ${SQLITE_DB_PATH}`);
  }

  db.close();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

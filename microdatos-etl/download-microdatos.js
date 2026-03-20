#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const LISTING_URL =
  'https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html';

const { DATA_DIR } = require('./lib/constants');
const { normalizeProvince } = require('./lib/normalize');
const { writeAggregates, monthDir } = require('./lib/aggregate');
const { httpGet } = require('./lib/http');
const { extractTxtFromZip } = require('./lib/zip');
const { isMotorcycleRow, extractRowFields } = require('./lib/filter');

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
  return { year: m[1], month: m[2], day: m[3] };
}

function csvPath(year, month, day) {
  return path.join(DATA_DIR, year, month, `${day}.csv`);
}

function processTxt(txt) {
  const rows = [];
  for (const line of txt.split('\n')) {
    if (!isMotorcycleRow(line)) continue;
    const f = extractRowFields(line);
    rows.push([f.fecMatricula, f.codClaseMat, f.fecTramitacion, f.marca, f.modelo, f.provincia, f.comunidad, f.cilindrada]);
  }
  return rows;
}

function writeDailyCsv(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = ['FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV'];
  for (const r of rows) lines.push(r.map((v) => `"${v}"`).join(','));
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function recalculateMonthly(year, month) {
  const dir = monthDir(year, month);
  if (!fs.existsSync(dir)) return;

  // key: MARCA\tMODELO → { count, cilindradaCounts: Map, provinciaCounts: Map }
  const data = new Map();
  const dayFiles = fs.readdirSync(dir).filter((f) => /^\d{2}\.csv$/.test(f)).sort();

  for (const f of dayFiles) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const lines = content.split('\n').slice(1); // skip header
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',').map((v) => v.replace(/^"|"$/g, ''));
      if (parts.length < 5) continue;
      const marca = parts[3];
      const modelo = parts[4];
      const provincia = normalizeProvince(parts[5] || '');
      const comunidad = parts[6] || '';
      const cilindrada = parts[7] || '';
      const key = `${marca}\t${modelo}`;
      if (!data.has(key)) data.set(key, { count: 0, cilindradaCounts: new Map(), provinciaCounts: new Map() });
      const entry = data.get(key);
      entry.count++;
      if (cilindrada) entry.cilindradaCounts.set(cilindrada, (entry.cilindradaCounts.get(cilindrada) || 0) + 1);
      const provEntry = entry.provinciaCounts.get(provincia);
      if (provEntry) {
        provEntry.count++;
      } else {
        entry.provinciaCounts.set(provincia, { count: 1, comunidad });
      }
    }
  }

  writeAggregates(year, month, data);
  console.log(`  Recalculated monthly: ${year}/${month}`);
}

function findLastDataDate() {
  if (!fs.existsSync(DATA_DIR)) return null;
  let lastDate = null;
  const years = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}$/.test(f)).sort();
  for (const year of years) {
    const yearDir = path.join(DATA_DIR, year);
    const months = fs.readdirSync(yearDir).filter(f => /^\d{2}$/.test(f)).sort();
    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const days = fs.readdirSync(monthDir).filter(f => /^\d{2}\.csv$/.test(f)).sort();
      if (days.length > 0) {
        const day = days[days.length - 1].replace('.csv', '');
        lastDate = `${year}-${month}-${day}`;
      }
    }
  }
  return lastDate;
}

function writeMetadata() {
  const metadata = {
    lastRun: new Date().toISOString(),
    lastDataDate: findLastDataDate(),
  };
  const metaPath = path.join(DATA_DIR, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + '\n');
  console.log(`  Metadata written: ${metaPath}`);
}

async function main() {
  const urls = await fetchZipUrls();
  console.log(`Found ${urls.length} ZIP URL(s)`);

  const processedMonths = new Set();

  for (const url of urls) {
    const d = dateFromUrl(url);
    if (!d) { console.log(`Skipping (no date in URL): ${url}`); continue; }

    const outPath = csvPath(d.year, d.month, d.day);
    if (fs.existsSync(outPath)) {
      console.log(`Already exists: ${d.year}/${d.month}/${d.day} — skipping`);
      continue;
    }

    console.log(`Downloading: ${url}`);
    const zipBuf = await httpGet(url);
    console.log(`  Received ${zipBuf.length} bytes`);

    const txt = extractTxtFromZip(zipBuf);
    const rows = processTxt(txt);
    console.log(`  ${rows.length} records after filtering`);

    writeDailyCsv(outPath, rows);
    console.log(`  Written: ${outPath}`);

    processedMonths.add(`${d.year}/${d.month}`);
  }

  for (const ym of processedMonths) {
    const [year, month] = ym.split('/');
    recalculateMonthly(year, month);
  }

  writeMetadata();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
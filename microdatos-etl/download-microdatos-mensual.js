#!/usr/bin/env node
'use strict';

/**
 * download-microdatos-mensual.js
 *
 * Downloads and processes DGT monthly motorcycle registration exports.
 * Targets: all 12 months of 2025 + January and February 2026.
 *
 * Skip rule: if the month directory already contains daily CSV files
 * (e.g. 01.csv, 02.csv ...) written by the daily ETL, skip entirely
 * to avoid collision between daily granular data and monthly aggregated data.
 *
 * Output: writes directly to the same aggregated files that the daily ETL
 * produces after accumulation:
 *   data/YYYY/MM/acumulado-marca-modelo.csv
 *   data/YYYY/MM/acumulado-marca.csv
 *   data/YYYY/MM/acumulado-marca-modelo-provincia.csv
 *
 * Idempotent: safe to run multiple times.
 */

const fs = require('fs');

// Months to process: all of 2025 + January and February 2026
const TARGET_MONTHS = [
  { year: '2025', month: '01' },
  { year: '2025', month: '02' },
  { year: '2025', month: '03' },
  { year: '2025', month: '04' },
  { year: '2025', month: '05' },
  { year: '2025', month: '06' },
  { year: '2025', month: '07' },
  { year: '2025', month: '08' },
  { year: '2025', month: '09' },
  { year: '2025', month: '10' },
  { year: '2025', month: '11' },
  { year: '2025', month: '12' },
  { year: '2026', month: '01' },
  { year: '2026', month: '02' },
];

const { writeAggregates, monthDir, monthlyPath } = require('./lib/aggregate');
const { httpGet } = require('./lib/http');
const { extractTxtFromZip } = require('./lib/zip');
const { isMotorcycleRow, extractRowFields } = require('./lib/filter');

function monthlyZipUrl(year, month) {
  // The DGT path uses a non-zero-padded month (e.g. /2025/1/) but the filename is zero-padded.
  const monthNum = parseInt(month, 10);
  return `https://www.dgt.es/microdatos/salida/${year}/${monthNum}/vehiculos/matriculaciones/export_mensual_mat_${year}${month}.zip`;
}

function hasDailyData(year, month) {
  const dir = monthDir(year, month);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => /^\d{2}\.csv$/.test(f));
}

function hasMonthlyData(year, month) {
  return fs.existsSync(monthlyPath(year, month));
}

function processTxt(txt) {
  // key: MARCA\tMODELO → { count, cilindradaCounts: Map, provinciaCounts: Map }
  const data = new Map();

  for (const line of txt.split('\n')) {
    if (!isMotorcycleRow(line)) continue;
    const { marca, modelo, provincia, cilindrada } = extractRowFields(line);

    const key = `${marca}\t${modelo}`;
    if (!data.has(key)) data.set(key, { count: 0, cilindradaCounts: new Map(), provinciaCounts: new Map() });
    const entry = data.get(key);
    entry.count++;
    if (cilindrada) entry.cilindradaCounts.set(cilindrada, (entry.cilindradaCounts.get(cilindrada) || 0) + 1);
    entry.provinciaCounts.set(provincia, (entry.provinciaCounts.get(provincia) || 0) + 1);
  }

  return data;
}

async function main() {
  for (const { year, month } of TARGET_MONTHS) {
    const label = `${year}/${month}`;

    // Skip if daily ETL data already exists for this month
    if (hasDailyData(year, month)) {
      console.log(`Skipping ${label} — daily data already exists (collision prevention)`);
      continue;
    }

    // Skip if monthly aggregates already exist (idempotency)
    if (hasMonthlyData(year, month)) {
      console.log(`Skipping ${label} — monthly aggregates already exist`);
      continue;
    }

    const url = monthlyZipUrl(year, month);
    console.log(`Downloading: ${url}`);

    let zipBuf;
    try {
      zipBuf = await httpGet(url);
    } catch (err) {
      console.error(`  ERROR downloading ${label}: ${err.message}`);
      continue;
    }
    console.log(`  Received ${zipBuf.length} bytes`);

    let txt;
    try {
      txt = extractTxtFromZip(zipBuf);
    } catch (err) {
      console.error(`  ERROR extracting ZIP for ${label}: ${err.message}`);
      continue;
    }

    const data = processTxt(txt);
    console.log(`  ${[...data.values()].reduce((s, e) => s + e.count, 0)} records after filtering`);

    writeAggregates(year, month, data);
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
'use strict';

/**
 * download-microdatos-potencia.js
 *
 * Downloads DGT monthly ZIPs, filters motorcycle rows (via isMotorcycleRow),
 * extracts MARCA_ITV + KW_ITV (via extractPowerFields), and aggregates
 * registrations by brand and power range into monthly and annual CSV files.
 *
 * Month range: 2015/01 — previous month of current date.
 * Skips months where the monthly potencia CSV already exists
 * (independent per output file).
 *
 * Outputs:
 *   data/YYYY/MM/acumulado-marca-mensual.csv     (MARCA_ITV, COUNT)
 *   data/YYYY/MM/acumulado-potencia-mensual.csv  (RANGO_POTENCIA, COUNT)
 *   data/YYYY/acumulado-marca-anual.csv          (MARCA_ITV, COUNT)
 *   data/YYYY/acumulado-potencia-anual.csv       (RANGO_POTENCIA, COUNT)
 *
 * Idempotent: safe to run multiple times.
 */

const fs = require('fs');

const { extractTxtFromZip } = require('./lib/zip');
const { isMotorcycleRow, extractPowerFields } = require('./lib/filter');
const { PowerAggregator, potenciaMonthlyPath } = require('./lib/power-aggregate');

function httpGetSync(url) {
  return new Promise((resolve, reject) => {
    function get(u) {
      const mod = u.startsWith('https') ? require('https') : require('http');
      mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

function monthlyZipUrl(year, month) {
  const monthNum = parseInt(month, 10);
  return `https://www.dgt.es/microdatos/salida/${year}/${monthNum}/vehiculos/matriculaciones/export_mensual_mat_${year}${month}.zip`;
}

function allMonths() {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth(); // month before current
  const result = [];
  let year = 2015, month = 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push({
      year: String(year),
      month: String(month).padStart(2, '0'),
    });
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return result;
}

/**
 * Process one month: download ZIP, filter, aggregate, write monthly CSVs.
 * @param {string} year
 * @param {string} month
 * @returns {Promise<{ validRows: number, skippedRows: number }>}
 */
async function processMonth(year, month) {
  const label = `${year}/${month}`;

  // Independent skip check for each output
  if (fs.existsSync(potenciaMonthlyPath(year, month))) {
    console.log(`Skipping ${label} — monthly potencia CSV already exists`);
    return { validRows: 0, skippedRows: 0 };
  }

  const url = monthlyZipUrl(year, month);
  console.log(`Procesando ${label}`);
  console.log(`  Descargando: ${url}`);

  let zipBuf;
  try {
    zipBuf = await httpGetSync(url);
  } catch (err) {
    console.error(`  ERROR downloading ${label}: ${err.message}`);
    return { validRows: 0, skippedRows: 0 };
  }
  console.log(`  Received ${zipBuf.length} bytes`);

  let txt;
  try {
    txt = extractTxtFromZip(zipBuf);
  } catch (err) {
    console.error(`  ERROR extracting ZIP for ${label}: ${err.message}`);
    return { validRows: 0, skippedRows: 0 };
  }

  const aggregator = new PowerAggregator();
  let validRows = 0;
  let skippedRows = 0;

  for (const line of txt.split('\n')) {
    if (!isMotorcycleRow(line)) continue;
    const fields = extractPowerFields(line);
    if (!fields) {
      skippedRows++;
      continue;
    }
    aggregator.add(fields.marca, fields.kw);
    validRows++;
  }

  console.log(`  ${validRows} filas válidas extraídas`);
  if (skippedRows > 0) console.log(`  ${skippedRows} filas omitidas (KW_ITV inválido)`);

  aggregator.writeMonthly(year, month);
  return { validRows, skippedRows };
}

async function main() {
  const months = allMonths();
  console.log(`${months.length} meses a procesar: ${months[0].year}/${months[0].month} — ${months[months.length - 1].year}/${months[months.length - 1].month}`);

  // Collect years that have at least one new month to process (before modifying filesystem)
  const processedYears = new Set();
  for (const { year, month } of months) {
    if (!fs.existsSync(potenciaMonthlyPath(year, month))) {
      processedYears.add(year);
    }
  }

  // Process each month (new PowerAggregator per month)
  for (const { year, month } of months) {
    await processMonth(year, month);
  }

  // Regenerate annual files for each year that had new data
  for (const year of [...processedYears].sort()) {
    console.log(`Reescribiendo acumulados anuales para ${year}…`);
    const agg = new PowerAggregator();
    agg.writeAnnual(year);
    console.log(`  Done: acumulado-marca-anual.csv, acumulado-potencia-anual.csv`);
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

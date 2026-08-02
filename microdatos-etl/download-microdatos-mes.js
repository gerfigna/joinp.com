#!/usr/bin/env node
'use strict';

/**
 * download-microdatos-mes.js
 *
 * Downloads DGT monthly ZIPs, filters motorcycle rows (via isMotorcycleRow),
 * extracts MARCA_ITV + KW_ITV (via extractPowerFields), and aggregates
 * registrations by brand and power range into monthly and annual CSV files.
 *
 * Month range: 2015/01 — previous month of current date.
 * Skips months where the monthly potencia CSV already exists
 * (independent per output file).
 *
 * Fallback: if the monthly ZIP is unavailable and the month is within the last
 * 2 months, downloads each available daily ZIP for that month from the DGT
 * daily listing and reconstructs both marca and potencia aggregates.
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

const { httpGet } = require('./lib/http');
const { extractTxtFromZip } = require('./lib/zip');
const { isMotorcycleRow, extractPowerFields, extractRowFields } = require('./lib/filter');
const { PowerAggregator, potenciaMonthlyPath } = require('./lib/power-aggregate');
const { writeAggregates } = require('./lib/aggregate');

const DAILY_LISTING_URL =
  `https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html`;

function monthlyZipUrl(year, month) {
  const monthNum = parseInt(month, 10);
  return `https://www.dgt.es/microdatos/salida/${year}/${monthNum}/vehiculos/matriculaciones/export_mensual_mat_${year}${month}.zip`;
}

/**
 * Returns true if year/month is within the last 2 months from today.
 * @param {string} year
 * @param {string} month
 * @returns {boolean}
 */
function isRecentMonth(year, month) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const target = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return target >= cutoff;
}

/**
 * Fetches the DGT daily listing and returns ZIP URLs for the given year/month.
 * @param {string} year
 * @param {string} month
 * @returns {Promise<string[]>}
 */
async function fetchDailyZipUrls(year, month) {
  const url = `${DAILY_LISTING_URL}?cachebust=${Date.now()}`;
  const html = (await httpGet(url)).toString('utf8');
  const listMatch = html.match(/<ul[^>]+id=["']listado["'][^>]*>([\s\S]*?)<\/ul>/i);
  if (!listMatch) return [];

  const prefix = `export_mat_${year}${month}`;
  const re = /href=["']([^"']*export_mat_\d{8}\.zip[^"']*)["']/gi;
  const seen = new Set();
  const urls = [];
  let m;
  while ((m = re.exec(listMatch[1])) !== null) {
    const raw = m[1];
    const resolved = raw.startsWith('http') ? raw : `https://www.dgt.es${raw}`;
    if (resolved.includes(prefix) && !seen.has(resolved)) {
      seen.add(resolved);
      urls.push(resolved);
    }
  }
  return urls.sort();
}

/**
 * Reconstruct monthly aggregates from daily ZIPs when the monthly ZIP is unavailable.
 * Only attempted for recent months (within 2 months of today).
 * @param {string} year
 * @param {string} month
 * @returns {Promise<boolean>} true if reconstruction succeeded
 */
async function processMonthFromDailyZips(year, month) {
  const label = `${year}/${month}`;
  console.log(`  Fetching daily ZIP URLs for ${label}…`);
  let dailyUrls;
  try {
    dailyUrls = await fetchDailyZipUrls(year, month);
  } catch (err) {
    console.error(`  ERROR fetching daily listing: ${err.message}`);
    return false;
  }

  if (dailyUrls.length === 0) {
    console.log(`  No daily ZIPs found for ${label} in listing`);
    return false;
  }

  console.log(`  Found ${dailyUrls.length} daily ZIP(s) for ${label}`);
  const aggregator = new PowerAggregator();
  // key: "MARCA\tMODELO" → { count, cilindradaCounts: Map, provinciaCounts: Map }
  const provinciaData = new Map();
  let totalValid = 0;

  for (const url of dailyUrls) {
    const day = (url.match(/export_mat_\d{6}(\d{2})\.zip/) || [])[1] || '??';
    process.stdout.write(`  Day ${day}: `);
    let zipBuf;
    try {
      zipBuf = await httpGet(url);
    } catch (err) {
      console.log(`ERROR (${err.message}) — skipping`);
      continue;
    }
    let txt;
    try {
      txt = extractTxtFromZip(zipBuf);
    } catch (err) {
      console.log(`ERROR extracting ZIP (${err.message}) — skipping`);
      continue;
    }
    let count = 0;
    for (const line of txt.split('\n')) {
      if (!isMotorcycleRow(line)) continue;
      const power = extractPowerFields(line);
      if (power) aggregator.add(power.marca, power.kw);
      const f = extractRowFields(line);
      const key = `${f.marca}\t${f.modelo}`;
      if (!provinciaData.has(key)) provinciaData.set(key, { count: 0, cilindradaCounts: new Map(), provinciaCounts: new Map() });
      const entry = provinciaData.get(key);
      entry.count++;
      if (f.cilindrada) entry.cilindradaCounts.set(f.cilindrada, (entry.cilindradaCounts.get(f.cilindrada) || 0) + 1);
      const prov = entry.provinciaCounts.get(f.provincia);
      if (prov) { prov.count++; } else { entry.provinciaCounts.set(f.provincia, { count: 1, comunidad: f.comunidad }); }
      count++;
    }
    console.log(`${count} rows`);
    totalValid += count;
  }

  if (totalValid === 0) {
    console.log(`  No valid rows found from daily ZIPs for ${label}`);
    return false;
  }

  aggregator.writeMonthly(year, month);
  writeAggregates(year, month, provinciaData);
  console.log(`  Reconstructed ${label} from ${dailyUrls.length} daily ZIPs (${totalValid} rows)`);
  return true;
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
    zipBuf = await httpGet(url);
  } catch (err) {
    console.error(`  ERROR downloading monthly ZIP for ${label}: ${err.message}`);
    if (isRecentMonth(year, month)) {
      console.log(`  Attempting fallback: reconstruct from daily ZIPs…`);
      await processMonthFromDailyZips(year, month);
    }
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

  // Collect years that have at least one new month to process (before modifying filesystem).
  // Always include the current year so the annual provincia file stays in sync with
  // whatever the daily ETL may have written to monthly CSVs since the last run.
  const currentYear = String(new Date().getFullYear());
  const processedYears = new Set([currentYear]);
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

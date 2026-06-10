#!/usr/bin/env node
'use strict';

/**
 * download-microdatos-electrica.js
 *
 * Downloads DGT daily ZIPs (with fallback to monthly ZIPs), filters electric
 * motorcycle rows (COD_PROPULSION_ITV='2', COD_CLASE_MAT='0'), and writes
 * rich 36-field CSVs (35 source fields + TIPO_CARNET) to e-data/.
 *
 * Also generates monthly and annual aggregates by brand and power band.
 *
 * Date range: 2025-01-01 — yesterday.
 * Idempotent: skips dates whose DD.csv already exists.
 * Single script for both initial backfill and daily incremental updates.
 */

const fs   = require('fs');
const path = require('path');

const { E_DATA_DIR }                                    = require('./lib/constants');
const { httpGet }                                       = require('./lib/http');
const { extractTxtFromZip }                             = require('./lib/zip');
const { isElectricMotorcycleRow, extractElectricFields } = require('./lib/filter');

// ─── Field order for CSV header ──────────────────────────────────────────────

const FIELDS = [
  'FEC_MATRICULA', 'COD_CLASE_MAT', 'FEC_TRAMITACION', 'MARCA_ITV', 'MODELO_ITV',
  'CILINDRADA_ITV', 'POTENCIA_ITV', 'NUM_PLAZAS', 'LOCALIDAD_VEHICULO',
  'COD_PROVINCIA_VEH', 'COD_PROVINCIA_MAT', 'FEC_TRAMITE', 'CODIGO_POSTAL',
  'PERSONA_FISICA_JURIDICA', 'CODIGO_ITV', 'SERVICIO', 'COD_MUNICIPIO_INE_VEH',
  'MUNICIPIO', 'KW_ITV', 'TIPO_CARNET', 'TIPO_ITV', 'VARIANTE_ITV', 'VERSION_ITV',
  'MASA_ORDEN_MARCHA_ITV', 'MASA_MAXIMA_TECNICA_ITV', 'CATEGORIA_HOMOLOGACION_EUROPEA_ITV',
  'CARROCERIA', 'CONSUMO_WH_KM_ITV', 'CLASIFICACION_REGLAMENTO_VEHICULOS_ITV',
  'CATEGORIA_VEHICULO_ELECTRICO', 'AUTONOMIA_VEHICULO_ELECTRICO', 'MARCA_VEHICULO_BASE',
  'FABRICANTE_VEHICULO_BASE', 'TIPO_VEHICULO_BASE', 'VARIANTE_VEHICULO_BASE',
  'VERSION_VEHICULO_BASE',
];

// ─── URL builders ─────────────────────────────────────────────────────────────

function dailyZipUrl(year, month, day) {
  return `https://www.dgt.es/microdatos/salida/${year}/${parseInt(month, 10)}/vehiculos/matriculaciones/export_mat_${year}${month}${day}.zip`;
}

function monthlyZipUrl(year, month) {
  return `https://www.dgt.es/microdatos/salida/${year}/${parseInt(month, 10)}/vehiculos/matriculaciones/export_mensual_mat_${year}${month}.zip`;
}

// ─── Date generation ──────────────────────────────────────────────────────────

function allDates() {
  const start = new Date('2025-01-01');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const dates = [];
  const cur = new Date(start);
  while (cur <= yesterday) {
    const year  = String(cur.getFullYear());
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day   = String(cur.getDate()).padStart(2, '0');
    dates.push({ year, month, day });
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ─── CSV path helpers ─────────────────────────────────────────────────────────

function dailyCsvPath(year, month, day) {
  return path.join(E_DATA_DIR, year, month, `${day}.csv`);
}

function marcaMensualPath(year, month) {
  return path.join(E_DATA_DIR, year, month, 'acumulado-marca-mensual.csv');
}

function potenciaMensualPath(year, month) {
  return path.join(E_DATA_DIR, year, month, 'acumulado-potencia-mensual.csv');
}

function marcaAnualPath(year) {
  return path.join(E_DATA_DIR, year, 'acumulado-marca-anual.csv');
}

function potenciaAnualPath(year) {
  return path.join(E_DATA_DIR, year, 'acumulado-potencia-anual.csv');
}

function modeloMensualPath(year, month) {
  return path.join(E_DATA_DIR, year, month, 'acumulado-modelo-mensual.csv');
}

function modeloAnualPath(year) {
  return path.join(E_DATA_DIR, year, 'acumulado-modelo-anual.csv');
}

// ─── Power band ───────────────────────────────────────────────────────────────

function powerBand(kw) {
  const n = parseFloat(kw);
  if (!kw || kw.trim() === '*******' || isNaN(n) || n <= 0) return null;
  if (n <= 11) return 'Hasta 11 kW';
  if (n <= 35) return '11-35 kW';
  return 'Más de 35 kW';
}

// ─── Text processing ──────────────────────────────────────────────────────────

/**
 * Processes fixed-width txt content.
 * - targetDate 'DDMMYYYY': returns rows[] for that date only.
 * - targetDate null: returns Map<'DDMMYYYY', rows[]> grouped by FEC_MATRICULA.
 */
function processTxt(txt, targetDate) {
  if (targetDate !== null) {
    const rows = [];
    for (const line of txt.split('\n')) {
      if (!isElectricMotorcycleRow(line)) continue;
      const f = extractElectricFields(line);
      if (f.FEC_MATRICULA !== targetDate) continue;
      rows.push(f);
    }
    return rows;
  }

  const byDate = new Map();
  for (const line of txt.split('\n')) {
    if (!isElectricMotorcycleRow(line)) continue;
    const f = extractElectricFields(line);
    const d = f.FEC_MATRICULA;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(f);
  }
  return byDate;
}

// ─── CSV I/O ──────────────────────────────────────────────────────────────────

function writeDailyCsv(filePath, rows) {
  if (fs.existsSync(filePath)) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [FIELDS.join(',')];
  for (const r of rows) {
    lines.push(FIELDS.map((f) => `"${(r[f] || '').replace(/"/g, '""')}"`).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function writeCsv(filePath, header, counts) {
  const lines = [header];
  for (const [key, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`"${key}",${count}`);
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function readCsvCounts(filePath) {
  const acc = new Map();
  if (!fs.existsSync(filePath)) return acc;
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const commaIdx = lines[i].indexOf(',');
    if (commaIdx === -1) continue;
    const key   = lines[i].slice(1, commaIdx - 1);
    const count = parseInt(lines[i].slice(commaIdx + 1), 10);
    acc.set(key, (acc.get(key) || 0) + count);
  }
  return acc;
}

function parseQuotedLine(line) {
  const parts = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

// modeloMap: Map<'MARCA\x00MODELO\x00KW\x00CATEGORIA', count>
function writeModeloCsv(filePath, modeloMap) {
  const lines = ['MARCA_ITV,MODELO_ITV,KW_ITV,CATEGORIA_HOMOLOGACION_EUROPEA_ITV,COUNT'];
  for (const [key, count] of [...modeloMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [marca, modelo, kw, cat] = key.split('\x00');
    lines.push(`"${marca}","${modelo}","${kw}","${cat}",${count}`);
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function readModeloCsv(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const parts = parseQuotedLine(lines[i]);
    if (parts.length < 5) continue;
    const [marca, modelo, kw, cat, countStr] = parts;
    const key = marca + '\x00' + modelo + '\x00' + kw + '\x00' + cat;
    map.set(key, (map.get(key) || 0) + parseInt(countStr, 10));
  }
  return map;
}

// ─── Monthly aggregates ───────────────────────────────────────────────────────

function recalculateMonthly(year, month) {
  const dir = path.join(E_DATA_DIR, year, month);
  if (!fs.existsSync(dir)) return;

  const marcaCounts    = new Map();
  const potenciaCounts = new Map();
  const modeloMap      = new Map();

  const dayFiles = fs.readdirSync(dir).filter((f) => /^\d{2}\.csv$/.test(f)).sort();
  for (const f of dayFiles) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const lines   = content.split('\n').slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = parseQuotedLine(line);
      if (parts.length < FIELDS.length) continue;

      const marca  = parts[FIELDS.indexOf('MARCA_ITV')];
      const modelo = parts[FIELDS.indexOf('MODELO_ITV')] || '';
      const kw     = parts[FIELDS.indexOf('KW_ITV')];

      if (marca) marcaCounts.set(marca, (marcaCounts.get(marca) || 0) + 1);

      const band = powerBand(kw);
      if (band) potenciaCounts.set(band, (potenciaCounts.get(band) || 0) + 1);

      if (marca) {
        const cat  = parts[FIELDS.indexOf('CATEGORIA_HOMOLOGACION_EUROPEA_ITV')] || '';
        const mKey = marca + '\x00' + modelo + '\x00' + (kw || '') + '\x00' + cat;
        modeloMap.set(mKey, (modeloMap.get(mKey) || 0) + 1);
      }
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  writeCsv(marcaMensualPath(year, month),      'MARCA_ITV,COUNT',      marcaCounts);
  writeCsv(potenciaMensualPath(year, month),   'RANGO_POTENCIA,COUNT', potenciaCounts);
  writeModeloCsv(modeloMensualPath(year, month), modeloMap);
}

// ─── Annual aggregates ────────────────────────────────────────────────────────

function writeAnnual(year) {
  const yearDir = path.join(E_DATA_DIR, year);
  if (!fs.existsSync(yearDir)) return;

  const marcaAcc    = new Map();
  const potenciaAcc = new Map();
  const modeloAcc   = new Map();

  const months = fs.readdirSync(yearDir).filter((e) => /^\d{2}$/.test(e)).sort();
  for (const month of months) {
    for (const [k, v] of readCsvCounts(marcaMensualPath(year, month)))    marcaAcc.set(k, (marcaAcc.get(k) || 0) + v);
    for (const [k, v] of readCsvCounts(potenciaMensualPath(year, month))) potenciaAcc.set(k, (potenciaAcc.get(k) || 0) + v);
    for (const [key, count] of readModeloCsv(modeloMensualPath(year, month))) {
      modeloAcc.set(key, (modeloAcc.get(key) || 0) + count);
    }
  }

  fs.mkdirSync(yearDir, { recursive: true });
  writeCsv(marcaAnualPath(year),       'MARCA_ITV,COUNT',      marcaAcc);
  writeCsv(potenciaAnualPath(year),    'RANGO_POTENCIA,COUNT', potenciaAcc);
  writeModeloCsv(modeloAnualPath(year), modeloAcc);
}

// ─── Per-date processing ──────────────────────────────────────────────────────

async function processDate(year, month, day, monthlyCache) {
  const csvPath = dailyCsvPath(year, month, day);
  if (fs.existsSync(csvPath)) return false; // already done

  const ddmmyyyy = `${day}${month}${year}`;
  const label    = `${year}/${month}/${day}`;

  // Try daily ZIP first
  try {
    const zipBuf = await httpGet(dailyZipUrl(year, month, day));
    const txt    = extractTxtFromZip(zipBuf);
    const rows   = processTxt(txt, ddmmyyyy);
    writeDailyCsv(csvPath, rows);
    console.log(`  [daily]   ${label} — ${rows.length} rows`);
    return true;
  } catch {
    // fall through to monthly
  }

  // Fallback: monthly ZIP (cached per month)
  const monthKey = `${year}${month}`;
  if (!monthlyCache.has(monthKey)) {
    try {
      const zipBuf = await httpGet(monthlyZipUrl(year, month));
      const txt    = extractTxtFromZip(zipBuf);
      monthlyCache.set(monthKey, processTxt(txt, null)); // Map<ddmmyyyy, rows[]>
      console.log(`  [monthly] ${year}/${month} — ZIP loaded`);
    } catch (err) {
      console.error(`  [monthly] ${year}/${month} — failed: ${err.message}`);
      monthlyCache.set(monthKey, new Map()); // mark as attempted, no data
    }
  }

  const monthData = monthlyCache.get(monthKey);
  const rows = monthData.get(ddmmyyyy) || [];
  writeDailyCsv(csvPath, rows);
  console.log(`  [monthly] ${label} — ${rows.length} rows`);
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dates = allDates();
  console.log(`Processing ${dates.length} dates from 2025-01-01 to yesterday`);

  const monthlyCache    = new Map();
  const affectedMonths  = new Set();
  const affectedYears   = new Set();

  for (const { year, month, day } of dates) {
    const processed = await processDate(year, month, day, monthlyCache);
    if (processed) {
      affectedMonths.add(`${year}/${month}`);
      affectedYears.add(year);
    }
  }

  // Also write daily CSVs extracted from monthly fallback for other days in same month
  // (already handled inside processDate via monthlyCache — each missing day writes its own CSV)

  console.log('\nRegenerating monthly aggregates…');
  for (const ym of [...affectedMonths].sort()) {
    const [year, month] = ym.split('/');
    recalculateMonthly(year, month);
    console.log(`  ${ym}`);
  }

  console.log('\nRegenerating annual aggregates…');
  for (const year of [...affectedYears].sort()) {
    writeAnnual(year);
    console.log(`  ${year}`);
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });

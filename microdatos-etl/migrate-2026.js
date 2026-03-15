#!/usr/bin/env node
'use strict';

/**
 * migrate-2026.js
 *
 * Option A migration for model-normalization-v2:
 * Patches existing daily CSV files in data/2026/02/ and data/2026/03/ to apply
 * the new normalization rules added in model-normalization-v2, then regenerates
 * all aggregated files (acumulado-marca-modelo.csv, acumulado-marca.csv,
 * acumulado-marca-modelo-provincia.csv) for both months.
 *
 * Idempotent: safe to run multiple times.
 * Kept as a permanent migration record.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// ---------------------------------------------------------------------------
// Normalization rules (same as download-microdatos.js — keep in sync)
// ---------------------------------------------------------------------------

const BRAND_EXACT = {
  YAMAHA:  { 'GPD125D-A': 'NMAX125', 'GPD125-A': 'NMAX125', 'YP125R-DA': 'XMAX125', 'YP125RA': 'XMAX125', 'WR125-A': 'WR125', 'LCG125' : 'RayZR 125', 'MTN320-A': 'MT-03' },
  HONDA:   { 'WW125A': 'PCX125', 'WW125S': 'PCX125', 'FSH125': 'SH Mode 125', 'SH125AD': 'SH125i', 'NSS125AD': 'FORZA125', 'NSC110': 'VISION 110', 'XL750' : 'XL750 Transalp', 'ADV350A': 'ADV 350', 'ADV750': 'ADV 750', 'NSS350A': 'FORZA 350', 'NSS750': 'FORZA 750', 'SH350A': 'SH350i', 'CB750A': 'CB750 Hornet', 'CB500XA': 'CB 500 X', 'CB500FA': 'CB 500 F', 'CBR650RAC': 'CBR 650 R', 'GB350S': 'GB350S', 'CBF125NA': 'CBF 125', 'CB125F': 'CB 125 F', 'CL500A': 'CL500', 'CRF300LA': 'CRF 300 L', 'CMX500A': 'Rebel 500', 'CMX500A2': 'Rebel 500' },
  APRILIA: { 'RS 660 FACTORY': 'RS 660', 'RSV4 FACTORY': 'RSV4', 'TUONO V4 FACTORY': 'TUONO V4', 'TUAREG 660 RALLY': 'TUAREG 660' },
  BENELLI: { 'BKX 125 S': 'BN125', 'TRK 702 35KW': 'TRK 702', 'TRK 702X': 'TRK 702', 'TRK 702X 35KW': 'TRK 702' },
  SUZUKI:  { 'UB125L': 'ADDRESS 125', 'UZ125': 'AVENIS 125', 'DL800': 'V-Strom 800', 'DL800U': 'V-Strom 800', 'GSX800': 'GSX-8S', 'DL1050': 'V-Strom 1050', 'AN400': 'BURGMAN 400' },
};

const BRAND_PREFIX = {
  SYM:     [['SYMPHONY 125', 'SYMPHONY 125'], ['JET 14', 'JET 14'], ['JET X', 'JET X']],
  YAMAHA:  [['MTN690', 'MT-07'], ['MTT890', 'MT-09'], ['MWS125', 'TRICITY 125'], ['XTZ690', 'XTZ 700 Tenere'], ['MTN125', 'MT-125'], ['MTM125', 'MT-125'], ['XP560', 'TMAX 560'], ['CZD300', 'XMAX 300'], ['YZF125', 'YZF-R125'], ['MTN890', 'MT-09'], ['MTT690', 'MT-07'], ['MTM690', 'MT-07'], ['YZF890', 'YZF-R9'], ['MTN1000', 'MT-10'], ['MTM890', 'MT-09']],
  BRIXTON: [['CROSSFIRE 500 ', 'CROSSFIRE 500']],
  DUCATI:  [['MULTISTRADA V2 ', 'MULTISTRADA V2'], ['MULTISTRADA V4 ', 'MULTISTRADA V4'], ['PANIGALE V2 ', 'PANIGALE V2'], ['PANIGALE V4 ', 'PANIGALE V4'], ['STREETFIGHTER ', 'STREETFIGHTER']],
  HONDA:   [['CB650RA', 'CB650RA'], ['CBR1000', 'CBR1000'], ['CBR500', 'CBR500'], ['CMX1100', 'CMX1100'], ['CRF1100', 'CRF1100'], ['NT1100', 'NT1100'], ['NC750X', 'NC 750 X']],
  KTM:     [['KTM 250 EXC', 'KTM 250 EXC'], ['KTM 300 EXC', 'KTM 300 EXC']],
  KYMCO:   [['AGILITY S ', 'AGILITY S']],
  ZONTES:  [['125C', '125C']],
  SUZUKI:  [['GSX-S1000', 'GSX-S 1000']],
};

// Brands that have new rules in model-normalization-v2
const MIGRATED_BRANDS = new Set(['HONDA', 'YAMAHA', 'SUZUKI']);

function normalizeModel(marca, modelo) {
  const exact = BRAND_EXACT[marca]?.[modelo];
  if (exact) return exact;
  for (const [prefix, canonical] of (BRAND_PREFIX[marca] || [])) {
    if (modelo.startsWith(prefix)) return canonical;
  }
  return modelo;
}

function normalizeProvince(code) {
  // Province values in the CSV are already normalized text strings from the
  // original ETL run — pass through as-is during migration.
  return code;
}

// ---------------------------------------------------------------------------
// Monthly aggregation (mirrors recalculateMonthly in download-microdatos.js)
// ---------------------------------------------------------------------------

function monthlyPath(year, month) {
  return path.join(DATA_DIR, year, month, 'acumulado-marca-modelo.csv');
}

function brandMonthlyPath(year, month) {
  return path.join(DATA_DIR, year, month, 'acumulado-marca.csv');
}

function provinciaMonthlyPath(year, month) {
  return path.join(DATA_DIR, year, month, 'acumulado-marca-modelo-provincia.csv');
}

function recalculateMonthly(year, month) {
  const monthDir = path.join(DATA_DIR, year, month);
  if (!fs.existsSync(monthDir)) return;

  const data = new Map();
  const dayFiles = fs.readdirSync(monthDir).filter((f) => /^\d{2}\.csv$/.test(f)).sort();

  for (const f of dayFiles) {
    const content = fs.readFileSync(path.join(monthDir, f), 'utf8');
    const lines = content.split('\n').slice(1); // skip header
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',').map((v) => v.replace(/^"|"$/g, ''));
      if (parts.length < 5) continue;
      const marca = parts[3];
      const modelo = parts[4];
      const provincia = normalizeProvince(parts[5] || '');
      const cilindrada = parts[6] || '';
      const key = `${marca}\t${modelo}`;
      if (!data.has(key)) data.set(key, { count: 0, cilindradaCounts: new Map(), provinciaCounts: new Map() });
      const entry = data.get(key);
      entry.count++;
      if (cilindrada) entry.cilindradaCounts.set(cilindrada, (entry.cilindradaCounts.get(cilindrada) || 0) + 1);
      entry.provinciaCounts.set(provincia, (entry.provinciaCounts.get(provincia) || 0) + 1);
    }
  }

  const rows = Array.from(data.entries())
    .map(([key, entry]) => {
      const [marca, modelo] = key.split('\t');
      let cilindrada = '';
      if (entry.cilindradaCounts.size === 1) {
        cilindrada = [...entry.cilindradaCounts.keys()][0];
      } else if (entry.cilindradaCounts.size > 1) {
        cilindrada = [...entry.cilindradaCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const conflictos = [...entry.cilindradaCounts.keys()].join(', ');
        console.warn(`WARN: CILINDRADA_ITV inconsistente para "${marca}" / "${modelo}": ${conflictos} → usando "${cilindrada}"`);
      }
      return { marca, modelo, cilindrada, count: entry.count, provinciaCounts: entry.provinciaCounts };
    })
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo));

  // acumulado-marca-modelo.csv
  const lines = ['MARCA_ITV,MODELO_ITV,CILINDRADA_ITV,COUNT'];
  for (const r of rows) lines.push(`"${r.marca}","${r.modelo}","${r.cilindrada}",${r.count}`);
  fs.writeFileSync(monthlyPath(year, month), lines.join('\n') + '\n');

  // acumulado-marca.csv
  const brandCounts = new Map();
  for (const r of rows) brandCounts.set(r.marca, (brandCounts.get(r.marca) || 0) + r.count);
  const brandLines = ['MARCA_ITV,COUNT'];
  for (const [marca, count] of Array.from(brandCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])))
    brandLines.push(`"${marca}",${count}`);
  fs.writeFileSync(brandMonthlyPath(year, month), brandLines.join('\n') + '\n');

  // acumulado-marca-modelo-provincia.csv
  const provRows = [];
  for (const r of rows) {
    for (const [provincia, count] of r.provinciaCounts)
      provRows.push({ marca: r.marca, modelo: r.modelo, provincia, cilindrada: r.cilindrada, count });
  }
  provRows.sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo) || a.provincia.localeCompare(b.provincia));
  const provLines = ['MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,CILINDRADA_ITV,COUNT'];
  for (const r of provRows) provLines.push(`"${r.marca}","${r.modelo}","${r.provincia}","${r.cilindrada}",${r.count}`);
  fs.writeFileSync(provinciaMonthlyPath(year, month), provLines.join('\n') + '\n');

  console.log(`  Recalculated monthly aggregates: ${year}/${month}`);
}

// ---------------------------------------------------------------------------
// Patch a single daily CSV file in-place
// ---------------------------------------------------------------------------

function patchDailyCsv(filePath, brandChangeCounts) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const header = lines[0];
  let fileChanged = false;

  const patched = [header];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { patched.push(line); continue; }

    const parts = line.split(',').map((v) => v.replace(/^"|"$/g, ''));
    if (parts.length < 5) { patched.push(line); continue; }

    const marca = parts[3];
    if (!MIGRATED_BRANDS.has(marca)) { patched.push(line); continue; }

    const modeloOld = parts[4];
    const modeloNew = normalizeModel(marca, modeloOld);

    if (modeloNew !== modeloOld) {
      parts[4] = modeloNew;
      const newLine = parts.map((v) => `"${v}"`).join(',');
      patched.push(newLine);
      fileChanged = true;

      const key = `${marca}/${modeloOld} → ${modeloNew}`;
      brandChangeCounts.set(key, (brandChangeCounts.get(key) || 0) + 1);
    } else {
      patched.push(line);
    }
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, patched.join('\n'));
  }

  return fileChanged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const months = [
    { year: '2026', month: '02' },
    { year: '2026', month: '03' },
  ];

  const globalChangeCounts = new Map();
  let totalFilesPatched = 0;
  let totalFilesScanned = 0;

  for (const { year, month } of months) {
    const monthDir = path.join(DATA_DIR, year, month);
    if (!fs.existsSync(monthDir)) {
      console.log(`Skipping missing directory: ${monthDir}`);
      continue;
    }

    const dayFiles = fs.readdirSync(monthDir).filter((f) => /^\d{2}\.csv$/.test(f)).sort();
    console.log(`\nPatching ${year}/${month}: ${dayFiles.length} daily CSV file(s)`);

    const monthChangeCounts = new Map();
    let monthPatched = 0;

    for (const f of dayFiles) {
      const filePath = path.join(monthDir, f);
      totalFilesScanned++;
      const changed = patchDailyCsv(filePath, monthChangeCounts);
      if (changed) {
        monthPatched++;
        totalFilesPatched++;
      }
    }

    console.log(`  Files patched: ${monthPatched}/${dayFiles.length}`);
    if (monthChangeCounts.size > 0) {
      console.log('  Row changes:');
      for (const [key, count] of [...monthChangeCounts.entries()].sort()) {
        console.log(`    ${key}: ${count} row(s)`);
        globalChangeCounts.set(key, (globalChangeCounts.get(key) || 0) + count);
      }
    }
  }

  // Regenerate aggregated files for both months
  console.log('\nRegenerating aggregated files...');
  for (const { year, month } of months) {
    recalculateMonthly(year, month);
  }

  // Summary
  console.log('\n=== Migration Summary ===');
  console.log(`Files scanned: ${totalFilesScanned}`);
  console.log(`Files patched: ${totalFilesPatched}`);
  if (globalChangeCounts.size === 0) {
    console.log('No rows changed (migration already applied or no matching codes found).');
  } else {
    console.log('Total row changes across all months:');
    for (const [key, count] of [...globalChangeCounts.entries()].sort()) {
      console.log(`  ${key}: ${count}`);
    }
  }
  console.log('Done.');
}

main();
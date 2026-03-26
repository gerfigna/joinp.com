'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./constants');
const { monthDir } = require('./aggregate');

// ─── Power Range Classification ────────────────────────────────────────────

/**
 * Classifies a KW value into a power range string.
 * @param {string} kw
 * @returns {string | null} 'Hasta 11 kW' | '11-35 kW' | 'Más de 35 kW' | null
 */
function getPowerRange(kw) {
  const n = parseFloat(kw);
  if (!kw || isNaN(n) || n <= 0) return null;
  if (n <= 11) return 'Hasta 11 kW';
  if (n <= 35) return '11-35 kW';
  return 'Más de 35 kW';
}

// ─── CSV Path Helpers ────────────────────────────────────────────────────────

function yearDir(year) {
  return path.join(DATA_DIR, year);
}

function marcaMonthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-marca-mensual.csv');
}

function potenciaMonthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-potencia-mensual.csv');
}

function marcaAnnualPath(year) {
  return path.join(yearDir(year), 'acumulado-marca-anual.csv');
}

function potenciaAnnualPath(year) {
  return path.join(yearDir(year), 'acumulado-potencia-anual.csv');
}

// ─── PowerAggregator ─────────────────────────────────────────────────────────

class PowerAggregator {
  constructor() {
    /** @type {Map<string, number>} */
    this.marcaCounts = new Map();
    /** @type {Map<string, number>} */
    this.potenciaCounts = new Map();
  }

  /**
   * Classify kw and increment both counters.
   * @param {string} marca
   * @param {string} kw
   */
  add(marca, kw) {
    this.marcaCounts.set(marca, (this.marcaCounts.get(marca) || 0) + 1);
    const range = getPowerRange(kw);
    if (range) this.potenciaCounts.set(range, (this.potenciaCounts.get(range) || 0) + 1);
  }

  /**
   * Write monthly CSVs for marca and potencia.
   * @param {string} year
   * @param {string} month
   */
  writeMonthly(year, month) {
    const dir = monthDir(year, month);
    fs.mkdirSync(dir, { recursive: true });
    _writeCsv(marcaMonthlyPath(year, month), 'MARCA_ITV,COUNT', this.marcaCounts);
    _writeCsv(potenciaMonthlyPath(year, month), 'RANGO_POTENCIA,COUNT', this.potenciaCounts);
  }

  /**
   * Read all monthly CSVs for the year and write annual CSVs.
   * @param {string} year
   */
  writeAnnual(year) {
    const dir = yearDir(year);
    fs.mkdirSync(dir, { recursive: true });

    const annualMarca = new Map();
    const annualPotencia = new Map();

    const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    for (const entry of entries) {
      if (!/^\d{2}$/.test(entry)) continue;
      const mPath = marcaMonthlyPath(year, entry);
      const pPath = potenciaMonthlyPath(year, entry);
      _readAndMerge(mPath, annualMarca);
      _readAndMerge(pPath, annualPotencia);
    }

    _writeCsv(marcaAnnualPath(year), 'MARCA_ITV,COUNT', annualMarca);
    _writeCsv(potenciaAnnualPath(year), 'RANGO_POTENCIA,COUNT', annualPotencia);
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function _writeCsv(filePath, header, counts) {
  const lines = [header];
  for (const [key, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`"${key}",${count}`);
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function _readAndMerge(filePath, accumulator) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const commaIdx = lines[i].indexOf(',');
    if (commaIdx === -1) continue;
    const key = lines[i].slice(1, commaIdx - 1); // strip surrounding quotes from key
    const count = parseInt(lines[i].slice(commaIdx + 1), 10);
    accumulator.set(key, (accumulator.get(key) || 0) + count);
  }
}

module.exports = {
  PowerAggregator,
  potenciaMonthlyPath,
};

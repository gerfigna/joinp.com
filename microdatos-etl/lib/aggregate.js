'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./constants');

function monthDir(year, month) {
  return path.join(DATA_DIR, year, month);
}

function monthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-marca-modelo.csv');
}

function brandMonthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-marca.csv');
}

function provinciaMonthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-marca-modelo-provincia.csv');
}

/**
 * Write the three aggregate CSVs for a given year/month.
 * @param {string} year
 * @param {string} month
 * @param {Map<string, {count: number, cilindradaCounts: Map, provinciaCounts: Map}>} data
 *   key: "MARCA\tMODELO"
 */
function writeAggregates(year, month, data) {
  const dir = monthDir(year, month);
  fs.mkdirSync(dir, { recursive: true });

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
}

module.exports = { writeAggregates, monthDir, monthlyPath, brandMonthlyPath, provinciaMonthlyPath };

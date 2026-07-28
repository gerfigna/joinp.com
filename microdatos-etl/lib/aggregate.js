'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./constants');

function yearDir(year) {
  return path.join(DATA_DIR, year);
}

function monthDir(year, month) {
  return path.join(DATA_DIR, year, month);
}

function provinciaMonthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-marca-modelo-provincia.csv');
}

function provinciaAnnualPath(year) {
  return path.join(yearDir(year), 'acumulado-marca-modelo-provincia-anual.csv');
}

/**
 * Write the monthly aggregate CSV for a given year/month.
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

  // acumulado-marca-modelo-provincia.csv
  const provRows = [];
  for (const r of rows) {
    for (const [provincia, { count, comunidad }] of r.provinciaCounts)
      provRows.push({ marca: r.marca, modelo: r.modelo, provincia, comunidad, cilindrada: r.cilindrada, count });
  }
  provRows.sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo) || a.provincia.localeCompare(b.provincia));
  const provLines = ['MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT'];
  for (const r of provRows) provLines.push(`"${r.marca}","${r.modelo}","${r.provincia}","${r.comunidad}","${r.cilindrada}",${r.count}`);
  fs.writeFileSync(provinciaMonthlyPath(year, month), provLines.join('\n') + '\n');
}

/**
 * Read every existing monthly acumulado-marca-modelo-provincia.csv for a year
 * and write the annual aggregate, summing COUNT per MARCA_ITV+MODELO_ITV+PROVINCIA_VEH.
 * @param {string} year
 */
function writeAnnualAggregate(year) {
  const data = new Map(); // key: "MARCA\tMODELO\tPROVINCIA" -> { comunidad, cilindradaCounts: Map, count }

  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, '0');
    const monthlyPath = provinciaMonthlyPath(year, month);
    if (!fs.existsSync(monthlyPath)) continue;

    const lines = fs.readFileSync(monthlyPath, 'utf8').trim().split('\n').slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',').map((v) => v.replace(/^"|"$/g, ''));
      if (parts.length < 6) continue;
      const [marca, modelo, provincia, comunidad, cilindrada, countStr] = parts;
      const count = parseInt(countStr, 10) || 0;
      const key = `${marca}\t${modelo}\t${provincia}`;
      if (!data.has(key)) data.set(key, { comunidad, cilindradaCounts: new Map(), count: 0 });
      const entry = data.get(key);
      entry.count += count;
      if (cilindrada) entry.cilindradaCounts.set(cilindrada, (entry.cilindradaCounts.get(cilindrada) || 0) + count);
    }
  }

  const rows = Array.from(data.entries())
    .map(([key, entry]) => {
      const [marca, modelo, provincia] = key.split('\t');
      let cilindrada = '';
      if (entry.cilindradaCounts.size === 1) {
        cilindrada = [...entry.cilindradaCounts.keys()][0];
      } else if (entry.cilindradaCounts.size > 1) {
        cilindrada = [...entry.cilindradaCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const conflictos = [...entry.cilindradaCounts.keys()].join(', ');
        console.warn(`WARN: CILINDRADA_ITV inconsistente entre meses para "${marca}" / "${modelo}" / "${provincia}": ${conflictos} → usando "${cilindrada}"`);
      }
      return { marca, modelo, provincia, comunidad: entry.comunidad, cilindrada, count: entry.count };
    })
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo) || a.provincia.localeCompare(b.provincia));

  fs.mkdirSync(yearDir(year), { recursive: true });
  const lines = ['MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT'];
  for (const r of rows) lines.push(`"${r.marca}","${r.modelo}","${r.provincia}","${r.comunidad}","${r.cilindrada}",${r.count}`);
  fs.writeFileSync(provinciaAnnualPath(year), lines.join('\n') + '\n');
}

module.exports = { writeAggregates, writeAnnualAggregate, monthDir, provinciaMonthlyPath, provinciaAnnualPath };

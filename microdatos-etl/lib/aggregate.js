'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./constants');

function monthDir(year, month) {
  return path.join(DATA_DIR, year, month);
}

function provinciaMonthlyPath(year, month) {
  return path.join(monthDir(year, month), 'acumulado-marca-modelo-provincia.csv');
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

module.exports = { writeAggregates, monthDir, provinciaMonthlyPath };

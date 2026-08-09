'use strict';

const fs = require('fs');

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Parses one AEMET db/clima/*_Provincias.csv file (ISO-8859-1 encoded,
 * ';'-separated: Parámetro;periodo de referencia;región;enero..diciembre;anual).
 * @param {string} csvPath
 * @returns {{ periodo: string, porRegion: Map<string, { valores: number[] }> }}
 *   valores = [enero, ..., diciembre, anual] (13 numbers)
 */
function parseClimaCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, 'latin1');
  const lines = raw.split(/\r\n|\n/).filter((l) => l.trim() !== '');
  const header = lines[0].split(';');
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const valueCols = [...MESES, 'anual'].map((m) => idx[m]);

  let periodo = null;
  const porRegion = new Map();

  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    periodo = cols[idx['periodo de referencia']];
    const region = cols[idx['región']];
    const valores = valueCols.map((c) => parseFloat(cols[c]));
    porRegion.set(region, { valores });
  }

  return { periodo, porRegion };
}

module.exports = { MESES, parseClimaCsv };

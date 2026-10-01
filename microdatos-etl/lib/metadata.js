'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./constants');

const METADATA_PATH = path.join(DATA_DIR, 'metadata.json');

/**
 * Reads data/metadata.json. Returns an empty object if missing or invalid.
 * @returns {object}
 */
function readMetadata() {
  try {
    return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Merges the given fields into data/metadata.json, preserving existing keys.
 * @param {object} fields
 * @returns {string} path written
 */
function updateMetadata(fields) {
  const metadata = { ...readMetadata(), ...fields };
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2) + '\n');
  return METADATA_PATH;
}

/**
 * Returns the latest "YYYY-MM" that has a monthly brand aggregate
 * (data/YYYY/MM/acumulado-marca-mensual.csv), or null if none.
 * @returns {string|null}
 */
function findLastCompleteMonth() {
  if (!fs.existsSync(DATA_DIR)) return null;
  let last = null;
  const years = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}$/.test(f)).sort();
  for (const year of years) {
    const months = fs.readdirSync(path.join(DATA_DIR, year)).filter(f => /^\d{2}$/.test(f)).sort();
    for (const month of months) {
      if (fs.existsSync(path.join(DATA_DIR, year, month, 'acumulado-marca-mensual.csv'))) {
        last = `${year}-${month}`;
      }
    }
  }
  return last;
}

module.exports = { readMetadata, updateMetadata, findLastCompleteMonth };

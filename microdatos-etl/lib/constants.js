'use strict';

const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const E_DATA_DIR = path.join(__dirname, '..', 'e-data');
const SQLITE_DB_PATH = path.join(__dirname, '..', 'db', 'matriculaciones-motos.sqlite');

module.exports = { DATA_DIR, E_DATA_DIR, SQLITE_DB_PATH };

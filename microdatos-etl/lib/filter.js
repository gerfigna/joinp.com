'use strict';

const { getField } = require('./fields');
const { normalizeBrand, normalizeModel, normalizeProvince, normalizeComunidad } = require('./normalize');

/**
 * Returns true if the line represents a new motorcycle registration that
 * should be included in the output.
 * @param {string} line
 * @returns {boolean}
 */
function isMotorcycleRow(line) {
  if (line.length < 200) return false;

  const COD_TIPO      = getField(line, 'COD_TIPO');
  const CLAVE_TRAMITE = getField(line, 'CLAVE_TRAMITE');
  const IND_NUEVO     = getField(line, 'IND_NUEVO_USADO');
  const FABRICANTE    = getField(line, 'FABRICANTE_ITV');

  if (COD_TIPO !== '50' || CLAVE_TRAMITE !== '1' || IND_NUEVO !== 'N' || FABRICANTE === 'ND') return false;

  const cilindrada = getField(line, 'CILINDRADA_ITV');

  return !(!cilindrada || cilindrada === '0');
}

/**
 * Extracts and normalizes the fields needed for output from a line that has
 * already passed `isMotorcycleRow`.
 * @param {string} line
 * @returns {{ fecMatricula: string, codClaseMat: string, fecTramitacion: string, marca: string, modelo: string, provincia: string, cilindrada: string }}
 */
function extractRowFields(line) {
  const marca     = normalizeBrand(getField(line, 'MARCA_ITV'));
  const modelo    = normalizeModel(marca, getField(line, 'MODELO_ITV'));
  const codProvincia = getField(line, 'COD_PROVINCIA_VEH');
  const provincia = normalizeProvince(codProvincia);
  const comunidad = normalizeComunidad(codProvincia);
  const cilindrada = getField(line, 'CILINDRADA_ITV');
  return {
    fecMatricula:   getField(line, 'FEC_MATRICULA'),
    codClaseMat:    getField(line, 'COD_CLASE_MAT'),
    fecTramitacion: getField(line, 'FEC_TRAMITACION'),
    marca,
    modelo,
    provincia,
    comunidad,
    cilindrada,
  };
}

/**
 * Extracts MARCA_ITV and KW_ITV from a line that has already passed `isMotorcycleRow`.
 * @param {string} line
 * @returns {{ marca: string, kw: string } | null}
 */
function extractPowerFields(line) {
  const marca = normalizeBrand(getField(line, 'MARCA_ITV'));
  const kw = getField(line, 'KW_ITV');
  const n = parseFloat(kw);
  if (!kw || isNaN(n) || n <= 0) return null;
  return { marca, kw };
}

module.exports = { isMotorcycleRow, extractRowFields, extractPowerFields };

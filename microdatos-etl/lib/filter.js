'use strict';

const { FIELDS, getField } = require('./fields');
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

/**
 * Returns true if the line represents a new electric motorcycle registration
 * (COD_PROPULSION_ITV = '2', COD_CLASE_MAT = '0').
 * @param {string} line
 * @returns {boolean}
 */
function isElectricMotorcycleRow(line) {
  if (line.length < 200) return false;
  if (getField(line, 'COD_TIPO')          !== '50') return false;
  if (getField(line, 'CLAVE_TRAMITE')     !== '1')  return false;
  if (getField(line, 'IND_NUEVO_USADO')   !== 'N')  return false;
  if (getField(line, 'FABRICANTE_ITV')    === 'ND') return false;
  if (getField(line, 'COD_PROPULSION_ITV')          !== '2')   return false;
  if (getField(line, 'COD_CLASE_MAT')               !== '0')   return false;
  if (getField(line, 'CATEGORIA_VEHICULO_ELECTRICO') !== 'BEV') return false;
  const kw = getField(line, 'KW_ITV');
  const kwNum = parseFloat(kw);
  if (!kw || kw.trim() === '*******' || isNaN(kwNum) || kwNum <= 0) return false;
  if (normalizeBrand(getField(line, 'MARCA_ITV')) === 'TALARIA') return false;
  return true;
}

/**
 * Derives the license category from a kW string.
 * @param {string} kw
 * @returns {'A1'|'A2'|'A'|''}
 */
function tipoCarnet(kw) {
  const n = parseFloat(kw);
  if (!kw || kw.trim() === '*******' || isNaN(n) || n <= 0) return '';
  if (n <= 11) return 'A1';
  if (n <= 35) return 'A2';
  return 'A';
}

function normalizeCategoria(cat, clasificacion) {
  const c  = (cat         || '').trim();
  const cl = (clasificacion || '').trim();
  if (/^L3E/i.test(c)) return 'L3e';
  if ((c === '' || c.includes('*')) && cl.startsWith('04')) return 'L3e';
  return c;
}

/**
 * Extracts 35 source fields + calculated TIPO_CARNET from a line that has
 * already passed `isElectricMotorcycleRow`.
 * @param {string} line
 * @returns {Object}
 */
function extractElectricFields(line) {
  const kw           = getField(line, 'KW_ITV');
  const catRaw       = getField(line, 'CATEGORIA_HOMOLOGACION_EUROPEA_ITV');
  const clasificacion = getField(line, 'CLASIFICACION_REGLAMENTO_VEHICULOS_ITV');
  return {
    FEC_MATRICULA:                          getField(line, 'FEC_MATRICULA'),
    COD_CLASE_MAT:                          getField(line, 'COD_CLASE_MAT'),
    FEC_TRAMITACION:                        getField(line, 'FEC_TRAMITACION'),
    MARCA_ITV:                              normalizeBrand(getField(line, 'MARCA_ITV')),
    MODELO_ITV:                             getField(line, 'MODELO_ITV'),
    CILINDRADA_ITV:                         getField(line, 'CILINDRADA_ITV'),
    POTENCIA_ITV:                           getField(line, 'POTENCIA_ITV'),
    NUM_PLAZAS:                             getField(line, 'NUM_PLAZAS'),
    LOCALIDAD_VEHICULO:                     getField(line, 'LOCALIDAD_VEHICULO'),
    COD_PROVINCIA_VEH:                      getField(line, 'COD_PROVINCIA_VEH'),
    COD_PROVINCIA_MAT:                      getField(line, 'COD_PROVINCIA_MAT'),
    FEC_TRAMITE:                            getField(line, 'FEC_TRAMITE'),
    CODIGO_POSTAL:                          getField(line, 'CODIGO_POSTAL'),
    PERSONA_FISICA_JURIDICA:                getField(line, 'PERSONA_FISICA_JURIDICA'),
    CODIGO_ITV:                             getField(line, 'CODIGO_ITV'),
    SERVICIO:                               getField(line, 'SERVICIO'),
    COD_MUNICIPIO_INE_VEH:                  getField(line, 'COD_MUNICIPIO_INE_VEH'),
    MUNICIPIO:                              getField(line, 'MUNICIPIO'),
    KW_ITV:                                 kw,
    TIPO_CARNET:                            tipoCarnet(kw),
    TIPO_ITV:                               getField(line, 'TIPO_ITV'),
    VARIANTE_ITV:                           getField(line, 'VARIANTE_ITV'),
    VERSION_ITV:                            getField(line, 'VERSION_ITV'),
    MASA_ORDEN_MARCHA_ITV:                  getField(line, 'MASA_ORDEN_MARCHA_ITV'),
    MASA_MAXIMA_TECNICA_ITV:                getField(line, 'MASA_MAXIMA_TECNICA_ITV'),
    CATEGORIA_HOMOLOGACION_EUROPEA_ITV:     normalizeCategoria(catRaw, clasificacion),
    CARROCERIA:                             getField(line, 'CARROCERIA'),
    CONSUMO_WH_KM_ITV:                      getField(line, 'CONSUMO_WH_KM_ITV'),
    CLASIFICACION_REGLAMENTO_VEHICULOS_ITV: clasificacion,
    CATEGORIA_VEHICULO_ELECTRICO:           getField(line, 'CATEGORIA_VEHICULO_ELECTRICO'),
    AUTONOMIA_VEHICULO_ELECTRICO:           getField(line, 'AUTONOMIA_VEHICULO_ELECTRICO'),
    MARCA_VEHICULO_BASE:                    getField(line, 'MARCA_VEHICULO_BASE'),
    FABRICANTE_VEHICULO_BASE:               getField(line, 'FABRICANTE_VEHICULO_BASE'),
    TIPO_VEHICULO_BASE:                     getField(line, 'TIPO_VEHICULO_BASE'),
    VARIANTE_VEHICULO_BASE:                 getField(line, 'VARIANTE_VEHICULO_BASE'),
    VERSION_VEHICULO_BASE:                  getField(line, 'VERSION_VEHICULO_BASE'),
  };
}

/**
 * Returns true if the line represents a new registration (motorcycle or
 * moped, including electrics) of interest for the full-columns SQLite ETL.
 * COD_TIPO: '50' = motocicleta 2 ruedas sin sidecar, '90' = ciclomotor 2 ruedas.
 * @param {string} line
 * @returns {boolean}
 */
function isMotoOrCiclomotorRow(line) {
  if (line.length < 200) return false;
  const codTipo = getField(line, 'COD_TIPO');
  if (codTipo !== '50' && codTipo !== '90') return false;
  if (getField(line, 'CLAVE_TRAMITE')   !== '1') return false;
  if (getField(line, 'IND_NUEVO_USADO') !== 'N') return false;
  if (getField(line, 'FABRICANTE_ITV')  === 'ND') return false;
  return true;
}

/**
 * Extracts every source field from a line (no columns discarded) plus a
 * `<CAMPO>_NORMALIZADO` column for each field that has a normalization rule.
 * @param {string} line
 * @returns {Object}
 */
function extractFullRowFields(line) {
  const row = {};
  for (const [name] of FIELDS) row[name] = getField(line, name);

  row.MARCA_ITV_NORMALIZADO = normalizeBrand(row.MARCA_ITV);
  row.MODELO_ITV_NORMALIZADO = normalizeModel(row.MARCA_ITV_NORMALIZADO, row.MODELO_ITV);
  row.COD_PROVINCIA_VEH_NORMALIZADO = normalizeProvince(row.COD_PROVINCIA_VEH);
  row.COMUNIDAD_AUTONOMA_NORMALIZADO = normalizeComunidad(row.COD_PROVINCIA_VEH);

  return row;
}

module.exports = {
  isMotorcycleRow, extractRowFields, extractPowerFields, isElectricMotorcycleRow, extractElectricFields,
  isMotoOrCiclomotorRow, extractFullRowFields,
};

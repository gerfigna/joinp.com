#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const LISTING_URL =
  'https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html';

const DATA_DIR = path.join(__dirname, 'data');

// Fixed-width field definitions: [name, start, length]
const FIELDS = [
  ['FEC_MATRICULA',                        0,   8],
  ['COD_CLASE_MAT',                        8,   1],
  ['FEC_TRAMITACION',                      9,   8],
  ['MARCA_ITV',                           17,  30],
  ['MODELO_ITV',                          47,  22],
  ['COD_PROCEDENCIA_ITV',                 69,   1],
  ['BASTIDOR_ITV',                        70,  21],
  ['COD_TIPO',                            91,   2],
  ['COD_PROPULSION_ITV',                  93,   1],
  ['CILINDRADA_ITV',                      94,   5],
  ['POTENCIA_ITV',                        99,   6],
  ['TARA',                               105,   6],
  ['PESO_MAX',                           111,   6],
  ['NUM_PLAZAS',                         117,   3],
  ['IND_PRECINTO',                       120,   2],
  ['IND_EMBARGO',                        122,   2],
  ['NUM_TRANSMISIONES',                  124,   2],
  ['NUM_TITULARES',                      126,   2],
  ['LOCALIDAD_VEHICULO',                 128,  24],
  ['COD_PROVINCIA_VEH',                  152,   2],
  ['COD_PROVINCIA_MAT',                  154,   2],
  ['CLAVE_TRAMITE',                      156,   1],
  ['FEC_TRAMITE',                        157,   8],
  ['CODIGO_POSTAL',                      165,   5],
  ['FEC_PRIM_MATRICULACION',             170,   8],
  ['IND_NUEVO_USADO',                    178,   1],
  ['PERSONA_FISICA_JURIDICA',            179,   1],
  ['CODIGO_ITV',                         180,   9],
  ['SERVICIO',                           189,   3],
  ['COD_MUNICIPIO_INE_VEH',             192,   5],
  ['MUNICIPIO',                          197,  30],
  ['KW_ITV',                            227,   7],
  ['NUM_PLAZAS_MAX',                     234,   3],
  ['CO2_ITV',                           237,   5],
  ['RENTING',                           242,   1],
  ['COD_TUTELA',                         243,   1],
  ['COD_POSESION',                       244,   1],
  ['IND_BAJA_DEF',                       245,   1],
  ['IND_BAJA_TEMP',                      246,   1],
  ['IND_SUSTRACCION',                    247,   1],
  ['BAJA_TELEMATICA',                    248,  11],
  ['TIPO_ITV',                           259,  25],
  ['VARIANTE_ITV',                       284,  25],
  ['VERSION_ITV',                        309,  35],
  ['FABRICANTE_ITV',                     344,  70],
  ['MASA_ORDEN_MARCHA_ITV',              414,   6],
  ['MASA_MAXIMA_TECNICA_ITV',            420,   6],
  ['CATEGORIA_HOMOLOGACION_EUROPEA_ITV', 426,   4],
  ['CARROCERIA',                         430,   4],
  ['PLAZAS_PIE',                         434,   3],
  ['NIVEL_EMISIONES_EURO_ITV',           437,   8],
  ['CONSUMO_WH_KM_ITV',                  445,   4],
  ['CLASIFICACION_REGLAMENTO_VEHICULOS_ITV', 449, 4],
  ['CATEGORIA_VEHICULO_ELECTRICO',       453,   4],
  ['AUTONOMIA_VEHICULO_ELECTRICO',       457,   6],
  ['MARCA_VEHICULO_BASE',                463,  30],
  ['FABRICANTE_VEHICULO_BASE',           493,  50],
  ['TIPO_VEHICULO_BASE',                 543,  35],
  ['VARIANTE_VEHICULO_BASE',             578,  25],
  ['VERSION_VEHICULO_BASE',              603,  35],
  ['DISTANCIA_EJES_12_ITV',             638,   4],
  ['VIA_ANTERIOR_ITV',                   642,   4],
  ['VIA_POSTERIOR_ITV',                  646,   4],
  ['TIPO_ALIMENTACION_ITV',              650,   1],
  ['CONTRASENA_HOMOLOGACION_ITV',        651,  25],
  ['ECO_INNOVACION_ITV',                 676,   1],
  ['REDUCCION_ECO_ITV',                  677,   4],
  ['CODIGO_ECO_ITV',                     681,  25],
  ['FEC_PROCESO',                        706,   8],
];

const FIELD_MAP = Object.fromEntries(FIELDS.map(([name, start, len]) => [name, { start, len }]));

function getField(line, name) {
  const { start, len } = FIELD_MAP[name];
  return line.substring(start, start + len).trim();
}

// Model normalization rules
const BRAND_EXACT = {
  YAMAHA:  { 'GPD125D-A': 'NMAX125', 'GPD125-A': 'NMAX125', 'YP125R-DA': 'XMAX125', 'YP125RA': 'XMAX125', 'WR125-A': 'WR125', 'LCG125' : 'RayZR 125' },
  HONDA:   { 'WW125A': 'PCX125', 'WW125S': 'PCX125', 'FSH125': 'SH Mode 125', 'SH125AD': 'SH125i', 'NSS125AD': 'FORZA125', 'NSC110': 'VISION 110', 'XL750' : 'XL750 Transalp' },
  APRILIA: { 'RS 660 FACTORY': 'RS 660', 'RSV4 FACTORY': 'RSV4', 'TUONO V4 FACTORY': 'TUONO V4', 'TUAREG 660 RALLY': 'TUAREG 660' },
  BENELLI: { 'BKX 125 S': 'BN125', 'TRK 702 35KW': 'TRK 702', 'TRK 702X': 'TRK 702', 'TRK 702X 35KW': 'TRK 702' },
};

const BRAND_PREFIX = {
  SYM:     [['SYMPHONY 125', 'SYMPHONY 125'], ['JET 14', 'JET 14'], ['JET X', 'JET X']],
  YAMAHA:  [['MTN690', 'MT-07'], ['MTT890', 'MT-09'], ['MWS125', 'TRICITY 125'], ['XTZ690', 'XTZ 700 Tenere']],
  BRIXTON: [['CROSSFIRE 500 ', 'CROSSFIRE 500']],
  DUCATI:  [['MULTISTRADA V2 ', 'MULTISTRADA V2'], ['MULTISTRADA V4 ', 'MULTISTRADA V4'], ['PANIGALE V2 ', 'PANIGALE V2'], ['PANIGALE V4 ', 'PANIGALE V4'], ['STREETFIGHTER ', 'STREETFIGHTER']],
  HONDA:   [['CB650RA', 'CB650RA'], ['CBR1000', 'CBR1000'], ['CBR500', 'CBR500'], ['CMX1100', 'CMX1100'], ['CRF1100', 'CRF1100'], ['NT1100', 'NT1100']],
  KTM:     [['KTM 250 EXC', 'KTM 250 EXC'], ['KTM 300 EXC', 'KTM 300 EXC']],
  KYMCO:   [['AGILITY S ', 'AGILITY S']],
  ZONTES:  [['125C', '125C']],
};

function normalizeModel(marca, modelo) {
  const exact = BRAND_EXACT[marca]?.[modelo];
  if (exact) return exact;
  for (const [prefix, canonical] of (BRAND_PREFIX[marca] || [])) {
    if (modelo.startsWith(prefix)) return canonical;
  }
  return modelo;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    function get(u) {
      const mod = u.startsWith('https') ? require('https') : require('http');
      mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

async function fetchZipUrls() {
  console.log('Downloading listing HTML...');
  const buf = await httpGet(LISTING_URL);
  const html = buf.toString('utf8');

  const listMatch = html.match(/<ul[^>]+id=["']listado["'][^>]*>([\s\S]*?)<\/ul>/i);
  if (!listMatch) throw new Error('Could not find #listado in HTML');

  const seen = new Set();
  const urls = [];
  const re = /href=["']([^"']*export_mat_\d{8}\.zip[^"']*)["']/gi;
  let m;
  while ((m = re.exec(listMatch[1])) !== null) {
    const raw = m[1];
    const url = raw.startsWith('http') ? raw : `https://www.dgt.es${raw}`;
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

function dateFromUrl(url) {
  const m = url.match(/export_mat_(\d{4})(\d{2})(\d{2})\.zip/);
  if (!m) return null;
  return { year: m[1], month: m[2], day: m[3] };
}

function csvPath(year, month, day) {
  return path.join(DATA_DIR, year, month, `${day}.csv`);
}

function monthlyPath(year, month) {
  return path.join(DATA_DIR, year, month, 'acumulado-marca-modelo.csv');
}

function brandMonthlyPath(year, month) {
  return path.join(DATA_DIR, year, month, 'acumulado-marca.csv');
}

function extractTxtFromZip(zipBuf) {
  const zip = new AdmZip(zipBuf);
  const entry = zip.getEntries().find((e) => /\.txt$/i.test(e.entryName));
  if (!entry) throw new Error('No .txt file found in ZIP');
  return entry.getData().toString('latin1');
}

function processTxt(txt) {
  const rows = [];
  for (const line of txt.split('\n')) {
    if (line.length < 200) continue;

    const COD_TIPO      = getField(line, 'COD_TIPO');
    const CLAVE_TRAMITE = getField(line, 'CLAVE_TRAMITE');
    const IND_NUEVO     = getField(line, 'IND_NUEVO_USADO');
    const FABRICANTE    = getField(line, 'FABRICANTE_ITV');

    if (COD_TIPO !== '50' || CLAVE_TRAMITE !== '1' || IND_NUEVO !== 'N' || FABRICANTE === 'ND') continue;

    const marca  = getField(line, 'MARCA_ITV');
    const modelo = normalizeModel(marca, getField(line, 'MODELO_ITV'));

    rows.push([
      getField(line, 'FEC_MATRICULA'),
      getField(line, 'COD_CLASE_MAT'),
      getField(line, 'FEC_TRAMITACION'),
      marca,
      modelo,
    ]);
  }
  return rows;
}

function writeDailyCsv(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = ['FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV'];
  for (const r of rows) lines.push(r.map((v) => `"${v}"`).join(','));
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function recalculateMonthly(year, month) {
  const monthDir = path.join(DATA_DIR, year, month);
  if (!fs.existsSync(monthDir)) return;

  const counts = new Map();
  const dayFiles = fs.readdirSync(monthDir).filter((f) => /^\d{2}\.csv$/.test(f)).sort();

  for (const f of dayFiles) {
    const content = fs.readFileSync(path.join(monthDir, f), 'utf8');
    const lines = content.split('\n').slice(1); // skip header
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',').map((v) => v.replace(/^"|"$/g, ''));
      if (parts.length < 5) continue;
      const key = `${parts[3]}\t${parts[4]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const rows = Array.from(counts.entries())
    .map(([key, count]) => { const [marca, modelo] = key.split('\t'); return { marca, modelo, count }; })
    .sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo));

  const lines = ['MARCA_ITV,MODELO_ITV,COUNT'];
  for (const r of rows) lines.push(`"${r.marca}","${r.modelo}",${r.count}`);
  fs.writeFileSync(monthlyPath(year, month), lines.join('\n') + '\n');

  const brandCounts = new Map();
  for (const r of rows) brandCounts.set(r.marca, (brandCounts.get(r.marca) || 0) + r.count);
  const brandLines = ['MARCA_ITV,COUNT'];
  for (const [marca, count] of Array.from(brandCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])))
    brandLines.push(`"${marca}",${count}`);
  fs.writeFileSync(brandMonthlyPath(year, month), brandLines.join('\n') + '\n');

  console.log(`  Recalculated monthly: ${year}/${month}`);
}

async function main() {
  const urls = await fetchZipUrls();
  console.log(`Found ${urls.length} ZIP URL(s)`);

  const processedMonths = new Set();

  for (const url of urls) {
    const d = dateFromUrl(url);
    if (!d) { console.log(`Skipping (no date in URL): ${url}`); continue; }

    const outPath = csvPath(d.year, d.month, d.day);
    if (fs.existsSync(outPath)) {
      console.log(`Already exists: ${d.year}/${d.month}/${d.day} — skipping`);
      continue;
    }

    console.log(`Downloading: ${url}`);
    const zipBuf = await httpGet(url);
    console.log(`  Received ${zipBuf.length} bytes`);

    const txt = extractTxtFromZip(zipBuf);
    const rows = processTxt(txt);
    console.log(`  ${rows.length} records after filtering`);

    writeDailyCsv(outPath, rows);
    console.log(`  Written: ${outPath}`);

    processedMonths.add(`${d.year}/${d.month}`);
  }

  for (const ym of processedMonths) {
    const [year, month] = ym.split('/');
    recalculateMonthly(year, month);
  }

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
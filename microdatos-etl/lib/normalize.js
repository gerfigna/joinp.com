'use strict';

// Model normalization rules
const BRAND_EXACT = {
  YAMAHA:  { 'GPD125D-A': 'NMAX125', 'GPD125-A': 'NMAX125', 'YP125R-DA': 'XMAX125', 'YP125RA': 'XMAX125', 'WR125-A': 'WR125', 'LCG125' : 'RayZR 125', 'MTN320-A': 'MT-03', 'LTS125-C': "D'elight" },
  HONDA:   { 'WW125A': 'PCX125', 'WW125S': 'PCX125', 'FSH125': 'SH Mode 125', 'SH125AD': 'SH125i', 'NSS125AD': 'FORZA125', 'NSC110': 'VISION 110', 'XL750' : 'XL750 Transalp', 'ADV350A': 'ADV 350', 'ADV750': 'ADV 750', 'NSS350A': 'FORZA 350', 'NSS750': 'FORZA 750', 'SH350A': 'SH350i', 'CB750A': 'CB750 Hornet', 'CB500XA': 'CB 500 X', 'CB500FA': 'CB 500 F', 'CBR650RAC': 'CBR 650 R', 'GB350S': 'GB350S', 'CBF125NA': 'CBF 125', 'CB125F': 'CB 125 F', 'CL500A': 'CL500', 'CRF300LA': 'CRF 300 L', 'CMX500A': 'Rebel 500', 'CMX500A2': 'Rebel 500' },
  APRILIA: { 'RS 660 FACTORY': 'RS 660', 'RSV4 FACTORY': 'RSV4', 'TUONO V4 FACTORY': 'TUONO V4', 'TUAREG 660 RALLY': 'TUAREG 660' },
  BENELLI: { 'BKX 125 S': 'BN125', 'TRK 702 35KW': 'TRK 702', 'TRK 702X': 'TRK 702', 'TRK 702X 35KW': 'TRK 702' },
  SUZUKI:  { 'UB125L': 'ADDRESS 125', 'UZ125': 'AVENIS 125', 'DL800': 'V-Strom 800', 'DL800U': 'V-Strom 800', 'GSX800': 'GSX-8S', 'GSX800U': 'GSX-8S', 'GSX800T': 'GSX-8S', 'DL1050': 'V-Strom 1050', 'AN400': 'BURGMAN 400' },
};

const BRAND_PREFIX = {
  SYM:     [['SYMPHONY 125', 'SYMPHONY 125'], ['JET 14', 'JET 14'], ['JET X', 'JET X']],
  YAMAHA:  [['MTN690', 'MT-07'], ['MTT890', 'Tracer 9 GT'], ['MWS125', 'TRICITY 125'], ['XTZ690', 'XTZ 700 Tenere'], ['MTN125', 'MT-125'], ['MTM125', 'MT-125'], ['XP560', 'TMAX 560'], ['CZD300', 'XMAX 300'], ['YZF125', 'R125'], ['MTN890', 'MT-09'], ['MTT690', 'TRACER 700'], ['MTM690', 'XSR700'], ['YZF890', 'YZF-R9'], ['MTN1000', 'MT-10'], ['MTM890', 'XSR-900'], ['YZF320', 'YZF-R3'], ['MXT890', 'NIKEN GT']],
  BRIXTON: [['CROSSFIRE 500 ', 'CROSSFIRE 500']],
  DUCATI:  [['MULTISTRADA V2 ', 'MULTISTRADA V2'], ['MULTISTRADA V4 ', 'MULTISTRADA V4'], ['PANIGALE V2 ', 'PANIGALE V2'], ['PANIGALE V4 ', 'PANIGALE V4'], ['STREETFIGHTER ', 'STREETFIGHTER']],
  HONDA:   [['CB650RA', 'CB650RA'], ['CBR1000', 'CBR1000'], ['CBR500', 'CBR500'], ['CMX1100', 'CMX1100'], ['CRF1100', 'CRF1100L Africa Twin'], ['NT1100', 'NT1100'], ['NC750X', 'NC 750 X']],
  KTM:     [['KTM 250 EXC', 'KTM 250 EXC'], ['KTM 300 EXC', 'KTM 300 EXC']],
  KYMCO:   [['AGILITY S ', 'AGILITY S']],
  ZONTES:  [['125C', '125C']],
  SUZUKI:  [['GSX-S1000', 'GSX-S 1000']],
};

const PROVINCE_MAP = {
  A:  'Alicante/Alacant',
  AB: 'Albacete',
  AL: 'Almería',
  AV: 'Ávila',
  B:  'Barcelona',
  BA: 'Badajoz',
  BI: 'Bizkaia',
  BU: 'Burgos',
  C:  'Coruña (A)',
  CA: 'Cádiz',
  CC: 'Cáceres',
  CE: 'Ceuta',
  CO: 'Córdoba',
  CR: 'Ciudad Real',
  CS: 'Castellón/Castelló',
  CU: 'Cuenca',
  DS: 'Desconocido',
  EX: 'Extranjero',
  GC: 'Palmas (Las)',
  GI: 'Girona',
  GR: 'Granada',
  GU: 'Guadalajara',
  H:  'Huelva',
  HU: 'Huesca',
  IB: 'Illes Balears',
  J:  'Jaén',
  L:  'Lleida',
  LE: 'León',
  LO: 'Rioja (La)',
  LU: 'Lugo',
  M:  'Madrid',
  MA: 'Málaga',
  ML: 'Melilla',
  MU: 'Murcia',
  NA: 'Navarra',
  O:  'Asturias',
  OR: 'Ourense',
  OU: 'Ourense',
  P:  'Palencia',
  PM: 'Illes Balears',
  PO: 'Pontevedra',
  S:  'Cantabria',
  SA: 'Salamanca',
  SE: 'Sevilla',
  SG: 'Segovia',
  SO: 'Soria',
  SS: 'Gipuzkoa',
  T:  'Tarragona',
  TE: 'Teruel',
  TF: 'Santa Cruz de Tenerife',
  TO: 'Toledo',
  V:  'Valencia/València',
  VA: 'Valladolid',
  VI: 'Álava/Araba',
  Z:  'Zaragoza',
  ZA: 'Zamora',
};

const PROVINCIA_TO_COMUNIDAD = {
  A:  'Comunidad Valenciana',
  AB: 'Castilla-La Mancha',
  AL: 'Andalucía',
  AV: 'Castilla y León',
  B:  'Cataluña',
  BA: 'Extremadura',
  BI: 'País Vasco',
  BU: 'Castilla y León',
  C:  'Galicia',
  CA: 'Andalucía',
  CC: 'Extremadura',
  CE: 'Ceuta',
  CO: 'Andalucía',
  CR: 'Castilla-La Mancha',
  CS: 'Comunidad Valenciana',
  CU: 'Castilla-La Mancha',
  DS: 'Desconocido',
  EX: 'Extranjero',
  GC: 'Canarias',
  GI: 'Cataluña',
  GR: 'Andalucía',
  GU: 'Castilla-La Mancha',
  H:  'Andalucía',
  HU: 'Aragón',
  IB: 'Illes Balears',
  J:  'Andalucía',
  L:  'Cataluña',
  LE: 'Castilla y León',
  LO: 'La Rioja',
  LU: 'Galicia',
  M:  'Comunidad de Madrid',
  MA: 'Andalucía',
  ML: 'Melilla',
  MU: 'Región de Murcia',
  NA: 'Comunidad Foral de Navarra',
  O:  'Principado de Asturias',
  OR: 'Galicia',
  OU: 'Galicia',
  P:  'Castilla y León',
  PM: 'Illes Balears',
  PO: 'Galicia',
  S:  'Cantabria',
  SA: 'Castilla y León',
  SE: 'Andalucía',
  SG: 'Castilla y León',
  SO: 'Castilla y León',
  SS: 'País Vasco',
  T:  'Cataluña',
  TE: 'Aragón',
  TF: 'Canarias',
  TO: 'Castilla-La Mancha',
  V:  'Comunidad Valenciana',
  VA: 'Castilla y León',
  VI: 'País Vasco',
  Z:  'Aragón',
  ZA: 'Castilla y León',
};

function normalizeProvince(code) {
  return PROVINCE_MAP[code] || code;
}

function normalizeComunidad(code) {
  if (!(code in PROVINCIA_TO_COMUNIDAD)) {
    console.warn(`WARN: Código de provincia desconocido: "${code}"`);
    return code;
  }
  return PROVINCIA_TO_COMUNIDAD[code];
}

function normalizeModel(marca, modelo) {
  const exact = BRAND_EXACT[marca]?.[modelo];
  if (exact) return exact;
  for (const [prefix, canonical] of (BRAND_PREFIX[marca] || [])) {
    if (modelo.startsWith(prefix)) return canonical;
  }
  return modelo;
}

module.exports = { BRAND_EXACT, BRAND_PREFIX, PROVINCE_MAP, PROVINCIA_TO_COMUNIDAD, normalizeModel, normalizeProvince, normalizeComunidad };

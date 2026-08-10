#!/usr/bin/env node
'use strict';

/**
 * Análisis exploratorio de datos: matriculaciones de motos vs renta,
 * clima, precio y etiquetas. Vuelca todos los agregados/correlaciones a un
 * único JSON que consume el generador de informe (build-informe-html.js).
 * Es de un solo uso para este informe — no forma parte del pipeline ETL.
 *
 * Ventana de análisis: 24 meses exactos, agosto 2024 a julio 2026, para que
 * el periodo sea estable y completamente comparable (año 1 vs año 2, 12
 * meses cada uno) en vez de años naturales con 2026 a medias.
 */

const { openDatabase } = require('./lib/sqlite-store');

const PERIODO_INI = '2024-08-01';
const PERIODO_FIN = '2026-07-31';
const ANIO1_FIN = '2025-07-31'; // Año 1: ago 2024 – jul 2025
const ANIO2_INI = '2025-08-01'; // Año 2: ago 2025 – jul 2026
const ANIO1_LABEL = 'Año 1 (ago 2024–jul 2025)';
const ANIO2_LABEL = 'Año 2 (ago 2025–jul 2026)';
const WHERE_PERIODO = `DIA_ORIGEN BETWEEN '${PERIODO_INI}' AND '${PERIODO_FIN}'`;
const CASE_ANIO = `CASE WHEN DIA_ORIGEN <= '${ANIO1_FIN}' THEN '${ANIO1_LABEL}' ELSE '${ANIO2_LABEL}' END`;

function pearson(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (const [x, y] of pairs) {
    cov += (x - mx) * (y - my);
    vx += (x - mx) ** 2;
    vy += (y - my) ** 2;
  }
  if (vx === 0 || vy === 0) return null;
  return { r: cov / Math.sqrt(vx * vy), n, mx, my };
}

/**
 * Correlación de Pearson ponderada — cada provincia/municipio cuenta según
 * su población, no como 1 punto igual a los demás. Sin esto, Ceuta (83.000
 * hab.) pesa lo mismo que Madrid (6,8M) en el promedio, lo que puede
 * distorsionar bastante el resultado cuando hay provincias muy pequeñas con
 * tasas per cápita ruidosas (poca población en el denominador).
 * triples = [[x, y, peso], ...]
 */
function pearsonWeighted(triples) {
  const n = triples.length;
  if (n < 3) return null;
  const W = triples.reduce((s, [, , w]) => s + w, 0);
  const mx = triples.reduce((s, [x, , w]) => s + x * w, 0) / W;
  const my = triples.reduce((s, [, y, w]) => s + y * w, 0) / W;
  let cov = 0, vx = 0, vy = 0;
  for (const [x, y, w] of triples) {
    cov += w * (x - mx) * (y - my);
    vx += w * (x - mx) ** 2;
    vy += w * (y - my) ** 2;
  }
  if (vx === 0 || vy === 0) return null;
  return { r: cov / Math.sqrt(vx * vy), n, mx, my };
}

function linreg(pairs) {
  const n = pairs.length;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of pairs) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  return { a, b };
}

function main() {
  const db = openDatabase();
  const out = {};

  // ---------------------------------------------------------------
  // 0. Panorama general
  // ---------------------------------------------------------------
  out.resumen = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM matriculaciones_moto WHERE ${WHERE_PERIODO}) AS total_matriculaciones,
      (SELECT COUNT(*) FROM vehiculos) AS total_modelos,
      (SELECT COUNT(*) FROM vehiculos WHERE PRECIO IS NOT NULL) AS modelos_con_precio,
      (SELECT COUNT(DISTINCT MARCA_ITV_NORMALIZADO) FROM matriculaciones_moto WHERE ${WHERE_PERIODO}) AS total_marcas
  `).get();
  out.resumen.desde = PERIODO_INI;
  out.resumen.hasta = PERIODO_FIN;

  out.matriculaciones_por_periodo = db.prepare(`
    SELECT ${CASE_ANIO} periodo, COUNT(*) n
    FROM matriculaciones_moto
    WHERE ${WHERE_PERIODO}
    GROUP BY periodo ORDER BY periodo
  `).all();

  // Cada mes natural aparece exactamente 2 veces dentro de la ventana de 24
  // meses (p.ej. agosto: 2024 y 2025), lo que hace la estacionalidad
  // directamente comparable mes a mes sin sesgo de años parciales.
  out.matriculaciones_por_mes = db.prepare(`
    SELECT substr(DIA_ORIGEN,6,2) mes, COUNT(*) n
    FROM matriculaciones_moto
    WHERE ${WHERE_PERIODO}
    GROUP BY mes ORDER BY mes
  `).all();

  // ---------------------------------------------------------------
  // 1. Renta vs matriculaciones per cápita (municipio)
  // ---------------------------------------------------------------
  const rentaMuni = db.prepare(`
    SELECT mu.id, mu.POBLACION_2023 pob, mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 renta,
           COUNT(m.id) matriculaciones
    FROM municipios mu
    LEFT JOIN matriculaciones_moto m ON m.MUNICIPIO_ID = mu.id AND m.${WHERE_PERIODO}
    WHERE mu.POBLACION_2023 >= 500 AND mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 IS NOT NULL
    GROUP BY mu.id
  `).all();

  const rentaVsPerCapita = rentaMuni
    .map((r) => [r.renta, (r.matriculaciones / r.pob) * 1000])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  out.renta_vs_matriculaciones_percapita = {
    correlacion: pearson(rentaVsPerCapita),
    regresion: linreg(rentaVsPerCapita),
    n_municipios: rentaMuni.length,
    muestra: rentaMuni
      .map((r) => ({ id: r.id, renta: r.renta, pob: r.pob, matriculaciones: r.matriculaciones, per_1000: +((r.matriculaciones / r.pob) * 1000).toFixed(3) }))
      .filter((r) => Number.isFinite(r.per_1000)),
  };

  // Por provincia (agregado, más estable que municipio a municipio). Se
  // agregan municipios y matriculaciones en dos consultas separadas y se
  // combinan en JS — unirlas directamente y sumar población habría
  // multiplicado cada municipio por su nº de matriculaciones (fan-out del
  // LEFT JOIN sobre una tabla de detalle).
  out.renta_vs_matriculaciones_provincia = (() => {
    const porMuni = db.prepare(`
      SELECT p.id, p.NOMBRE_PROVINCIA nombre, SUM(mu.POBLACION_2023) pob,
             AVG(mu.RENTA_NETA_MEDIA_POR_PERSONA_2023) renta_media
      FROM provincia p JOIN municipios mu ON mu.PROVINCIA_ID = p.id
      GROUP BY p.id
    `).all();
    const matPorProvincia = Object.fromEntries(db.prepare(`
      SELECT mu.PROVINCIA_ID id, COUNT(*) n
      FROM matriculaciones_moto m JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      WHERE m.${WHERE_PERIODO}
      GROUP BY mu.PROVINCIA_ID
    `).all().map((r) => [r.id, r.n]));
    return porMuni
      .map((r) => ({ ...r, renta_media: Math.round(r.renta_media), matriculaciones: matPorProvincia[r.id] || 0 }))
      .map((r) => ({ ...r, per_1000: +((r.matriculaciones / r.pob) * 1000).toFixed(3) }))
      .sort((a, b) => b.matriculaciones - a.matriculaciones);
  })();

  // ---------------------------------------------------------------
  // 2. Renta vs precio medio de la moto matriculada
  // ---------------------------------------------------------------
  const precioRenta = db.prepare(`
    SELECT mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 renta, v.PRECIO precio
    FROM matriculaciones_moto m
    JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
    JOIN vehiculos v ON v.id = m.VEHICULO_ID
    WHERE mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 IS NOT NULL AND v.PRECIO IS NOT NULL AND m.${WHERE_PERIODO}
  `).all();
  out.renta_vs_precio = {
    correlacion: pearson(precioRenta.map((r) => [r.renta, r.precio])),
    n: precioRenta.length,
  };

  // Precio medio por quintil de renta (municipio del comprador)
  out.precio_por_quintil_renta = (() => {
    const rows = db.prepare(`
      SELECT mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 renta, v.PRECIO precio
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      JOIN vehiculos v ON v.id = m.VEHICULO_ID
      WHERE mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 IS NOT NULL AND v.PRECIO IS NOT NULL AND m.${WHERE_PERIODO}
      ORDER BY mu.RENTA_NETA_MEDIA_POR_PERSONA_2023
    `).all();
    const n = rows.length;
    const qs = [0, 1, 2, 3, 4].map((q) => rows.slice(Math.floor(q * n / 5), Math.floor((q + 1) * n / 5)));
    return qs.map((slice, i) => ({
      quintil: i + 1,
      renta_min: slice[0].renta,
      renta_max: slice[slice.length - 1].renta,
      precio_medio: +(slice.reduce((s, r) => s + r.precio, 0) / slice.length).toFixed(0),
      n: slice.length,
    }));
  })();

  // ---------------------------------------------------------------
  // 3. Clima vs tipo de vehículo (tags) por provincia
  // ---------------------------------------------------------------
  const climaProvincia = db.prepare(`
    SELECT id, NOMBRE_PROVINCIA nombre, TEMPERATURA_MEDIA_ANUAL_1991_2020 temp,
           PRECIPITACION_ANUAL_1991_2020 precip
    FROM provincia
  `).all();
  out.clima_provincia = climaProvincia;

  function tagShareByProvincia(tagName) {
    return db.prepare(`
      SELECT mu.PROVINCIA_ID provincia,
             SUM(CASE WHEN vt.TAG_ID IS NOT NULL THEN 1 ELSE 0 END) con_tag,
             COUNT(*) total
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      JOIN vehiculos v ON v.id = m.VEHICULO_ID
      LEFT JOIN vehiculo_tags vt ON vt.VEHICULO_ID = v.id AND vt.TAG_ID = (SELECT id FROM tags WHERE NOMBRE = ?)
      WHERE m.${WHERE_PERIODO}
      GROUP BY mu.PROVINCIA_ID
    `).all(tagName);
  }

  const climaMap = Object.fromEntries(climaProvincia.map((p) => [p.id, p]));

  function correlateTagWithClima(tagName, climaField) {
    const shares = tagShareByProvincia(tagName);
    const pairs = shares
      .filter((s) => s.total >= 200 && climaMap[s.provincia])
      .map((s) => [climaMap[s.provincia][climaField], s.con_tag / s.total]);
    return { correlacion: pearson(pairs), n_provincias: pairs.length };
  }

  out.clima_vs_tags = {
    scooter_vs_temp: correlateTagWithClima('Scooter', 'temp'),
    trail_vs_temp: correlateTagWithClima('Trail', 'temp'),
    trail_vs_precip: correlateTagWithClima('Trail', 'precip'),
    offroad_vs_precip: correlateTagWithClima('Off-road/Aventura', 'precip'),
    urbana_vs_temp: correlateTagWithClima('Urbana', 'temp'),
  };

  // Detalle por provincia para el scatter Scooter% vs temperatura
  out.scooter_share_por_provincia = (() => {
    const shares = tagShareByProvincia('Scooter');
    return shares
      .filter((s) => s.total >= 100 && climaMap[s.provincia])
      .map((s) => ({
        provincia: climaMap[s.provincia].nombre,
        temp: climaMap[s.provincia].temp,
        precip: climaMap[s.provincia].precip,
        scooter_pct: +((s.con_tag / s.total) * 100).toFixed(1),
        total: s.total,
      }))
      .sort((a, b) => b.scooter_pct - a.scooter_pct);
  })();

  out.trail_share_por_provincia = (() => {
    const shares = tagShareByProvincia('Trail');
    return shares
      .filter((s) => s.total >= 100 && climaMap[s.provincia])
      .map((s) => ({
        provincia: climaMap[s.provincia].nombre,
        temp: climaMap[s.provincia].temp,
        precip: climaMap[s.provincia].precip,
        trail_pct: +((s.con_tag / s.total) * 100).toFixed(1),
        total: s.total,
      }))
      .sort((a, b) => b.trail_pct - a.trail_pct);
  })();

  // ---------------------------------------------------------------
  // 4. Estacionalidad vs temperatura
  // ---------------------------------------------------------------
  const MES_TEMP_COLS = [
    'TEMPERATURA_MEDIA_ENERO_1991_2020', 'TEMPERATURA_MEDIA_FEBRERO_1991_2020', 'TEMPERATURA_MEDIA_MARZO_1991_2020',
    'TEMPERATURA_MEDIA_ABRIL_1991_2020', 'TEMPERATURA_MEDIA_MAYO_1991_2020', 'TEMPERATURA_MEDIA_JUNIO_1991_2020',
    'TEMPERATURA_MEDIA_JULIO_1991_2020', 'TEMPERATURA_MEDIA_AGOSTO_1991_2020', 'TEMPERATURA_MEDIA_SEPTIEMBRE_1991_2020',
    'TEMPERATURA_MEDIA_OCTUBRE_1991_2020', 'TEMPERATURA_MEDIA_NOVIEMBRE_1991_2020', 'TEMPERATURA_MEDIA_DICIEMBRE_1991_2020',
  ];
  const tempNacionalPorMes = db.prepare(`SELECT ${MES_TEMP_COLS.map((c) => `AVG("${c}")`).join(', ')} FROM provincia`).get();
  const tempPorMes = Object.values(tempNacionalPorMes);
  const matPorMes = Object.fromEntries(out.matriculaciones_por_mes.map((r) => [parseInt(r.mes, 10), r.n]));
  out.estacionalidad = {
    correlacion: pearson(tempPorMes.map((t, i) => [t, matPorMes[i + 1] || 0])),
    meses: tempPorMes.map((t, i) => ({ mes: i + 1, temp_media_nacional: +t.toFixed(1), matriculaciones: matPorMes[i + 1] || 0 })),
  };

  // ---------------------------------------------------------------
  // 5. Top marcas y modelos
  // ---------------------------------------------------------------
  out.top_marcas = db.prepare(`
    SELECT MARCA_ITV_NORMALIZADO marca, COUNT(*) n
    FROM matriculaciones_moto
    WHERE ${WHERE_PERIODO}
    GROUP BY marca ORDER BY n DESC LIMIT 15
  `).all();

  out.top_marcas_por_ccaa = db.prepare(`
    SELECT ca.NOMBRE_COMUNIDAD_AUTONOMA ccaa, m.MARCA_ITV_NORMALIZADO marca, COUNT(*) n
    FROM matriculaciones_moto m
    JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
    JOIN comunidad_autonoma ca ON ca.id = mu.COMUNIDAD_AUTONOMA_ID
    WHERE m.${WHERE_PERIODO}
    GROUP BY ca.id, marca
  `).all();
  // Reduce a la marca líder por CCAA en JS (evita window functions en node:sqlite)
  out.marca_lider_por_ccaa = (() => {
    const byCcaa = new Map();
    for (const r of out.top_marcas_por_ccaa) {
      const cur = byCcaa.get(r.ccaa);
      if (!cur || r.n > cur.n) byCcaa.set(r.ccaa, r);
    }
    return [...byCcaa.values()].sort((a, b) => b.n - a.n);
  })();
  delete out.top_marcas_por_ccaa;

  // ---------------------------------------------------------------
  // 6. Eléctrico: adopción vs renta
  // ---------------------------------------------------------------
  out.electrico_vs_renta = (() => {
    const rows = db.prepare(`
      SELECT mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 renta, m.COD_PROPULSION_ITV cod
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      WHERE mu.RENTA_NETA_MEDIA_POR_PERSONA_2023 IS NOT NULL AND m.${WHERE_PERIODO}
    `).all();
    const n = rows.length;
    const sorted = rows.slice().sort((a, b) => a.renta - b.renta);
    const qs = [0, 1, 2, 3, 4].map((q) => sorted.slice(Math.floor(q * n / 5), Math.floor((q + 1) * n / 5)));
    return qs.map((slice, i) => ({
      quintil: i + 1,
      renta_media: +(slice.reduce((s, r) => s + r.renta, 0) / slice.length).toFixed(0),
      pct_electrico: +((slice.filter((r) => r.cod === '2').length / slice.length) * 100).toFixed(2),
      n: slice.length,
    }));
  })();

  // ---------------------------------------------------------------
  // 7. Precio vs potencia (POTENCIA_ITV en vehiculos, vía key) — catálogo,
  // no depende de la ventana temporal de matriculaciones.
  // ---------------------------------------------------------------
  out.precio_vs_potencia = (() => {
    const rows = db.prepare(`SELECT POTENCIA_ITV pot, PRECIO precio FROM vehiculos WHERE PRECIO IS NOT NULL`).all();
    const pairs = rows.map((r) => [parseFloat(r.pot), r.precio]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    return {
      correlacion: pearson(pairs),
      regresion: linreg(pairs),
      n: pairs.length,
      puntos: pairs.map(([kw, precio]) => ({ kw, precio })),
    };
  })();

  // ---------------------------------------------------------------
  // 8. Tags más frecuentes y coocurrencias curiosas
  // ---------------------------------------------------------------
  out.top_tags = db.prepare(`
    SELECT t.NOMBRE nombre, t.CATEGORIA categoria, COUNT(*) n
    FROM vehiculo_tags vt
    JOIN tags t ON t.id = vt.TAG_ID
    JOIN matriculaciones_moto m ON m.VEHICULO_ID = vt.VEHICULO_ID
    WHERE m.${WHERE_PERIODO}
    GROUP BY t.id
    ORDER BY n DESC
  `).all();

  // Precio medio por tag (catálogo — no depende de la ventana temporal)
  out.precio_medio_por_tag = db.prepare(`
    SELECT t.NOMBRE nombre, t.CATEGORIA categoria, ROUND(AVG(v.PRECIO)) precio_medio, COUNT(*) n
    FROM vehiculo_tags vt
    JOIN tags t ON t.id = vt.TAG_ID
    JOIN vehiculos v ON v.id = vt.VEHICULO_ID
    WHERE v.PRECIO IS NOT NULL
    GROUP BY t.id
    HAVING n >= 3
    ORDER BY precio_medio DESC
  `).all();

  // ---------------------------------------------------------------
  // 9. Comunidades autónomas: ranking per cápita
  // ---------------------------------------------------------------
  out.ccaa_ranking = (() => {
    const porMuni = db.prepare(`
      SELECT ca.id, ca.NOMBRE_COMUNIDAD_AUTONOMA nombre, SUM(mu.POBLACION_2023) pob,
             AVG(mu.RENTA_NETA_MEDIA_POR_PERSONA_2023) renta_media
      FROM comunidad_autonoma ca JOIN municipios mu ON mu.COMUNIDAD_AUTONOMA_ID = ca.id
      GROUP BY ca.id
    `).all();
    const matPorCcaa = Object.fromEntries(db.prepare(`
      SELECT mu.COMUNIDAD_AUTONOMA_ID id, COUNT(*) n
      FROM matriculaciones_moto m JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      WHERE m.${WHERE_PERIODO}
      GROUP BY mu.COMUNIDAD_AUTONOMA_ID
    `).all().map((r) => [r.id, r.n]));
    return porMuni
      .map((r) => ({ ...r, renta_media: Math.round(r.renta_media), matriculaciones: matPorCcaa[r.id] || 0 }))
      .map((r) => ({ ...r, per_1000: +((r.matriculaciones / r.pob) * 1000).toFixed(3) }))
      .sort((a, b) => b.matriculaciones - a.matriculaciones);
  })();

  // ---------------------------------------------------------------
  // 10. Adopción (matriculaciones per cápita) vs clima, a nivel provincia
  // ---------------------------------------------------------------
  out.adopcion_vs_clima = (() => {
    const pairs = out.renta_vs_matriculaciones_provincia
      .filter((r) => climaMap[r.id])
      .map((r) => ({ ...r, temp: climaMap[r.id].temp, precip: climaMap[r.id].precip }));
    return {
      // Sin ponderar (cada provincia = 1 punto, sea Ceuta o Madrid) — se
      // conserva para comparar con la versión ponderada.
      per1000_vs_temp_sinponderar: pearson(pairs.map((r) => [r.temp, r.per_1000])),
      per1000_vs_renta_sinponderar: pearson(pairs.map((r) => [r.renta_media, r.per_1000])),
      // Ponderada por población — la que se usa en el informe.
      per1000_vs_temp: pearsonWeighted(pairs.map((r) => [r.temp, r.per_1000, r.pob])),
      per1000_vs_precip: pearsonWeighted(pairs.map((r) => [r.precip, r.per_1000, r.pob])),
      per1000_vs_renta: pearsonWeighted(pairs.map((r) => [r.renta_media, r.per_1000, r.pob])),
      per1000_vs_poblacion: pearsonWeighted(pairs.map((r) => [Math.log(r.pob), r.per_1000, r.pob])),
      detalle: pairs.map((r) => ({ provincia: r.nombre, temp: r.temp, precip: r.precip, renta_media: r.renta_media, per_1000: r.per_1000, pob: r.pob })),
    };
  })();

  // ---------------------------------------------------------------
  // 11. Tamaño de población del municipio: ciudad grande vs pueblo pequeño
  // ---------------------------------------------------------------
  out.tamano_poblacion = (() => {
    const BUCKETS = [
      ['Gran ciudad (100.000+ hab.)', 100000, Infinity],
      ['Ciudad media (20.000–100.000 hab.)', 20000, 100000],
      ['Pueblo grande (5.000–20.000 hab.)', 5000, 20000],
      ['Pueblo pequeño (menos de 5.000 hab.)', 0, 5000],
    ];
    const rows = db.prepare(`
      SELECT mu.POBLACION_2023 pob, m.COD_PROPULSION_ITV cod, m.VEHICULO_ID vehiculo_id
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      WHERE mu.POBLACION_2023 IS NOT NULL AND m.${WHERE_PERIODO}
    `).all();
    const scooterTagId = db.prepare("SELECT id FROM tags WHERE NOMBRE = 'Scooter'").get().id;
    const trailTagId = db.prepare("SELECT id FROM tags WHERE NOMBRE = 'Trail'").get().id;
    const precioPorVehiculo = new Map(db.prepare('SELECT id, PRECIO FROM vehiculos WHERE PRECIO IS NOT NULL').all().map((v) => [v.id, v.PRECIO]));
    // vehiculo_id -> tiene tag (evita miles de queries individuales)
    const vehiculosConScooter = new Set(db.prepare('SELECT VEHICULO_ID FROM vehiculo_tags WHERE TAG_ID = ?').all(scooterTagId).map((r) => r.VEHICULO_ID));
    const vehiculosConTrail = new Set(db.prepare('SELECT VEHICULO_ID FROM vehiculo_tags WHERE TAG_ID = ?').all(trailTagId).map((r) => r.VEHICULO_ID));

    return BUCKETS.map(([label, min, max]) => {
      const slice = rows.filter((r) => r.pob >= min && r.pob < max);
      const conPrecio = slice.filter((r) => precioPorVehiculo.has(r.vehiculo_id));
      return {
        bucket: label,
        n: slice.length,
        pct_electrico: +((slice.filter((r) => r.cod === '2').length / slice.length) * 100).toFixed(2),
        pct_scooter: +((slice.filter((r) => vehiculosConScooter.has(r.vehiculo_id)).length / slice.length) * 100).toFixed(1),
        pct_trail: +((slice.filter((r) => vehiculosConTrail.has(r.vehiculo_id)).length / slice.length) * 100).toFixed(1),
        precio_medio: conPrecio.length ? Math.round(conPrecio.reduce((s, r) => s + precioPorVehiculo.get(r.vehiculo_id), 0) / conPrecio.length) : null,
      };
    });
  })();

  // ---------------------------------------------------------------
  // 12. CO2 de las motos de combustión: año 1 vs año 2
  // ---------------------------------------------------------------
  out.co2_por_periodo = db.prepare(`
    SELECT ${CASE_ANIO} periodo, ROUND(AVG(CAST(CO2_ITV AS REAL)), 1) co2_medio, COUNT(*) n
    FROM matriculaciones_moto
    WHERE CO2_ITV IS NOT NULL AND CO2_ITV != '' AND COD_PROPULSION_ITV = '0' AND ${WHERE_PERIODO}
    GROUP BY periodo ORDER BY periodo
  `).all();

  // ---------------------------------------------------------------
  // 13. Particulares vs empresas (PERSONA_FISICA_JURIDICA, SERVICIO,
  // RENTING) — campos documentados en MATRICULACIONES_MATRABA.md:
  // PERSONA_FISICA_JURIDICA: D = física (particular), X = jurídica (empresa)
  // SERVICIO: A01 = alquiler sin conductor (motosharing / rent-a-bike)
  // RENTING: S = vehículo en renting
  // ---------------------------------------------------------------
  out.persona_juridica = (() => {
    const totales = db.prepare(`
      SELECT PERSONA_FISICA_JURIDICA cod, COUNT(*) n
      FROM matriculaciones_moto WHERE ${WHERE_PERIODO} GROUP BY cod
    `).all();
    const total = totales.reduce((s, r) => s + r.n, 0);
    const nJuridica = totales.find((r) => r.cod === 'X')?.n || 0;

    const precioMedio = db.prepare(`
      SELECT m.PERSONA_FISICA_JURIDICA cod, ROUND(AVG(v.PRECIO)) precio_medio, COUNT(*) n
      FROM matriculaciones_moto m JOIN vehiculos v ON v.id = m.VEHICULO_ID AND v.PRECIO IS NOT NULL
      WHERE m.${WHERE_PERIODO}
      GROUP BY cod
    `).all();

    const porCcaa = db.prepare(`
      SELECT ca.NOMBRE_COMUNIDAD_AUTONOMA ccaa, COUNT(*) n,
             SUM(CASE WHEN m.PERSONA_FISICA_JURIDICA = 'X' THEN 1 ELSE 0 END) n_juridica
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      JOIN comunidad_autonoma ca ON ca.id = mu.COMUNIDAD_AUTONOMA_ID
      WHERE m.${WHERE_PERIODO}
      GROUP BY ca.id HAVING n > 1000
      ORDER BY (n_juridica * 1.0 / n) DESC
    `).all().map((r) => ({ ccaa: r.ccaa, n: r.n, pct_juridica: +((r.n_juridica / r.n) * 100).toFixed(1) }));

    // El "misterio de Madrid": Yamaha superaba a Honda en el ranking global
    // de esa comunidad (ver marca_lider_por_ccaa). Desglosando por tipo de
    // titular se ve por qué.
    const marcasMadrid = db.prepare(`
      SELECT m.MARCA_ITV_NORMALIZADO marca,
             SUM(CASE WHEN m.PERSONA_FISICA_JURIDICA = 'D' THEN 1 ELSE 0 END) fisica,
             SUM(CASE WHEN m.PERSONA_FISICA_JURIDICA = 'X' THEN 1 ELSE 0 END) juridica
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      JOIN comunidad_autonoma ca ON ca.id = mu.COMUNIDAD_AUTONOMA_ID
      WHERE ca.NOMBRE_COMUNIDAD_AUTONOMA = 'Madrid, Comunidad de' AND m.${WHERE_PERIODO}
        AND m.MARCA_ITV_NORMALIZADO IN ('HONDA','YAMAHA','BMW','PIAGGIO','ZONTES','KTM')
      GROUP BY marca
      ORDER BY (fisica + juridica) DESC
    `).all();

    const alquilerSinConductor = db.prepare(`
      SELECT p.NOMBRE_PROVINCIA provincia, COUNT(*) n
      FROM matriculaciones_moto m
      JOIN municipios mu ON mu.id = m.MUNICIPIO_ID
      JOIN provincia p ON p.id = mu.PROVINCIA_ID
      WHERE m.SERVICIO = 'A01' AND m.${WHERE_PERIODO}
      GROUP BY p.id ORDER BY n DESC LIMIT 8
    `).all();
    const totalAlquilerSinConductor = db.prepare(`SELECT COUNT(*) n FROM matriculaciones_moto WHERE SERVICIO = 'A01' AND ${WHERE_PERIODO}`).get().n;

    const renting = db.prepare(`SELECT RENTING cod, COUNT(*) n FROM matriculaciones_moto WHERE RENTING IS NOT NULL AND ${WHERE_PERIODO} GROUP BY cod`).all();

    return {
      total, n_fisica: total - nJuridica, n_juridica: nJuridica, pct_juridica: +((nJuridica / total) * 100).toFixed(1),
      precio_medio_fisica: precioMedio.find((r) => r.cod === 'D')?.precio_medio,
      precio_medio_juridica: precioMedio.find((r) => r.cod === 'X')?.precio_medio,
      por_ccaa: porCcaa,
      marcas_madrid: marcasMadrid,
      alquiler_sin_conductor: alquilerSinConductor,
      alquiler_sin_conductor_total: totalAlquilerSinConductor,
      renting_pct: +((renting.find((r) => r.cod === 'S')?.n || 0) / total * 100).toFixed(2),
    };
  })();

  // ---------------------------------------------------------------
  // 14. El ascenso de las marcas chinas (serie histórica Zontes/Voge)
  // ---------------------------------------------------------------
  out.marcas_chinas = (() => {
    const MARCAS_CHINAS = ['ZONTES', 'VOGE', 'QJMOTOR', 'CFMOTO', 'KEEWAY', 'MACBOR', 'KOVE', 'CYCLONE', 'MITT', 'BENDA', 'WOTTAN'];
    const placeholders = MARCAS_CHINAS.map(() => '?').join(',');

    const serieMensual = db.prepare(`
      SELECT substr(DIA_ORIGEN,1,7) ym,
        SUM(CASE WHEN MARCA_ITV_NORMALIZADO = 'ZONTES' THEN 1 ELSE 0 END) zontes,
        SUM(CASE WHEN MARCA_ITV_NORMALIZADO = 'VOGE' THEN 1 ELSE 0 END) voge,
        COUNT(*) total
      FROM matriculaciones_moto
      WHERE ${WHERE_PERIODO}
      GROUP BY ym ORDER BY ym
    `).all();

    // Año 1 vs año 2: dos periodos de 12 meses exactos, 100% comparables.
    const porPeriodo = db.prepare(`
      SELECT ${CASE_ANIO} periodo,
        SUM(CASE WHEN MARCA_ITV_NORMALIZADO = 'ZONTES' THEN 1 ELSE 0 END) zontes,
        SUM(CASE WHEN MARCA_ITV_NORMALIZADO = 'VOGE' THEN 1 ELSE 0 END) voge,
        SUM(CASE WHEN MARCA_ITV_NORMALIZADO IN (${placeholders}) THEN 1 ELSE 0 END) chinas,
        COUNT(*) total
      FROM matriculaciones_moto
      WHERE ${WHERE_PERIODO}
      GROUP BY periodo ORDER BY periodo
    `).all(...MARCAS_CHINAS).map((r) => ({
      periodo: r.periodo, total: r.total,
      zontes_pct: +((r.zontes / r.total) * 100).toFixed(2),
      voge_pct: +((r.voge / r.total) * 100).toFixed(2),
      chinas_pct: +((r.chinas / r.total) * 100).toFixed(2),
    }));

    const rankingAnio2 = db.prepare(`
      SELECT MARCA_ITV_NORMALIZADO marca, COUNT(*) n
      FROM matriculaciones_moto WHERE DIA_ORIGEN >= '${ANIO2_INI}' AND DIA_ORIGEN <= '${PERIODO_FIN}'
      GROUP BY marca ORDER BY n DESC LIMIT 8
    `).all();

    return { serie_mensual: serieMensual, por_periodo_comparable: porPeriodo, ranking_anio2: rankingAnio2 };
  })();

  db.close();

  console.log(JSON.stringify(out, null, 2));
}

main();

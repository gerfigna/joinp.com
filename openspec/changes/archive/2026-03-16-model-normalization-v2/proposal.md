# Proposal: Model Normalization v2 — Commercial Names for Top-Registered Models

## Intent

Los datos DGT usan códigos técnicos ITV como `CB750A`, `ADV350A`, `MTN125-A` o `UB125L` que no son reconocibles por el usuario final. El cambio anterior (`2026-03-06-model-normalization`) estableció la infraestructura data-driven (`BRAND_EXACT` + `BRAND_PREFIX`) y añadió reglas para variantes factory/suffix de marcas como Aprilia, Benelli, BMW, Ducati y KTM.

Este cambio amplía las reglas para convertir los **códigos técnicos más frecuentes** (los que representan los modelos más matriculados) a **nombres comerciales reconocibles**, priorizando por volumen de matriculaciones reales (datos Feb/Mar 2026).

El objetivo es que el dashboard `dgt-matriculaciones-moto` muestre nombres como "CB750 Hornet", "ADV 350", "TMAX 560" o "V-Strom 800" en lugar de "CB750A", "ADV350A", "XP560" o "DL800".

## Scope

### In Scope

- Añadir reglas exact para **HONDA**: códigos ITV → nombres comerciales (modelos con ≥10 matriculaciones/mes)
- Añadir reglas prefix/exact para **YAMAHA**: códigos alfanuméricos → nombres de la gama MT, TMAX, XMAX, YZF
- Añadir reglas exact/prefix para **SUZUKI**: `UB125L` → ADDRESS 125, `DL800`/`DL800U` → V-Strom 800, `UZ125` → AVENIS 125, `GSX800` → GSX-8S, `DL1050` → V-Strom 1050, `AN400` → BURGMAN 400, `GSX-S1000`/`GSX-S1000T`/`GSX-S1000X` → GSX-S 1000
- Actualizar `openspec/specs/microdatos-etl/spec.md` con todas las nuevas reglas
- Eliminar datos históricos en `microdatos-etl/data/` para reproceso completo

### Out of Scope

- Marcas chinas (ZONTES, VOGE, CFMOTO, QJMOTOR, RIEJU): sus códigos son ya nombres de producto directos (368G, DS800X RALLY, 450MT) — no requieren normalización
- KAWASAKI: sus modelos ya aparecen con nombres comerciales legibles (Z900, NINJA 650, ELIMINATOR, VERSYS 650)
- PIAGGIO / VESPA: ya usan nombres comerciales (LIBERTY 125 ABS, MEDLEY 125, VESPA PRIMAVERA 125)
- Modelos con <5 matriculaciones/mes: impacto estadístico insignificante
- Cambios en el dashboard front-end

## Approach

Aprovechar la infraestructura `BRAND_EXACT` / `BRAND_PREFIX` introducida en `model-normalization`. Añadir entradas a las tablas existentes sin modificar el algoritmo `normalizeModel()`.

**Estrategia por tipo de código:**
- **Códigos alfanuméricos únicos** (ADV350A, CB750A, NSS350A): → regla exact
- **Familias de prefijo** (MTN125, MTT690, MTN890, XP560, CZD300, YZF125, MTN320): → regla prefix para capturar todas las variantes con un solo patrón
- **Variantes de sufijo** (DL800U = DL800 usado, SV650U = SV650 usado): → regla exact separada o prefix

**Prioridad de impacto (matriculaciones Feb 2026):**
1. HONDA ADV350A (339), ADV750 (190), NSS350A (136), NSS750 (115), CB500XA (96), SH350A (92), CB650RA-variants (89+86), CB750A (81), NC750XD/XA (73+29), GB350S (61), CBF125NA (48), CB125F (43), NC750XA (29)
2. YAMAHA MTN125-A (91), XP560/D (80+38), CZD300D-A/CZD300-A (74+62), YZF125-A (53), MTN890 family (31+23+20+18), MTT690 family (20+13+11+...), MTN320-A (13), MTM125 family (12+10)
3. SUZUKI UB125L (61), DL800/DL800U (41+8), UZ125 (23), GSX800 (15), DL1050 (9), AN400 (8), GSX-S1000 family (9+8+4)

### Nuevas reglas propuestas

#### HONDA — Exact rules (añadir a `BRAND_EXACT.HONDA`)

| Código DGT | Nombre comercial |
|---|---|
| `ADV350A` | ADV 350 |
| `ADV750` | ADV 750 |
| `NSS350A` | FORZA 350 |
| `NSS750` | FORZA 750 |
| `SH350A` | SH350i |
| `CB750A` | CB750 Hornet |
| `CB500XA` | CB 500 X |
| `CB500FA` | CB 500 F |
| `CBR650RAC` | CBR 650 R |
| `GB350S` | GB350S |
| `CBF125NA` | CBF 125 |
| `CB125F` | CB 125 F |
| `CL500A` | CL500 |
| `CRF300LA` | CRF 300 L |
| `CMX500A` | Rebel 500 |
| `CMX500A2` | Rebel 500 |

#### HONDA — Prefix rules (añadir a `BRAND_PREFIX.HONDA`)

| Prefijo | Canónico |
|---|---|
| `NC750X` | NC 750 X |

> Nota: `NC750XD` y `NC750XA` comparten prefijo `NC750X` → se capturan con una sola regla prefix. La regla exact de `NC750XD` no es necesaria.

#### YAMAHA — Exact rules (añadir a `BRAND_EXACT.YAMAHA`)

| Código DGT | Nombre comercial |
|---|---|
| `MTN320-A` | MT-03 |

#### YAMAHA — Prefix rules (añadir a `BRAND_PREFIX.YAMAHA`)

| Prefijo | Canónico |
|---|---|
| `MTN125` | MT-125 |
| `MTM125` | MT-125 |
| `XP560` | TMAX 560 |
| `CZD300` | XMAX 300 |
| `YZF125` | YZF-R125 |
| `MTN890` | MT-09 |
| `MTT690` | MT-07 |
| `MTM690` | MT-07 |
| `YZF890` | YZF-R9 |
| `MTN1000` | MT-10 |
| `MTM890` | MT-09 |

> Nota: `MTT890` y `MTN890` (familias MT-09) se unifican a MT-09. `MTT690`, `MTT690D`, `MTT690-S`, etc (familias MT-07) ya están parcialmente cubiertos por la regla `MTT890`→`MT-09` del cambio anterior — revisar y corregir si hay colisión. La regla `MTN890` puede colisionar con el prefijo `MTT890` ya existente — verificar orden de evaluación.

#### SUZUKI — Brand nuevo en `BRAND_EXACT`

| Código DGT | Nombre comercial |
|---|---|
| `UB125L` | ADDRESS 125 |
| `UZ125` | AVENIS 125 |
| `DL800` | V-Strom 800 |
| `DL800U` | V-Strom 800 |
| `GSX800` | GSX-8S |
| `DL1050` | V-Strom 1050 |
| `AN400` | BURGMAN 400 |

#### SUZUKI — Prefix rules (brand nuevo en `BRAND_PREFIX`)

| Prefijo | Canónico |
|---|---|
| `GSX-S1000` | GSX-S 1000 |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `microdatos-etl/download-microdatos.js` | Modified | Añadir entradas a `BRAND_EXACT` (HONDA, YAMAHA, SUZUKI) y `BRAND_PREFIX` (HONDA, YAMAHA, SUZUKI nuevo) |
| `openspec/specs/microdatos-etl/spec.md` | Modified | Actualizar la sección "Model normalization by brand" con todas las nuevas reglas exact y prefix |
| `microdatos-etl/data/` | Deleted + Regenerated | Eliminar todos los CSV diarios y acumulados para reproceso completo con las nuevas reglas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prefijo YAMAHA demasiado amplio (e.g. `MTN890` captura `MTN890D`, `MTN890-U`, `MTN890D-U`) | Low | Todos son variantes del MT-09 — intencionado y correcto |
| Colisión entre reglas prefix existentes y nuevas en YAMAHA (`MTT890`→`MT-09` vs nuevas `MTT690`→`MT-07`) | Med | Revisar orden en `BRAND_PREFIX.YAMAHA`; los prefijos son distintos (`MTT890` vs `MTT690`) — no colisionan |
| `CB650RA` (regla prefix existente captura `CB650RA` completo) conflicto con `CBR650RAC` (exact nueva) | Low | Exact tiene precedencia sobre prefix — `CBR650RAC` se mapeará antes que el prefix `CB650RA` |
| Datos históricos inconsistentes si no se reprocesa | Med | Eliminar todos los CSV en `microdatos-etl/data/` antes del siguiente run del ETL |
| Código DGT `GB350S` podría cambiar en futuros lotes | Low | Monitorizar; si cambia, añadir nueva regla exact |
| `GSX800` puede corresponder a GSX-8S o GSX-8R según la variant | Low | En los datos Feb/Mar 2026 solo aparece `GSX800` — se normaliza a GSX-8S (más común). Revisar si aparece variante R |

## Rollback Plan

1. Revertir los cambios en `microdatos-etl/download-microdatos.js` (git revert o restaurar las tablas `BRAND_EXACT`/`BRAND_PREFIX` al estado anterior)
2. Eliminar todos los CSV en `microdatos-etl/data/` para forzar reproceso
3. Esperar al siguiente ciclo del ETL para regenerar datos con las reglas anteriores

El reproceso completo es necesario en ambos sentidos (aplicar y revertir) dado que los CSV diarios almacenan el modelo ya normalizado.

## Dependencies

- Datos DGT disponibles en el siguiente ciclo del ETL (GitHub Actions cada 6h)
- No hay dependencias externas de librerías

## Success Criteria

- [ ] Los 16 códigos Honda exactos se convierten al nombre comercial en nuevos CSV diarios
- [ ] Las familias Yamaha (MTN125, MTM125, XP560, CZD300, YZF125, MTN890, MTT690, MTM690, YZF890, MTN1000, MTM890) se normalizan a sus nombres comerciales
- [ ] Los 7 códigos Suzuki exactos y la familia GSX-S1000 se normalizan
- [ ] El spec de `microdatos-etl` refleja todas las reglas nuevas
- [ ] Tras reproceso: `acumulado-marca-modelo.csv` de Feb/Mar 2026 ya no contiene códigos como `ADV350A`, `CB750A`, `MTN125-A`, `UB125L`, `DL800`
- [ ] No hay regresión en reglas existentes (YAMAHA NMAX/XMAX/MT-07/MT-09 siguen correctas)
- [ ] El dashboard muestra los nombres comerciales en los tops de modelo por marca

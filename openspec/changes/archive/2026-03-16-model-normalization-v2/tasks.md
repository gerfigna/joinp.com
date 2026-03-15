# Tasks: Model Normalization v2 — Commercial Names for Top-Registered Models

## Phase 1: Code Changes — BRAND_EXACT and BRAND_PREFIX in download-microdatos.js

- [x] 1.1 In `/microdatos-etl/download-microdatos.js`, expand `BRAND_EXACT.HONDA` to add the 16 new exact rules: `ADV350A -> ADV 350`, `ADV750 -> ADV 750`, `NSS350A -> FORZA 350`, `NSS750 -> FORZA 750`, `SH350A -> SH350i`, `CB750A -> CB750 Hornet`, `CB500XA -> CB 500 X`, `CB500FA -> CB 500 F`, `CBR650RAC -> CBR 650 R`, `GB350S -> GB350S`, `CBF125NA -> CBF 125`, `CB125F -> CB 125 F`, `CL500A -> CL500`, `CRF300LA -> CRF 300 L`, `CMX500A -> Rebel 500`, `CMX500A2 -> Rebel 500`

- [x] 1.2 En `/microdatos-etl/download-microdatos.js`, añadir regla de prefijo `NC750X` a `BRAND_PREFIX.HONDA`: `['NC750X', 'NC 750 X']`

- [x] 1.3 En `/microdatos-etl/download-microdatos.js`, expandir `BRAND_EXACT.YAMAHA` con: `MTN320-A -> MT-03`

- [x] 1.4 En `/microdatos-etl/download-microdatos.js`, expandir `BRAND_PREFIX.YAMAHA` con 11 nuevas reglas de prefijo: `['MTN125', 'MT-125']`, `['MTM125', 'MT-125']`, `['XP560', 'TMAX 560']`, `['CZD300', 'XMAX 300']`, `['YZF125', 'YZF-R125']`, `['MTN890', 'MT-09']`, `['MTT690', 'MT-07']`, `['MTM690', 'MT-07']`, `['YZF890', 'YZF-R9']`, `['MTN1000', 'MT-10']`, `['MTM890', 'MT-09']`

- [x] 1.5 En `/microdatos-etl/download-microdatos.js`, añadir `SUZUKI` a `BRAND_EXACT` con 7 reglas exactas: `UB125L -> ADDRESS 125`, `UZ125 -> AVENIS 125`, `DL800 -> V-Strom 800`, `DL800U -> V-Strom 800`, `GSX800 -> GSX-8S`, `DL1050 -> V-Strom 1050`, `AN400 -> BURGMAN 400`

- [x] 1.6 En `/microdatos-etl/download-microdatos.js`, añadir `SUZUKI` a `BRAND_PREFIX` con: `['GSX-S1000', 'GSX-S 1000']`

## Phase 2: Migración de datos históricos

- [x] 2.1 Migrar datos 2026 existentes vía `migrate-2026.js` (Option A — parche directo en CSV diarios + regeneración de agregados). 3,408 filas parcheadas en Feb/Mar 2026.

## Phase 3: Verificación

- [x] 3.1–3.11 Verificación completa realizada en sdd-verify. 22/22 escenarios compliant. Códigos crudos (`ADV350A`, `CB750A`, `MTN125-A`, `UB125L`, `DL800`, etc.) ausentes de los agregados. Sin regresiones en reglas existentes.

## Phase 4: Commit

- [x] 4.1 Commit `66c82f5` — `feat: expand motorcycle model normalization with commercial names`
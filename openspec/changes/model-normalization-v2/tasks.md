# Tasks: Model Normalization v2 — Commercial Names for Top-Registered Models

## Phase 1: Code Changes — BRAND_EXACT and BRAND_PREFIX in download-microdatos.js

- [x] 1.1 In `/microdatos-etl/download-microdatos.js`, expand `BRAND_EXACT.HONDA` to add the 16 new exact rules: `ADV350A -> ADV 350`, `ADV750 -> ADV 750`, `NSS350A -> FORZA 350`, `NSS750 -> FORZA 750`, `SH350A -> SH350i`, `CB750A -> CB750 Hornet`, `CB500XA -> CB 500 X`, `CB500FA -> CB 500 F`, `CBR650RAC -> CBR 650 R`, `GB350S -> GB350S`, `CBF125NA -> CBF 125`, `CB125F -> CB 125 F`, `CL500A -> CL500`, `CRF300LA -> CRF 300 L`, `CMX500A -> Rebel 500`, `CMX500A2 -> Rebel 500`

- [x] 1.2 In `/microdatos-etl/download-microdatos.js`, add `NC750X` prefix rule to `BRAND_PREFIX.HONDA`: `['NC750X', 'NC 750 X']` — append after the existing 6 Honda prefix entries

- [x] 1.3 In `/microdatos-etl/download-microdatos.js`, expand `BRAND_EXACT.YAMAHA` to add the 1 new exact rule: `MTN320-A -> MT-03`

- [x] 1.4 In `/microdatos-etl/download-microdatos.js`, expand `BRAND_PREFIX.YAMAHA` to add 11 new prefix rules (appended after the 4 existing entries): `['MTN125', 'MT-125']`, `['MTM125', 'MT-125']`, `['XP560', 'TMAX 560']`, `['CZD300', 'XMAX 300']`, `['YZF125', 'YZF-R125']`, `['MTN890', 'MT-09']`, `['MTT690', 'MT-07']`, `['MTM690', 'MT-07']`, `['YZF890', 'YZF-R9']`, `['MTN1000', 'MT-10']`, `['MTM890', 'MT-09']`

- [x] 1.5 In `/microdatos-etl/download-microdatos.js`, add a new `SUZUKI` key to `BRAND_EXACT` with 7 exact rules: `UB125L -> ADDRESS 125`, `UZ125 -> AVENIS 125`, `DL800 -> V-Strom 800`, `DL800U -> V-Strom 800`, `GSX800 -> GSX-8S`, `DL1050 -> V-Strom 1050`, `AN400 -> BURGMAN 400`

- [x] 1.6 In `/microdatos-etl/download-microdatos.js`, add a new `SUZUKI` key to `BRAND_PREFIX` with 1 prefix rule: `['GSX-S1000', 'GSX-S 1000']`

## Phase 2: Operational — Reproceso (delete historical data)

- [ ] 2.1 Delete all daily CSV files under `microdatos-etl/data/` (all `YYYY/MM/DD.csv` files) to force full reprocessing. The monthly aggregates (`acumulado-marca-modelo.csv`, `acumulado-marca.csv`, `acumulado-marca-modelo-provincia.csv`) must also be deleted. Only the directory structure may be left in place (or deleted entirely — the ETL recreates it). Verify `microdatos-etl/data/` is empty or does not exist before triggering the ETL.

  > Spec reference: Requirement "Full reproceso after normalization rule changes" — scenario "Reproceso triggered after rule update"

## Phase 3: Verification

- [ ] 3.1 Spot-check HONDA exact rules: confirm `ADV350A -> ADV 350` and `CMX500A2 -> Rebel 500` by running `normalizeModel('HONDA', 'ADV350A')` and `normalizeModel('HONDA', 'CMX500A2')` (or manual inspection of the table). Covers spec scenarios "Honda ITV exact code normalized — high volume" and "Honda ITV exact code normalized — Rebel 500 variant".

- [ ] 3.2 Spot-check HONDA prefix rule: confirm `normalizeModel('HONDA', 'NC750XD')` and `normalizeModel('HONDA', 'NC750XA')` both return `NC 750 X`. Covers spec scenario "Honda prefix rule captures all NC750X variants".

- [ ] 3.3 Verify exact-over-prefix precedence for Honda: confirm `normalizeModel('HONDA', 'CBR650RAC')` returns `CBR 650 R` (exact rule) and NOT `CB650RA` (prefix rule). Covers spec scenario "Honda exact rule takes precedence over prefix — CBR650RAC vs CB650RA prefix".

- [ ] 3.4 Spot-check YAMAHA exact rule: confirm `normalizeModel('YAMAHA', 'MTN320-A')` returns `MT-03`. Covers spec scenario "Yamaha MT-03 exact code normalized".

- [ ] 3.5 Spot-check YAMAHA prefix rules for MT-125 families: confirm `normalizeModel('YAMAHA', 'MTN125-A')` returns `MT-125` and `normalizeModel('YAMAHA', 'MTM125A')` returns `MT-125`. Covers spec scenarios "Yamaha prefix rule captures MT-125 family" and "Yamaha MTM125 prefix also maps to MT-125".

- [ ] 3.6 Spot-check YAMAHA TMAX 560 and XMAX 300: confirm `normalizeModel('YAMAHA', 'XP560D')` returns `TMAX 560` and `normalizeModel('YAMAHA', 'CZD300D-A')` returns `XMAX 300`. Covers spec scenarios "Yamaha TMAX 560 prefix rule" and "Yamaha XMAX 300 prefix rule".

- [ ] 3.7 Verify no prefix shadowing in YAMAHA: confirm `normalizeModel('YAMAHA', 'MTT890-A')` returns `MT-09` (not `MT-07`) and `normalizeModel('YAMAHA', 'MTN890D')` returns `MT-09`. Covers spec scenario "Yamaha prefix rules have no shadowing conflicts".

- [ ] 3.8 Spot-check SUZUKI exact rules: confirm `normalizeModel('SUZUKI', 'UB125L')` returns `ADDRESS 125`, `normalizeModel('SUZUKI', 'DL800')` returns `V-Strom 800`, `normalizeModel('SUZUKI', 'DL800U')` returns `V-Strom 800`. Covers spec scenarios "Suzuki ADDRESS 125 exact code normalized" and "Suzuki V-Strom 800 — both new and used variants".

- [ ] 3.9 Spot-check SUZUKI prefix rule: confirm `normalizeModel('SUZUKI', 'GSX-S1000T')` and `normalizeModel('SUZUKI', 'GSX-S1000X')` both return `GSX-S 1000`. Covers spec scenario "Suzuki GSX-S 1000 prefix rule captures all variants".

- [ ] 3.10 Verify no regression on existing rules: confirm `normalizeModel('YAMAHA', 'GPD125-A')` still returns `NMAX125`, `normalizeModel('YAMAHA', 'MTN690A')` still returns `MT-07`, and `normalizeModel('HONDA', 'WW125A')` still returns `PCX125`. Covers spec scenario "Model matched by exact rule (existing behavior retained)".

- [ ] 3.11 After the ETL reproceso runs, check the generated `acumulado-marca-modelo.csv` for Feb/Mar 2026 to confirm no raw ITV codes appear for the top models: `ADV350A`, `CB750A`, `MTN125-A`, `UB125L`, `DL800` should no longer be present as model names. Covers the success criteria in the proposal.

## Phase 4: Commit

- [ ] 4.1 Commit changes to `microdatos-etl/download-microdatos.js` with a descriptive message (e.g. `feat: add model normalization rules for Honda, Yamaha, Suzuki top models`). Do NOT commit the deleted data files — those are gitignored or managed by the ETL workflow separately.

- [ ] 4.2 Verify that `openspec/changes/model-normalization-v2/specs/microdatos-etl/spec.md` is up to date and accurate after implementation (it was already written as part of the spec phase — no edits expected unless discrepancies are found during 3.x checks).

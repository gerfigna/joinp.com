# Delta for microdatos-etl

## MODIFIED Requirements

### Requirement: Model normalization by brand

The system SHALL normalize `MODELO_ITV` based on `MARCA_ITV`.
Normalization applies two types of rules, evaluated in order: exact match first, then prefix match.

(Previously: exact and prefix rules existed for YAMAHA, HONDA, APRILIA, BENELLI, SYM, BRIXTON, DUCATI, KTM, KYMCO. SUZUKI was not present.)

**Exact rules** (full model string match → canonical):

- For `YAMAHA` (existing rules retained):
  `GPD125D-A -> NMAX 125`, `GPD125-A -> NMAX 125`, `YP125R-DA -> XMAX 125`, `YP125RA -> XMAX 125`, `WR125-A -> WR125`, `LCG125 -> RayZR 125`

- For `YAMAHA` (added):
  `MTN320-A -> MT-03`

- For `HONDA` (existing rules retained):
  `WW125A -> PCX 125`, `WW125S -> PCX 125`, `FSH125 -> SH Mode 125`, `SH125AD -> SH125i`, `NSS125AD -> FORZA125`, `NSC110 -> VISION 110`, `XL750 -> XL750 Transalp`

- For `HONDA` (added):
  `ADV350A -> ADV 350`, `ADV750 -> ADV 750`, `NSS350A -> FORZA 350`, `NSS750 -> FORZA 750`, `SH350A -> SH350i`, `CB750A -> CB750 Hornet`, `CB500XA -> CB 500 X`, `CB500FA -> CB 500 F`, `CBR650RAC -> CBR 650 R`, `GB350S -> GB350S`, `CBF125NA -> CBF 125`, `CB125F -> CB 125 F`, `CL500A -> CL500`, `CRF300LA -> CRF 300 L`, `CMX500A -> Rebel 500`, `CMX500A2 -> Rebel 500`

- For `APRILIA` (existing rules retained):
  `RS 660 FACTORY -> RS 660`, `RSV4 FACTORY -> RSV4`, `TUONO V4 FACTORY -> TUONO V4`, `TUAREG 660 RALLY -> TUAREG 660`

- For `BENELLI` (existing rules retained):
  `BKX 125 S -> BN125`, `TRK 702 35KW -> TRK 702`, `TRK 702X -> TRK 702`, `TRK 702X 35KW -> TRK 702`

- For `SUZUKI` (new brand, added):
  `UB125L -> ADDRESS 125`, `UZ125 -> AVENIS 125`, `DL800 -> V-Strom 800`, `DL800U -> V-Strom 800`, `GSX800 -> GSX-8S`, `DL1050 -> V-Strom 1050`, `AN400 -> BURGMAN 400`

**Prefix rules** (model starts with prefix → canonical):

- For `SYM` (existing):
  prefix `SYMPHONY 125` → `SYMPHONY 125`

- For `YAMAHA` (existing):
  prefix `MTN690` → `MT-07`,
  prefix `MTT890` → `MT-09`,
  prefix `MWS125` → `TRICITY 125`,
  prefix `XTZ690` → `XTZ 700 Tenere`

- For `YAMAHA` (added):
  prefix `MTN125` → `MT-125`,
  prefix `MTM125` → `MT-125`,
  prefix `XP560` → `TMAX 560`,
  prefix `CZD300` → `XMAX 300`,
  prefix `YZF125` → `YZF-R125`,
  prefix `MTN890` → `MT-09`,
  prefix `MTT690` → `MT-07`,
  prefix `MTM690` → `MT-07`,
  prefix `YZF890` → `YZF-R9`,
  prefix `MTN1000` → `MT-10`,
  prefix `MTM890` → `MT-09`

- For `BRIXTON` (existing):
  prefix `CROSSFIRE 500 ` → `CROSSFIRE 500`

- For `DUCATI` (existing):
  prefix `MULTISTRADA V2 ` → `MULTISTRADA V2`,
  prefix `MULTISTRADA V4 ` → `MULTISTRADA V4`,
  prefix `PANIGALE V2 ` → `PANIGALE V2`,
  prefix `PANIGALE V4 ` → `PANIGALE V4`,
  prefix `STREETFIGHTER ` → `STREETFIGHTER`

- For `HONDA` (existing):
  prefix `CB650RA` → `CB650RA`,
  prefix `CBR1000` → `CBR1000`,
  prefix `CBR500` → `CBR500`,
  prefix `CMX1100` → `CMX1100`,
  prefix `CRF1100` → `CRF1100`,
  prefix `NT1100` → `NT1100`

- For `HONDA` (added):
  prefix `NC750X` → `NC 750 X`

- For `KTM` (existing):
  prefix `KTM 250 EXC` → `KTM 250 EXC`,
  prefix `KTM 300 EXC` → `KTM 300 EXC`

- For `KYMCO` (existing):
  prefix `AGILITY S ` → `AGILITY S`

- For `SUZUKI` (new brand, added):
  prefix `GSX-S1000` → `GSX-S 1000`

#### Scenario: Honda ITV exact code normalized — high volume

- GIVEN `MARCA_ITV` = `HONDA`
- WHEN `MODELO_ITV` = `ADV350A`
- THEN `MODELO_ITV` is replaced with `ADV 350`

#### Scenario: Honda ITV exact code normalized — Rebel 500 variant

- GIVEN `MARCA_ITV` = `HONDA`
- WHEN `MODELO_ITV` = `CMX500A` or `CMX500A2`
- THEN `MODELO_ITV` is replaced with `Rebel 500`

#### Scenario: Honda prefix rule captures all NC750X variants

- GIVEN `MARCA_ITV` = `HONDA`
- WHEN `MODELO_ITV` starts with `NC750X` (e.g. `NC750XA`, `NC750XD`)
- THEN `MODELO_ITV` is replaced with `NC 750 X`

#### Scenario: Honda exact rule takes precedence over prefix — CBR650RAC vs CB650RA prefix

- GIVEN `MARCA_ITV` = `HONDA`
- WHEN `MODELO_ITV` = `CBR650RAC`
- THEN the exact rule matches first and `MODELO_ITV` is replaced with `CBR 650 R`
- AND the prefix rule `CB650RA` is NOT applied

#### Scenario: Yamaha MT-03 exact code normalized

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` = `MTN320-A`
- THEN `MODELO_ITV` is replaced with `MT-03`

#### Scenario: Yamaha prefix rule captures MT-125 family

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` starts with `MTN125` (e.g. `MTN125-A`, `MTN125A`)
- THEN `MODELO_ITV` is replaced with `MT-125`

#### Scenario: Yamaha MTM125 prefix also maps to MT-125

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` starts with `MTM125`
- THEN `MODELO_ITV` is replaced with `MT-125`

#### Scenario: Yamaha TMAX 560 prefix rule

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` starts with `XP560` (e.g. `XP560`, `XP560D`)
- THEN `MODELO_ITV` is replaced with `TMAX 560`

#### Scenario: Yamaha XMAX 300 prefix rule

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` starts with `CZD300` (e.g. `CZD300D-A`, `CZD300-A`)
- THEN `MODELO_ITV` is replaced with `XMAX 300`

#### Scenario: Yamaha MT-09 families unified — MTN890 and MTM890

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` starts with `MTN890` or `MTM890`
- THEN `MODELO_ITV` is replaced with `MT-09`

#### Scenario: Yamaha MT-07 families unified — MTT690 and MTM690

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` starts with `MTT690` or `MTM690`
- THEN `MODELO_ITV` is replaced with `MT-07`

#### Scenario: Yamaha prefix rules have no shadowing conflicts

> **Prefix conflict analysis (resolved):** The flagged risk in the proposal — that `MTN890` might collide with the existing `MTT890` rule, or that `MTT690` might shadow `MTT890` — does NOT exist. All 15 Yamaha prefix rules differ at character position 2 or 3 of their 6–7 character strings, making it impossible for any one prefix to be a leading substring of another. Specifically:
> - `MTT890` vs `MTT690`: differ at position 3 ('8' vs '6') — distinct families.
> - `MTN890` vs `MTT890`: differ at position 2 ('N' vs 'T') — distinct families.
> - `MTN1000` vs `MTN690`/`MTN125`/`MTN890`: first 6 chars are `MTN100`, which matches none of the 6-char prefixes.
> The prefix matching algorithm iterates the array in declaration order and returns on first match; because no prefix is a leading substring of any other, declaration order does not affect correctness for Yamaha rules.

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` = `MTT890-A` (starts with `MTT890`)
- THEN `MODELO_ITV` is replaced with `MT-09` (not `MT-07`)
- AND the `MTT690` rule is NOT triggered because `MTT890-A` does not start with `MTT690`

- GIVEN `MARCA_ITV` = `YAMAHA`
- WHEN `MODELO_ITV` = `MTN890D` (starts with `MTN890`)
- THEN `MODELO_ITV` is replaced with `MT-09`
- AND the `MTT890` rule is NOT triggered because `MTN890D` does not start with `MTT890`

#### Scenario: Suzuki ADDRESS 125 exact code normalized

- GIVEN `MARCA_ITV` = `SUZUKI`
- WHEN `MODELO_ITV` = `UB125L`
- THEN `MODELO_ITV` is replaced with `ADDRESS 125`

#### Scenario: Suzuki V-Strom 800 — both new and used variants

- GIVEN `MARCA_ITV` = `SUZUKI`
- WHEN `MODELO_ITV` = `DL800` or `DL800U`
- THEN `MODELO_ITV` is replaced with `V-Strom 800`

#### Scenario: Suzuki GSX-S 1000 prefix rule captures all variants

- GIVEN `MARCA_ITV` = `SUZUKI`
- WHEN `MODELO_ITV` starts with `GSX-S1000` (e.g. `GSX-S1000`, `GSX-S1000T`, `GSX-S1000X`)
- THEN `MODELO_ITV` is replaced with `GSX-S 1000`

#### Scenario: Model matched by exact rule (existing behavior retained)

- GIVEN a brand has exact rules defined
- WHEN a row's `MARCA_ITV` and `MODELO_ITV` match an exact rule
- THEN `MODELO_ITV` is replaced with the canonical value for that brand

#### Scenario: Model matched by prefix rule (existing behavior retained)

- GIVEN a brand has prefix rules defined
- WHEN a row's `MARCA_ITV` has prefix rules and `MODELO_ITV` starts with a defined prefix
- THEN `MODELO_ITV` is replaced with the canonical value for that prefix

#### Scenario: Exact rule takes precedence over prefix rule (existing behavior retained)

- GIVEN a model matches both an exact rule and a prefix rule for the same brand
- WHEN normalization is applied
- THEN the exact rule result is returned

#### Scenario: Model not matched (existing behavior retained)

- GIVEN a row matches no exact or prefix rule for its brand
- WHEN normalization is applied
- THEN `MODELO_ITV` keeps its original value

#### Scenario: Brand with no rules defined (existing behavior retained)

- GIVEN `MARCA_ITV` is a brand not present in either `BRAND_EXACT` or `BRAND_PREFIX`
- WHEN normalization is applied
- THEN `MODELO_ITV` keeps its original value

## ADDED Requirements

### Requirement: Full reproceso after normalization rule changes

When normalization rules are updated, the system MUST be able to fully reprocess historical data by deleting all existing daily CSV files under `/microdatos-etl/data/` and allowing the ETL to regenerate them.

The system SHALL NOT assume that previously stored CSV files already contain the updated canonical model names.

#### Scenario: Reproceso triggered after rule update

- GIVEN all files under `/microdatos-etl/data/` have been deleted
- WHEN the ETL workflow runs on the next scheduled cycle
- THEN it downloads and reprocesses all available dates from DGT
- AND all output CSVs contain model names normalized with the updated rules

#### Scenario: Legacy CSV files not trusted after rule change

- GIVEN a daily CSV exists at `/microdatos-etl/data/YYYY/MM/DD.csv` that was generated with old normalization rules
- WHEN the file has not been deleted before the next ETL run
- THEN the monthly aggregates computed from it will contain the old non-canonical model names
- AND the system produces no error (behavior consistent with incremental-skip requirement)

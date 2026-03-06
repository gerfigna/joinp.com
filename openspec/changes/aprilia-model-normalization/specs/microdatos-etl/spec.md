## MODIFIED Requirements

### Requirement: Model normalization by brand

During extraction, the system SHALL normalize `MODELO_ITV` based on `MARCA_ITV`.
Normalization applies two types of rules, evaluated in order: exact match first, then prefix match.

**Exact rules** (full model string match → canonical):

- For `YAMAHA`:
  `GPD125D-A -> NMAX125`, `GPD125-A -> NMAX125`, `YP125R-DA -> XMAX125`, `YP125RA -> XMAX125`, `WR125-A -> WR125`
- For `HONDA`:
  `WW125A -> PCX125`, `WW125S -> PCX125`, `FSH125 -> SH125`, `SH125AD -> SH125`, `NSS125AD -> FORZA125`
- For `APRILIA`:
  `RS 660 FACTORY -> RS 660`, `RSV4 FACTORY -> RSV4`, `TUONO V4 FACTORY -> TUONO V4`, `TUAREG 660 RALLY -> TUAREG 660`
- For `BENELLI`:
  `BKX 125 S -> BN125`, `TRK 702 35KW -> TRK 702`, `TRK 702X -> TRK 702`, `TRK 702X 35KW -> TRK 702`
- For `BMW`:
  `CE04 -> CE 04`, `F 900 GS ADVENTURE -> F 900 GS`, `F 900 XR A2 -> F 900 XR`, `F 900 R A2 -> F 900 R`

**Prefix rules** (model starts with prefix → canonical):

- For `YAMAHA`:
  prefix `MTT690` → `MT-07`,
  prefix `MTT890` → `MT-09`,
  prefix `MWS125` → `TRICITY 125`
- For `SYM`: prefix `SYMPHONY 125` → `SYMPHONY 125`
- For `BMW`:
  prefix `K 1600 ` → `K 1600`,
  prefix `M 1000 ` → `M 1000`,
  prefix `R 12 ` → `R 12`,
  prefix `R 1300 ` → `R 1300`,
  prefix `R 18 ` → `R 18`,
  prefix `S 1000 ` → `S 1000`
- For `BRIXTON`: prefix `CROSSFIRE 500 ` → `CROSSFIRE 500`
- For `DUCATI`:
  prefix `MULTISTRADA V2 ` → `MULTISTRADA V2`,
  prefix `MULTISTRADA V4 ` → `MULTISTRADA V4`,
  prefix `PANIGALE V2 ` → `PANIGALE V2`,
  prefix `PANIGALE V4 ` → `PANIGALE V4`,
  prefix `STREETFIGHTER ` → `STREETFIGHTER`
- For `HONDA`:
  prefix `CB650RA` → `CB650RA`,
  prefix `CBR1000` → `CBR1000`,
  prefix `CBR500` → `CBR500`,
  prefix `CMX1100` → `CMX1100`,
  prefix `CRF1100` → `CRF1100`,
  prefix `NT1100` → `NT1100`
- For `KTM`:
  prefix `KTM 250 EXC` → `KTM 250 EXC`,
  prefix `KTM 300 EXC` → `KTM 300 EXC`
- For `KYMCO`: prefix `AGILITY S ` → `AGILITY S`

#### Scenario: Model matched by exact rule

- WHEN a row's `MARCA_ITV` and `MODELO_ITV` match an exact rule
- THEN `MODELO_ITV` is replaced with the canonical value for that brand

#### Scenario: Model matched by prefix rule

- WHEN a row's `MARCA_ITV` has prefix rules and `MODELO_ITV` starts with a defined prefix
- THEN `MODELO_ITV` is replaced with the canonical value for that prefix

#### Scenario: Exact rule takes precedence over prefix rule

- WHEN a model matches both an exact rule and a prefix rule for the same brand
- THEN the exact rule result is returned

#### Scenario: Model not matched

- WHEN a row matches no exact or prefix rule
- THEN `MODELO_ITV` keeps its original value

#### Scenario: Aprilia factory variant normalized

- WHEN `MARCA_ITV` = `APRILIA` and `MODELO_ITV` = `RS 660 FACTORY`
- THEN `MODELO_ITV` is replaced with `RS 660`

#### Scenario: BMW R series prefix normalized

- WHEN `MARCA_ITV` = `BMW` and `MODELO_ITV` starts with `R 1300 `
- THEN `MODELO_ITV` is replaced with `R 1300`

#### Scenario: Ducati color variant normalized

- WHEN `MARCA_ITV` = `DUCATI` and `MODELO_ITV` starts with `MULTISTRADA V4 `
- THEN `MODELO_ITV` is replaced with `MULTISTRADA V4`

#### Scenario: Honda ITV code prefix normalized

- WHEN `MARCA_ITV` = `HONDA` and `MODELO_ITV` starts with `CRF1100`
- THEN `MODELO_ITV` is replaced with `CRF1100`

## Why

Los datos brutos de DGT registran variantes de modelos (ediciones de fábrica, sufijos A2, colores, suffijos de código ITV) como modelos separados, fragmentando los conteos por modelo. Ampliar las reglas de normalización para cubrir múltiples marcas permite estadísticas coherentes agrupando variantes bajo el modelo canónico.

> Nota: este cambio se inició como `aprilia-model-normalization` pero su alcance se amplió a múltiples marcas.

## What Changes

- Refactorizar `normalizeModel()` para soportar reglas de datos declarativas (exact maps + prefix rules) en lugar de lógica imperativa por marca
- Añadir reglas de normalización para: **APRILIA**, **BENELLI**, **BMW**, **BRIXTON**, **DUCATI**, **HONDA** (nuevas), **KTM**, **KYMCO**, **YAMAHA** (nuevas)
- Actualizar el spec de `microdatos-etl` con todas las nuevas reglas

### Reglas exactas nuevas

| Marca | De | A |
|---|---|---|
| APRILIA | RS 660 FACTORY | RS 660 |
| APRILIA | RSV4 FACTORY | RSV4 |
| APRILIA | TUONO V4 FACTORY | TUONO V4 |
| APRILIA | TUAREG 660 RALLY | TUAREG 660 |
| BENELLI | BKX 125 S | BN125 |
| BENELLI | TRK 702 35KW | TRK 702 |
| BENELLI | TRK 702X | TRK 702 |
| BENELLI | TRK 702X 35KW | TRK 702 |
| YAMAHA | WR125-A | WR125 |
| BMW | CE04 | CE 04 |
| BMW | F 900 GS ADVENTURE | F 900 GS |
| BMW | F 900 XR A2 | F 900 XR |
| BMW | F 900 R A2 | F 900 R |

### Reglas de prefijo nuevas

| Marca | Prefijo | Canónico |
|---|---|---|
| YAMAHA | `MTT690` | MT-07 |
| YAMAHA | `MTT890` | MT-09 |
| YAMAHA | `MWS125` | TRICITY 125 |
| BMW | `K 1600 ` | K 1600 |
| BMW | `M 1000 ` | M 1000 |
| BMW | `R 12 ` | R 12 |
| BMW | `R 1300 ` | R 1300 |
| BMW | `R 18 ` | R 18 |
| BMW | `S 1000 ` | S 1000 |
| BRIXTON | `CROSSFIRE 500 ` | CROSSFIRE 500 |
| DUCATI | `MULTISTRADA V2 ` | MULTISTRADA V2 |
| DUCATI | `MULTISTRADA V4 ` | MULTISTRADA V4 |
| DUCATI | `PANIGALE V2 ` | PANIGALE V2 |
| DUCATI | `PANIGALE V4 ` | PANIGALE V4 |
| DUCATI | `STREETFIGHTER ` | STREETFIGHTER |
| HONDA | `CB650RA` | CB650RA |
| HONDA | `CBR1000` | CBR1000 |
| HONDA | `CBR500` | CBR500 |
| HONDA | `CMX1100` | CMX1100 |
| HONDA | `CRF1100` | CRF1100 |
| HONDA | `NT1100` | NT1100 |
| KTM | `KTM 250 EXC` | KTM 250 EXC |
| KTM | `KTM 300 EXC` | KTM 300 EXC |
| KYMCO | `AGILITY S ` | AGILITY S |

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `microdatos-etl`: Se amplía el requisito de normalización de modelo por marca con nuevas reglas para APRILIA, BENELLI, BMW, BRIXTON, DUCATI, HONDA, KTM, KYMCO y YAMAHA. La función `normalizeModel` se refactoriza a un enfoque data-driven.

## Impact

- `microdatos-etl/download-microdatos.js`: refactorizar `normalizeModel()` + añadir tablas de datos por marca
- **Datos históricos**: todos los CSV diarios en `microdatos-etl/data/` deben eliminarse para que el ETL los reprocese con las nuevas reglas. Sin este paso, los datos históricos quedan sin normalizar y los acumulados mensuales mezclan modelos normalizados y sin normalizar.

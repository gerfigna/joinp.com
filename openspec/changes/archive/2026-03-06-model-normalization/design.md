## Context

`normalizeModel()` en `download-microdatos.js` aplica reglas por marca mediante mapas de lookup (`YAMAHA_MAP`, `HONDA_MAP`) y una regla de prefijo inline para `SYM`. Con el crecimiento de reglas a 8+ marcas, la estructura actual (un bloque `if` por marca) se vuelve difícil de mantener.

## Goals / Non-Goals

**Goals:**
- Generalizar `normalizeModel()` a un diseño data-driven: tablas declarativas separadas del código de control
- Añadir todas las reglas de normalización listadas en el proposal
- Mantener compatibilidad con las reglas existentes de YAMAHA, HONDA y SYM

**Non-Goals:**
- Reprocesar CSV diarios históricos ya generados
- Añadir reglas para otras marcas no listadas

## Decisions

### Estructura de datos: `BRAND_EXACT` + `BRAND_PREFIX`

Dos tablas declarativas cubren todos los casos:

```
BRAND_EXACT  = { MARCA: { modelo_raw: modelo_canonico, ... }, ... }
BRAND_PREFIX = { MARCA: [ [prefix, canonical], ... ], ... }
```

`normalizeModel(marca, modelo)`:
1. Busca en `BRAND_EXACT[marca][modelo]` → devuelve si hay match exacto
2. Itera `BRAND_PREFIX[marca]` → devuelve canonical si `modelo.startsWith(prefix)`
3. Si no hay match → devuelve modelo sin cambios

**Alternativa descartada**: mantener un bloque `if/MAP` por marca. Con 8+ marcas y dos tipos de regla, el código de control crece linealmente y mezcla datos con lógica.

### Clasificación de reglas

**Exact maps** (el modelo raw no es un prefijo del canónico, o la diferencia es significativa):
- APRILIA: variantes FACTORY/RALLY
- BENELLI: BKX 125 S → BN125 (nombre completamente diferente), TRK 702 variants
- BMW: CE04 → CE 04 (corrección de espacio), F 900 series con sufijos A2/ADVENTURE

**Prefix rules** (el canónico es el prefijo exacto del modelo raw, con o sin espacio):
- BMW K/M/R/S series: variantes con espacio (`K 1600 ` → `K 1600`)
- BRIXTON CROSSFIRE 500: variante XC (`CROSSFIRE 500 ` → `CROSSFIRE 500`)
- DUCATI: variantes de color/edición (`MULTISTRADA V2 ` → `MULTISTRADA V2`)
- HONDA códigos ITV: sufijos alfanuméricos sin espacio (`CB650RA` → `CB650RA`)
- KTM EXC: variantes F (`KTM 250 EXC` → `KTM 250 EXC`)
- KYMCO AGILITY S: variante 125 (`AGILITY S ` → `AGILITY S`)

### SYM migración

La regla SYM actual (`modelo.startsWith('SYMPHONY 125')`) se migra a `BRAND_PREFIX` para consistencia.

## Risks / Trade-offs

- **Datos históricos inconsistentes** → Los CSV diarios ya escritos no se recalculan. Aceptable dado el volumen (decenas de unidades afectadas por mes).
- **Reglas de prefijo demasiado amplias** → Un prefijo corto podría capturar modelos no deseados. Mitigación: los prefijos se eligen para que sean unívocos en el dataset conocido (verificado contra datos reales de Feb/Mar 2026).
- **KTM 250 EXC vs KTM 250 EXC-F**: el prefijo `KTM 250 EXC` sin espacio captura tanto `KTM 250 EXC-F` (correcto) como el propio `KTM 250 EXC` (se mapea a sí mismo, sin efecto).

## Migration Plan

1. Reemplazar las constantes `YAMAHA_MAP`, `HONDA_MAP` por `BRAND_EXACT` + `BRAND_PREFIX` (mismas reglas existentes + nuevas)
2. Refactorizar `normalizeModel()` para usar las nuevas tablas
3. El próximo ciclo diario del ETL aplicará todas las reglas a datos nuevos

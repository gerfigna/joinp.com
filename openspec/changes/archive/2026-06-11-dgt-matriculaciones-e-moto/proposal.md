## Why

Las motos eléctricas están actualmente excluidas de todos los dashboards del proyecto porque el ETL filtra filas con cilindrada = 0. Los datos sí existen en los ZIPs de la DGT, pero nunca se extraen ni se visualizan. Con el crecimiento del segmento eléctrico, existe una oportunidad clara de publicar datos que nadie más ofrece de forma abierta en España.

## What Changes

- **Nuevo dashboard** `dgt-matriculaciones-e-moto/index.html` — visualiza matriculaciones de motos eléctricas nuevas, centrado en potencia (kW) en lugar de cilindrada.
- **Nuevo ETL** `microdatos-etl/download-microdatos-electrica.js` — descarga ZIPs diarios de la DGT (con fallback al ZIP mensual cuando el diario no está disponible), filtra motos eléctricas y escribe registros ricos (36 campos: 35 fuente + `TIPO_CARNET` calculado) en `microdatos-etl/e-data/YYYY/MM/DD.csv`. Genera también acumulados mensuales y anuales por marca y rango de potencia. Un único script cubre carga inicial y actualización diaria. Alcance de datos: 2025 en adelante.
- **Nuevas funciones en `filter.js`** — `isElectricMotorcycleRow()` y `extractElectricFields()`.
- **Nueva constante `E_DATA_DIR`** en `constants.js`.
- **Enlace de navegación** en `dgt-matriculaciones-moto/index.html` — junto al label "Información", abre el nuevo dashboard en nueva pestaña.

## Capabilities

### New Capabilities

- `e-moto-etl`: ETL de motos eléctricas — filtrado, extracción de 36 campos (35 fuente + `TIPO_CARNET`), escritura de CSVs diarios y acumulados en `e-data/`, con fallback diario→mensual.
- `e-moto-dashboard`: Dashboard de matriculaciones de motos eléctricas — visualización por marca y rango de potencia (kW), desde 2025.

### Modified Capabilities

- `microdatos-etl`: Añade `isElectricMotorcycleRow`, `extractElectricFields` a `filter.js` y `E_DATA_DIR` a `constants.js`.
- `matriculaciones-dashboard`: Añade enlace de navegación al nuevo dashboard en el tab nav.

## Impact

- **Nuevos archivos**: `dgt-matriculaciones-e-moto/index.html`, `dgt-matriculaciones-e-moto/app.js`, `dgt-matriculaciones-e-moto/styles.css`, `microdatos-etl/download-microdatos-electrica.js`.
- **Archivos modificados**: `microdatos-etl/lib/filter.js`, `microdatos-etl/lib/constants.js`, `dgt-matriculaciones-moto/index.html`.
- **Nueva carpeta de datos**: `microdatos-etl/e-data/` (estructura `YYYY/MM/DD.csv` + acumulados).
- **Sin cambios en** `power-aggregate.js`, `aggregate.js`, `http.js`, `zip.js`, `normalize.js` — se reutilizan sin modificación.
- **Dependencias**: ninguna nueva; `adm-zip` ya está instalado.

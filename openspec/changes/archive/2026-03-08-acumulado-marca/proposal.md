## Why

El ETL ya genera un acumulado mensual por marca y modelo (`acumulado-marca-modelo.csv`), pero no existe un agregado a nivel de marca. Un reporte de totales por marca permite comparar cuota de mercado entre fabricantes de forma directa, sin necesidad de procesar el fichero de modelos.

## What Changes

- Nuevo archivo mensual `acumulado-marca.csv` generado junto a `acumulado-marca-modelo.csv` al final de cada ejecución ETL.
- Se recalcula únicamente para los meses en que se incorporaron nuevos datos (misma lógica selectiva que el acumulado existente).

## Capabilities

### New Capabilities

- `acumulado-marca`: Generación y actualización de un CSV mensual con el total de matriculaciones agrupadas por `MARCA_ITV`, almacenado en `/microdatos-etl/data/YYYY/MM/acumulado-marca.csv`.

### Modified Capabilities

- `microdatos-etl`: Se extiende la función `recalculateMonthly` (o equivalente) para escribir también el fichero `acumulado-marca.csv` además del ya existente `acumulado-marca-modelo.csv`.

## Impact

- Archivo JS: `microdatos-etl/download-microdatos.js` — añadir lógica de agregación por marca y escritura del nuevo CSV.
- Nuevos archivos de datos: `microdatos-etl/data/YYYY/MM/acumulado-marca.csv` (generados en runtime, commiteados por el workflow).
- Sin cambios en dependencias npm, workflow de GitHub Actions ni estructura de directorios existente.

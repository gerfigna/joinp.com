## Why

El gráfico "Evolución Anual por Marca (Top 30)" excluye intencionalmente el año en curso en modo unidades para evitar comparar datos parciales con años completos. Esto oculta la tendencia del año actual, que es precisamente la más relevante para el usuario. Añadir una proyección anualizada muestra la dirección del mercado sin engañar visualmente.

## What Changes

- Incluir el año actual (2026) en el eje X del gráfico de marcas en modo unidades
- Calcular un valor proyectado por marca basado en las ventas reales acumuladas y el progreso del año (días transcurridos / días totales)
- Representar el tramo 2025→2026 con línea discontinua para indicar visualmente que es una proyección
- Diferenciar el tooltip del año proyectado: prefijo `~` y sufijo `(proyección)`
- Obtener la fecha del último dato desde `metadata.json` para que la proyección sea precisa

## Capabilities

### Modified Capabilities

- `moto-evolution-charts`: El gráfico de marcas en modo unidades ahora incluye el año actual con valor proyectado y segmento discontinuo. El modo porcentaje no cambia.

## Impact

- `dgt-matriculaciones-moto/app.js`: modificar `loadEvolutionData`, `buildBrandsChartData`, `brandYears`, y opciones del `brandChart`
- No hay cambios en el ETL, en los CSVs ni en `index.html`
- No hay nuevas dependencias (Chart.js 4.4 soporta `segment` nativamente)

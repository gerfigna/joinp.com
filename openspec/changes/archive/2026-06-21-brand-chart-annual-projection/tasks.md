# Tasks: brand-chart-annual-projection

## Phase 1: Data loading

- [x] 1.1 En `loadEvolutionData()`, fetch `microdatos-etl/data/metadata.json` y derivar el último mes completo (e.g. `lastDataDate = "2026-06-19"` → último mes completo = Mayo = `05`)
- [x] 1.2 En `loadEvolutionData()`, cargar los 12 meses de 2025 (`data/2025/{01..12}/acumulado-marca-mensual.csv`) en paralelo junto con los archivos existentes
- [x] 1.3 En `loadEvolutionData()`, cargar los meses completos de 2026 (`data/2026/{01..lastCompleteMonth}/acumulado-marca-mensual.csv`) en paralelo
- [x] 1.4 Almacenar los datos mensuales en `evolutionData` por año: añadir campo `monthlyBrands: { '01': [...], '02': [...], ... }` junto a los existentes `power` y `brands`

## Phase 2: Brand eligibility

- [x] 2.1 Crear función `getEligibleBrands()` que retorna el conjunto de marcas con COUNT > 0 en todos los meses de 2025 y en todos los meses completos de 2026
- [x] 2.2 Modificar `getTopBrands(n)` para filtrar usando `getEligibleBrands()` antes de ordenar por volumen

## Phase 3: Projection

- [x] 3.1 Crear función `computeAvgRatio(brand, monthlyData2025, monthlyData2026)` que devuelve la media de `count_2026_m / count_2025_m` para cada mes completo de 2026
- [x] 3.2 Crear función `projectBrand2026(brand)` que suma `actual_ytd_2026 + Σ(2025_jul..dic) × avg_ratio`
- [x] 3.3 En `buildBrandsChartData()`: eliminar el filtro `d.year < currentYear` en modo unidades; reemplazar el valor de 2026 por el resultado de `projectBrand2026`

## Phase 4: Visual

- [x] 4.1 Modificar `brandYears(mode)` para incluir el año actual también en modo unidades
- [x] 4.2 Añadir `segment: { borderDash: ctx => ctx.p0DataIndex === labels.length - 2 ? [6, 4] : [] }` a las opciones del `brandChart`
- [x] 4.3 Añadir `pointStyle` y `pointBackgroundColor` hollow para el último punto de cada dataset (2026)
- [x] 4.4 Añadir callback de tooltip que muestre `~X (proyección)` para el índice del año actual

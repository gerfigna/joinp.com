## Projection method: YoY monthly ratio

For each brand, compare the same calendar month across 2026 vs 2025 to derive a growth/decline ratio that naturally captures seasonality.

### Brand eligibility

A brand is eligible only if it has COUNT > 0 in **every** month of:
- 2025 (all 12 months)
- 2026 (all complete months: Jan through last full month before `metadata.json` lastDataDate)

Brands that fail this check are excluded from the chart entirely — they do not appear in the Top 30 or the projection.

June 2026 is a partial month (data through June 19). It is treated as an observed YTD value, not used in the ratio computation.

### Top 30 selection

`getTopBrands(30)` runs on the eligible brand set only. Ranking logic (sum of last 3 complete years by volume) remains unchanged.

### Ratio computation

For each eligible brand and each complete month m (Jan–May for the current state of 2026):

```
ratio_m = count_brand_2026_m / count_brand_2025_m
avg_ratio = mean(ratio_Jan, ratio_Feb, ..., ratio_May)
```

### Projection

```
actual_ytd   = acumulado-marca-anual.csv[2026][brand]   // Jan–Jun 19 real
rest_2025    = Σ count_brand_2025_m  for m = Jul..Dec
projected    = actual_ytd + rest_2025 × avg_ratio
```

### Data loading

New files to fetch in `loadEvolutionData()`:

| Files | Count | Purpose |
|-------|-------|---------|
| `data/2025/{01..12}/acumulado-marca-mensual.csv` | 12 | ratio denominator + rest_2025 |
| `data/2026/{01..05}/acumulado-marca-mensual.csv` | 5  | ratio numerator |
| `data/{year}/acumulado-marca-anual.csv` | already loaded | actual YTD 2026, annual historical |
| `microdatos-etl/data/metadata.json` | 1 | determine last complete month |

Total new requests: 18 small CSVs (~77 rows each).

### Visual encoding

- Current years (2015–2025): solid line, filled circle points — no change
- 2026 data point: hollow circle (`pointStyle: 'circle'`, `pointBackgroundColor: 'transparent'`)
- 2025→2026 segment: dashed via Chart.js `segment` option:
  ```js
  segment: {
    borderDash: ctx => ctx.p0DataIndex === labels.length - 2 ? [6, 4] : []
  }
  ```

### Tooltip

```js
label: ctx => {
  const isProjected = ctx.dataIndex === labels.length - 1;
  const val = ctx.parsed.y.toLocaleString('es');
  return isProjected
    ? `${ctx.dataset.label}: ~${val} (proyección)`
    : `${ctx.dataset.label}: ${val}`;
}
```

### Mode: percent

No changes. Percent mode already shows 2026 and is not affected by this change.

### `buildBrandsChartData` changes

Remove the `mode === 'percent'` guard that filtered out the current year in units mode. The 2026 value in units mode is now the projected value (not the raw partial count).

## Out of scope

- Power chart (`Evolución por Rango de Potencia`): no changes
- ETL: no changes
- `index.html`: no changes

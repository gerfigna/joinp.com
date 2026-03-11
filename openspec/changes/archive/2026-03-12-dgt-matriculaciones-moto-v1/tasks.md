## 1. Project Scaffold

- [x] 1.1 Create `/dgt-matriculaciones-moto/` directory
- [x] 1.2 Create `/dgt-matriculaciones-moto/index.html` with base HTML structure, `<head>` meta tags, Chart.js CDN script tag, and placeholder sections for filters, table, and chart

## 2. Data Loading

- [x] 2.1 Implement year/month selector UI (two `<select>` elements: year from 2026 to current year, months 01–12)
- [x] 2.2 Implement CSV fetch function that builds the path `/microdatos-etl/data/{year}/{month}/acumulado-marca-modelo-provincia.csv` and fetches it
- [x] 2.3 Implement CSV parser that handles quoted fields and returns an array of row objects with keys: `MARCA_ITV`, `MODELO_ITV`, `PROVINCIA_VEH`, `CILINDRADA_ITV`, `COUNT`
- [x] 2.4 On page load, detect the current month, set selectors to the latest month, and trigger the initial data fetch
- [x] 2.5 Handle fetch errors (404 / network failure) by showing an empty state message and clearing the chart

## 3. Filter UI

- [x] 3.1 Add brand (`MARCA_ITV`) filter: `<select>` populated dynamically from loaded data, with a default "All brands" option
- [x] 3.2 Add province (`PROVINCIA_VEH`) filter: `<select>` populated dynamically from loaded data, with a default "All provinces" option
- [x] 3.3 Add displacement range filter: two `<input type="number">` fields (min cc, max cc)
- [x] 3.4 Populate brand and province dropdowns from the loaded dataset after each CSV fetch, resetting to "All" on month change

## 4. Filter Logic

- [x] 4.1 Implement `applyFilters(data, filters)` function that filters the raw data array using AND logic across brand, province, and displacement range
- [x] 4.2 Wire all filter inputs (brand, province, min/max cc, year/month) to trigger `applyFilters` and then re-render table and chart on every change

## 5. Table

- [x] 5.1 Render table with columns: Marca, Modelo, Provincia, Cilindrada (cc), Matriculaciones
- [x] 5.2 Implement column sort: clicking a header sorts by that column ASC; clicking again toggles to DESC; show arrow indicator on active column
- [x] 5.3 Default sort: Matriculaciones DESC on initial load and after each data/filter change
- [x] 5.4 Implement pagination: 25 rows per page, with previous/next buttons and current page indicator
- [x] 5.5 Reset to page 1 whenever filters or sort change
- [x] 5.6 Disable previous button on page 1 and next button on the last page

## 6. Pie Chart

- [x] 6.1 Initialize a Chart.js pie chart in a `<canvas>` element
- [x] 6.2 Implement `aggregateByBrand(filteredData)` that sums `COUNT` per `MARCA_ITV`
- [x] 6.3 Render/update the pie chart with aggregated brand data after every filter change
- [x] 6.4 Handle empty data state: clear or hide the chart when no rows match the active filters

## 7. Styling

- [x] 7.1 Apply dark theme CSS matching the repo style (background `#020617`, foreground `#e5e7eb`, accent color, system fonts)
- [x] 7.2 Style filter controls, table (hover rows, alternating shading or clear borders), and pagination controls
- [x] 7.3 Add page title and brief description heading

## ADDED Requirements

### Requirement: BEV-only scope
The dashboard displays exclusively **BEV (Battery Electric Vehicle)** motorcycle registrations. HEV, PHEV, and REEV are excluded at the ETL level and do not appear in any CSV consumed by this dashboard. The Información tab SHALL make this scope explicit to the user.

### Requirement: Dashboard loads monthly electric data
The page at `dgt-matriculaciones-e-moto/index.html` SHALL fetch `e-data/YYYY/MM/acumulado-modelo-mensual.csv` and `e-data/YYYY/MM/acumulado-potencia-mensual.csv` for the selected year/month (or the annual equivalents when "Todos" is selected) via paths relative to the repo root (`../microdatos-etl/e-data/...`).

#### Scenario: Data loads on page open
- **WHEN** the page is opened
- **THEN** the most recent available month's data is fetched and displayed

#### Scenario: Month data unavailable
- **WHEN** the selected month's CSV returns a 404 or network error
- **THEN** the dashboard shows an empty state with a descriptive message

### Requirement: Year/Month selector
The page SHALL provide a year selector and month selector. Available range SHALL cover from January 2025 to the current month. No data prior to 2025 exists.

#### Scenario: Default selection is the most recent month with data
- **WHEN** the page loads
- **THEN** the selector defaults to the most recent month that has a non-empty CSV

### Requirement: Year/Month selector with "Todos" option
The month selector SHALL include a "Todos" option (first in the list, always enabled) that aggregates all months of the selected year. When "Todos" is selected the dashboard loads the annual CSV (`acumulado-modelo-anual.csv` / `acumulado-potencia-anual.csv`). Month options after the current month SHALL be disabled for the current year.

### Requirement: Model table with power and EU category
The page SHALL render a table sourced from `acumulado-modelo-mensual.csv` (or annual equivalent) with columns: **Marca · Modelo · Potencia (kW) · Categoría (CATEGORIA_HOMOLOGACION_EUROPEA_ITV) · Unidades**, sorted by Unidades descending. Each row represents a unique (brand, model, power, EU category) variant.

#### Scenario: Table populated with model data
- **WHEN** the modelo aggregate CSV is loaded
- **THEN** each row shows one variant with its COUNT

#### Scenario: Same model, different power — distinct rows
- **WHEN** the same model name has been registered with two different KW values
- **THEN** two separate rows appear in the table

#### Scenario: Table with zero data
- **WHEN** the CSV has only a header row
- **THEN** the table shows an empty-state message

### Requirement: Filters
The page SHALL provide client-side filters that re-render the table and charts without re-fetching data:
- **Marca** — dropdown populated from brands present in the loaded data; "Todas las marcas" shows all.
- **Carnet** — A1 (≤11 kW) / A2 (11–35 kW) / A (>35 kW) / Todos, derived from KW_ITV.

### Requirement: Power band chart
The page SHALL render a chart (bar or pie) showing the distribution of registrations across power bands (`Hasta 11 kW`, `11-35 kW`, `Más de 35 kW`) for the selected month, sourced from `acumulado-potencia-mensual.csv`.

#### Scenario: Chart rendered with power data
- **WHEN** `acumulado-potencia-mensual.csv` contains at least one row
- **THEN** the chart displays each power band with its count

#### Scenario: Chart empty state
- **WHEN** the power CSV has no data rows
- **THEN** the chart area shows an empty-state placeholder

### Requirement: Annual evolution chart
The page SHALL render a line or bar chart showing annual totals per brand (top N brands) using `e-data/YYYY/acumulado-marca-anual.csv` across all available years.

#### Scenario: Evolution chart loaded on tab switch
- **WHEN** the user navigates to the historical tab
- **THEN** all available annual CSVs are fetched and the chart renders one series per brand

### Requirement: Visual design consistent with combustion dashboard
The page SHALL use the same glassmorphism design system (CSS variables, glass panels, color scheme) as `dgt-matriculaciones-moto/index.html`. The dashboard SHALL be self-contained with its own `styles.css` and `app.js`.

#### Scenario: Page renders without external CSS framework
- **WHEN** the page loads
- **THEN** all styles are served from `dgt-matriculaciones-e-moto/styles.css` with no external CSS dependency beyond Chart.js CDN

# Matriculaciones Dashboard Specification

## Requirements

### Requirement: Page loads monthly CSV data
The page SHALL fetch and parse the monthly CSV file `acumulado-marca-modelo-provincia.csv` for the selected year/month from the path `/microdatos-etl/data/{year}/{month}/acumulado-marca-modelo-provincia.csv`.

When the month selector is set to `"Todos"`, the page SHALL instead fetch and parse the annual CSV file `acumulado-marca-modelo-provincia-anual.csv` for the selected year from the path `/microdatos-etl/data/{year}/acumulado-marca-modelo-provincia-anual.csv`.

#### Scenario: Data loads on initial page load
- **WHEN** the page is opened
- **THEN** the most recent available month's data is fetched and displayed in the table and pie chart

#### Scenario: User changes year/month
- **WHEN** the user selects a different year or month
- **THEN** the corresponding CSV is fetched and all filters, table, and chart are updated with the new data

#### Scenario: Month data not available
- **WHEN** the selected month's CSV returns a 404 or network error
- **THEN** the table shows an empty state message and the chart is cleared

#### Scenario: User selects "Todos"
- **WHEN** the user selects the `"Todos"` option in the month selector
- **THEN** the page fetches `/microdatos-etl/data/{year}/acumulado-marca-modelo-provincia-anual.csv` for the currently selected year
- **AND** the table, filters, and pie chart render the resulting annual rows using the same logic as for a single month

#### Scenario: Annual data not available
- **WHEN** `"Todos"` is selected and the annual CSV returns a 404 or network error
- **THEN** the table shows an empty state message and the chart is cleared, same as an unavailable month

---

### Requirement: Year/Month selector
The page SHALL provide a year selector and a month selector to choose which month's data to display. Available options SHALL cover from January 2025 up to the current month.

The month selector SHALL additionally include a `"Todos"` option, which represents the full selected year's aggregated data rather than a single month.

The year and month selects SHALL be rendered in a dedicated `<div class="period-selector">` container that is visually distinct from and positioned above the `.filters` panel. The `.filters` panel SHALL NOT contain the year or month selects.

#### Scenario: Default selection is most recent month
- **WHEN** the page loads
- **THEN** the year/month selector defaults to the latest available month

#### Scenario: Selecting a past month
- **WHEN** the user selects a year and month
- **THEN** the data, table, and chart update to reflect that month's registrations

#### Scenario: Period selector rendered above filters
- **WHEN** the page loads
- **THEN** a `.period-selector` element is visible above the `.filters` panel containing `sel-year` and `sel-month`, and the `.filters` panel does not contain those selects

#### Scenario: "Todos" option is always available
- **WHEN** the user selects any year in the year selector
- **THEN** the `"Todos"` option in the month selector remains enabled and selectable, unlike numbered months beyond the current month of the current year

#### Scenario: Switching from "Todos" back to a specific month
- **WHEN** `"Todos"` is selected and the user then selects a specific month
- **THEN** the page fetches that month's monthly CSV and renders it as usual

---

### Requirement: Brand filter
The page SHALL provide a brand (marca) filter. The filter SHALL be a dropdown or select populated with all distinct brands present in the loaded CSV data.

#### Scenario: No brand filter selected
- **WHEN** no brand is selected (default)
- **THEN** all brands are shown in the table and chart

#### Scenario: Brand filter applied
- **WHEN** the user selects a brand
- **THEN** the table shows only rows matching that brand and the chart updates to reflect the filtered data

---

### Requirement: Province filter
The page SHALL provide a province (provincia) filter. The filter SHALL be a dropdown populated with all distinct provinces in the loaded CSV data.

#### Scenario: No province filter selected
- **WHEN** no province is selected (default)
- **THEN** data is aggregated by marca+modelo (summing registrations across all provinces) and shown in the table

#### Scenario: Province filter applied
- **WHEN** the user selects a province
- **THEN** the table shows only rows matching that province (no aggregation) and the chart updates accordingly

---

### Requirement: Displacement range filter
The page SHALL provide a displacement (cilindrada) range filter consisting of a minimum and maximum value input (in cc).

#### Scenario: No displacement range set
- **WHEN** both inputs are empty
- **THEN** all displacement values are shown

#### Scenario: Displacement range applied
- **WHEN** the user enters a min and/or max displacement value
- **THEN** only rows where `CILINDRADA_ITV` falls within the range are shown, and the chart updates accordingly

#### Scenario: Only min set
- **WHEN** only the minimum is set
- **THEN** rows with displacement >= min are shown

#### Scenario: Only max set
- **WHEN** only the maximum is set
- **THEN** rows with displacement <= max are shown

---

### Requirement: Combined filters
All active filters SHALL be applied together (AND logic). The table and chart SHALL reflect the intersection of all active filter criteria simultaneously.

#### Scenario: Multiple filters active
- **WHEN** the user has selected a brand, a province, and a displacement range
- **THEN** the table shows only rows matching all three criteria and the pie chart reflects only those rows

---

### Requirement: Sortable table
The table SHALL be sortable by any column. Clicking a column header SHALL sort the table by that column. Clicking again SHALL reverse the sort order (ASC/DESC toggle).

#### Scenario: Initial sort
- **WHEN** the page loads
- **THEN** the table is sorted by registration count descending by default

#### Scenario: User clicks a column header
- **WHEN** the user clicks a column header
- **THEN** the table re-sorts by that column in ascending order

#### Scenario: User clicks the same header again
- **WHEN** the user clicks an already-sorted column header
- **THEN** the sort order reverses (ASC → DESC or DESC → ASC)

#### Scenario: Sort direction indicator
- **WHEN** a column is sorted
- **THEN** a visual indicator (arrow or icon) shows the current sort direction on that column header

---

### Requirement: Paginated table
The table SHALL paginate results showing 25 rows per page. Navigation controls (previous/next, page numbers) SHALL be shown below the table.

#### Scenario: Default page
- **WHEN** data loads or filters change
- **THEN** the table resets to page 1

#### Scenario: Navigate to next page
- **WHEN** the user clicks "next"
- **THEN** the next 25 rows are displayed

#### Scenario: Last page
- **WHEN** the user is on the last page
- **THEN** the "next" button is disabled

#### Scenario: First page
- **WHEN** the user is on the first page
- **THEN** the "previous" button is disabled

---

### Requirement: Pie chart shows brand market share
The page SHALL include a Chart.js pie chart that shows the share of total registrations by brand for the currently filtered dataset. The chart SHALL display the top 14 brands by registration count; remaining brands SHALL be grouped into a single "Otras" slice. The chart SHALL update every time a filter changes.

#### Scenario: Chart shows top brands
- **WHEN** data is loaded
- **THEN** the pie chart shows the top 14 brands by registration count, with all remaining brands grouped as "Otras"

#### Scenario: Chart updates on filter change
- **WHEN** any filter (brand, province, displacement, year/month) changes
- **THEN** the pie chart re-renders with updated data reflecting only the filtered rows

#### Scenario: Chart is empty when no data matches
- **WHEN** filters result in zero matching rows
- **THEN** the chart shows an empty or placeholder state

#### Scenario: Brand filter applied — chart shows single brand
- **WHEN** a specific brand is selected
- **THEN** the pie chart shows 100% for that brand (or is hidden since it's trivial)

---

### Requirement: Table columns
The table SHALL display the following columns: Marca, Modelo, Cilindrada (cc), Matriculaciones.

#### Scenario: All columns visible
- **WHEN** the table renders
- **THEN** all four columns are visible with correct data

---

### Requirement: CSV parsing uses current column order
The dashboard CSV parser SHALL correctly read the column order produced by the ETL:
`MARCA_ITV, MODELO_ITV, PROVINCIA_VEH, COMUNIDAD_AUTONOMA, CILINDRADA_ITV, COUNT`.

Each parsed row object SHALL have properties: `MARCA_ITV`, `MODELO_ITV`, `PROVINCIA_VEH`, `COMUNIDAD_AUTONOMA`, `CILINDRADA_ITV`, `COUNT`. All field access SHALL use header names, not positional index.

#### Scenario: COMUNIDAD_AUTONOMA parsed correctly
- **WHEN** a CSV row is `"HONDA","PCX 125","Madrid","Comunidad de Madrid","125",42`
- **THEN** the parsed row has `COMUNIDAD_AUTONOMA === "Comunidad de Madrid"`, `CILINDRADA_ITV === 125`, and `COUNT === 42`

---

### Requirement: Navigation link to electric dashboard
The `dgt-matriculaciones-moto/index.html` tab navigation SHALL include a link to `dgt-matriculaciones-e-moto/index.html` rendered alongside the existing tab labels. The link SHALL open in a new browser tab (`target="_blank" rel="noopener"`). It SHALL be visually consistent with the existing tab label style and positioned adjacent to the "Información" label.

#### Scenario: Link renders in tab nav
- **WHEN** the combustion dashboard page loads
- **THEN** a link to the electric dashboard is visible in the tab navigation area, next to "Información"

#### Scenario: Link opens in new tab
- **WHEN** the user clicks the electric dashboard link
- **THEN** `dgt-matriculaciones-e-moto/index.html` opens in a new browser tab without affecting the current page state

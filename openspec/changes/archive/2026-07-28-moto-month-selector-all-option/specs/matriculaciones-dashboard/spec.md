## MODIFIED Requirements

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

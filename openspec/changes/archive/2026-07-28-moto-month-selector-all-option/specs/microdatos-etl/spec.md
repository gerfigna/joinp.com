## ADDED Requirements

### Requirement: Annual aggregation by brand, model and province

The system SHALL maintain an annual CSV with accumulated counts for `MARCA_ITV`, `MODELO_ITV`, and `PROVINCIA_VEH` combinations, derived from that year's monthly aggregate CSVs.
The annual output SHALL be stored at `/microdatos-etl/data/YYYY/acumulado-marca-modelo-provincia-anual.csv`.
It SHALL be computed by reading every existing `/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo-provincia.csv` file for that year (`MM` from `01` to `12`, skipping months with no monthly file yet) and summing `COUNT` across months for each `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` combination.

#### Scenario: Annual aggregation structure

- WHEN the annual province CSV is generated for a year
- THEN it includes columns `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT`
- AND each row represents a unique `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` combination
- AND `COUNT` is the sum of that combination's `COUNT` across all of that year's existing monthly aggregate CSVs

#### Scenario: Annual aggregation ordering

- WHEN the annual province CSV is written
- THEN rows are sorted alphabetically by `MARCA_ITV`
- AND in case of ties, by `MODELO_ITV`
- AND in case of ties, by `PROVINCIA_VEH`

#### Scenario: Partial year aggregation

- WHEN not all 12 monthly files exist yet for a year (e.g. the year is still in progress)
- THEN the annual CSV is generated from whichever monthly files currently exist
- AND no error occurs due to missing months

#### Scenario: Annual file is fully rebuilt, not incrementally updated

- WHEN the annual aggregation runs for a year
- THEN the resulting `acumulado-marca-modelo-provincia-anual.csv` is computed from scratch from that year's current monthly files
- AND it is not derived by adding to a previously written annual file

### Requirement: Cilindrada consistency across months in annual aggregation

For each `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` combination in the annual aggregation, the system SHALL select the `CILINDRADA_ITV` value with the highest total `COUNT` summed across the months carrying that value.
If more than one distinct `CILINDRADA_ITV` value exists for that combination across the year's monthly files, the system SHALL log a warning identifying the brand, model, province, all conflicting values, and the chosen value. Processing SHALL continue normally.

#### Scenario: Consistent cilindrada across all months

- WHEN all monthly files for a given `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` combination report the same `CILINDRADA_ITV`
- THEN that value is used in the annual aggregation

#### Scenario: Inconsistent cilindrada detected across months

- WHEN monthly files for a given `MARCA_ITV` + `MODELO_ITV` + `PROVINCIA_VEH` combination report more than one distinct `CILINDRADA_ITV` value
- THEN the value with the highest total `COUNT` across months is selected for the annual row
- AND a warning is printed to stderr identifying the brand, model, province, all conflicting values, and the chosen value
- AND processing continues normally

### Requirement: Selective annual recalculation

On each run, the system SHALL recalculate the annual province aggregate only for years in which at least one month was recalculated during that same run.

#### Scenario: Year with newly recalculated months

- WHEN at least one month within a given year had its monthly `acumulado-marca-modelo-provincia.csv` recalculated in this run
- THEN `acumulado-marca-modelo-provincia-anual.csv` for that year is regenerated
- AND the regeneration reads every existing monthly `acumulado-marca-modelo-provincia.csv` file for that year

#### Scenario: Year without newly recalculated months

- WHEN no month within a given year was recalculated in this run
- THEN that year's `acumulado-marca-modelo-provincia-anual.csv` is not regenerated in this run

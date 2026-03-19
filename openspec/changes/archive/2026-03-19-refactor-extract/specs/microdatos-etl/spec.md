## MODIFIED Requirements

### Requirement: Script location

The system SHALL place the main ETL scripts and all shared library modules inside the `/microdatos-etl/` directory.
Shared modules SHALL reside under `/microdatos-etl/lib/`.

#### Scenario: Repository structure

- WHEN the workflow runs
- THEN the command uses a script in `/microdatos-etl/`
- AND shared modules used by those scripts are located under `/microdatos-etl/lib/`

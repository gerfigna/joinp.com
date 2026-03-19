## ADDED Requirements

### Requirement: ESLint configuration exists at repo root
The repo SHALL have an `eslint.config.js` at the root that covers all JavaScript files in `microdatos-etl/` and `dgt-matriculaciones-moto/` with environment-appropriate settings (Node.js CommonJS for the ETL, browser script for the frontend).

#### Scenario: ETL files are linted with Node environment
- **WHEN** ESLint is run against `microdatos-etl/**/*.js`
- **THEN** it uses Node.js globals and CommonJS module syntax without errors

#### Scenario: Frontend files are linted with browser environment
- **WHEN** ESLint is run against `dgt-matriculaciones-moto/**/*.js`
- **THEN** it uses browser globals (e.g., `window`, `document`) without false `no-undef` errors

#### Scenario: `node_modules` is excluded
- **WHEN** ESLint is run from the repo root
- **THEN** it does not attempt to lint files inside any `node_modules/` directory

### Requirement: ESLint is a dev-dependency in microdatos-etl
The `microdatos-etl/package.json` SHALL list `eslint` as a `devDependency` and SHALL include a `lint` npm script that runs ESLint from the repo root.

#### Scenario: `npm run lint` succeeds on clean code
- **WHEN** a developer runs `npm run lint` from `microdatos-etl/`
- **THEN** ESLint exits with code 0 and reports no errors on code that follows the configured rules

#### Scenario: `npm run lint` fails on invalid code
- **WHEN** a developer runs `npm run lint` from `microdatos-etl/` on code that has an undefined variable
- **THEN** ESLint exits with a non-zero code and prints the offending file and line

### Requirement: GitHub Actions workflow runs ESLint on pull requests
A workflow file `.github/workflows/eslint.yml` SHALL exist that triggers on `pull_request` events targeting `main` and runs `npm run lint`.

#### Scenario: Workflow triggers on PR open
- **WHEN** a pull request targeting `main` is opened or a new commit is pushed to it
- **THEN** the `eslint / lint` GitHub Actions job starts automatically

#### Scenario: Clean code yields a passing check
- **WHEN** all linted files pass ESLint validation
- **THEN** the `eslint / lint` job completes with status `success`

#### Scenario: Lint errors yield a failing check
- **WHEN** any linted file has an ESLint error
- **THEN** the `eslint / lint` job completes with status `failure` and the PR cannot be merged (once branch protection is configured)

### Requirement: Core lint rules catch real bugs without false positives
The ESLint configuration SHALL enable at minimum the following rules as errors: `no-unused-vars`, `no-undef`, `eqeqeq`. `no-console` SHALL be a warning, not an error.

#### Scenario: Unused variable is flagged
- **WHEN** a JS file declares a variable that is never read or used
- **THEN** ESLint reports a `no-unused-vars` error

#### Scenario: Undefined reference is flagged
- **WHEN** a JS file references a name that is not declared and not a known global for that environment
- **THEN** ESLint reports a `no-undef` error

#### Scenario: Loose equality is flagged
- **WHEN** a JS file uses `==` or `!=` instead of `===` or `!==`
- **THEN** ESLint reports an `eqeqeq` error

#### Scenario: Console usage is warned but not blocked
- **WHEN** a JS file contains a `console.log` or similar call
- **THEN** ESLint reports a warning (exit code remains 0 in the absence of errors)

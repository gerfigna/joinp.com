## Why

JavaScript files in this repo have no automated style or quality check, so bugs and inconsistencies slip through unnoticed. Adding ESLint as a required PR check enforces a consistent baseline before any code reaches `main`.

## What Changes

- Add `eslint` (flat config, `eslint.config.js`) as a dev-dependency in `microdatos-etl/package.json`
- Add ESLint configuration covering the Node.js ETL scripts and vanilla-JS frontend files
- Add a new GitHub Actions workflow (`eslint.yml`) that runs ESLint on every PR targeting `main`
- Document branch protection requirement: the `eslint` check must pass before merging

## Capabilities

### New Capabilities

- `eslint-ci`: ESLint runs automatically on PRs; the workflow reports pass/fail as a required status check

### Modified Capabilities

<!-- none -->

## Impact

- **`microdatos-etl/package.json`**: gains `eslint` dev-dependency and a `lint` npm script
- **New file `eslint.config.js`** at repo root: flat-config covering `microdatos-etl/**/*.js` and `dgt-matriculaciones-moto/**/*.js` (browser env for the latter)
- **New file `.github/workflows/eslint.yml`**: CI job triggered on `pull_request` targeting `main`
- **Branch protection** (manual GitHub UI step): add `eslint / lint` as a required status check
- No changes to runtime behaviour, deployment, or data pipelines

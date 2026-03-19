## 1. ESLint dependency and npm script

- [x] 1.1 Add `eslint` as a `devDependency` in `microdatos-etl/package.json` (use the latest ESLint v9 release)
- [x] 1.2 Add a `"lint"` script to `microdatos-etl/package.json`: `"lint": "node ../node_modules/.bin/eslint .."`  (runs ESLint from repo root against all JS)
- [x] 1.3 Run `npm install` in `microdatos-etl/` to generate/update `package-lock.json`

## 2. ESLint flat configuration

- [x] 2.1 Create `eslint.config.js` at the repo root
- [x] 2.2 Add a block for `microdatos-etl/**/*.js` with `sourceType: "commonjs"`, `ecmaVersion: 2022`, and Node.js globals
- [x] 2.3 Add a block for `dgt-matriculaciones-moto/**/*.js` with `sourceType: "script"`, `ecmaVersion: 2020`, and browser globals
- [x] 2.4 Add global `ignores` for `**/node_modules/**` and `microdatos-etl/data/**`
- [x] 2.5 Enable rules in both blocks: `no-unused-vars: error`, `no-undef: error`, `eqeqeq: error`, `no-console: warn`

## 3. Fix pre-existing lint violations

- [x] 3.1 Run `npm run lint` from `microdatos-etl/` and capture the full output
- [x] 3.2 Fix or suppress (with inline `// eslint-disable-next-line` and a comment) any `error`-level findings in `microdatos-etl/` JS files
- [x] 3.3 Fix or suppress any `error`-level findings in `dgt-matriculaciones-moto/` JS files (if any extracted `.js` files exist)
- [x] 3.4 Confirm `npm run lint` exits 0 before proceeding

## 4. GitHub Actions workflow

- [x] 4.1 Create `.github/workflows/eslint.yml` with a job named `lint` under the workflow name `eslint`
- [x] 4.2 Configure the trigger: `on: pull_request: branches: [main]`
- [x] 4.3 Add steps: `actions/checkout@v4`, `actions/setup-node@v4` (node-version: `'20'`), `npm install` in `microdatos-etl/`, and `npm run lint` in `microdatos-etl/`

## 5. Verification

- [x] 5.1 Open a test PR (or push to an existing one) and confirm the `eslint / lint` check appears in the PR status checks
- [x] 5.2 Confirm the check passes on clean code and fails when a deliberate lint error is introduced
- [x] 5.3 In GitHub repo settings → Branches → protection rule for `main`, add `eslint / lint` as a required status check — MANUAL STEP: must be done via GitHub UI after the workflow runs once

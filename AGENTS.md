# AGENTS.md — joinp.com

## Project Overview

`joinp.com` is a GitHub Pages monorepo that publishes interactive dashboards about vehicle registrations in Spain using open data from the DGT (Dirección General de Tráfico). The main feature is a motorcycle registrations dashboard (`dgt-matriculaciones-moto/`) fed by a Node.js ETL (`microdatos-etl/`) that runs on a scheduled GitHub Actions workflow every 6 hours.

---

## Repository Structure

```
joinp.com/
├── index.html                          # Domain landing page
├── CNAME                               # Custom domain (joinp.com)
├── 404.html
├── dgt-matriculaciones-moto/
│   └── index.html                      # Motorcycle registrations dashboard (vanilla HTML/CSS/JS)
├── microdatos-etl/
│   ├── download-microdatos.js          # Main ETL: downloads daily DGT ZIPs → writes daily + monthly CSVs
│   ├── download-microdatos-mensual.js  # Monthly re-aggregation helper
│   ├── package.json                    # Single dependency: adm-zip
│   ├── lib/                            # Shared ETL modules
│   │   ├── constants.js                # DATA_DIR shared base path
│   │   ├── fields.js                   # FIELDS array, FIELD_MAP, getField()
│   │   ├── normalize.js                # Brand/province normalization tables and functions
│   │   ├── http.js                     # httpGet() with redirect following
│   │   ├── zip.js                      # extractTxtFromZip()
│   │   ├── filter.js                   # isMotorcycleRow() predicate, extractRowFields()
│   │   └── aggregate.js                # writeAggregates() and CSV path helpers
│   └── data/
│       └── YYYY/MM/
│           ├── DD.csv                              # Daily filtered records
│           └── acumulado-marca-modelo-provincia.csv # Monthly aggregation by brand + model + province
├── openspec/                           # SDD artifacts (legacy openspec, all archived)
└── .github/workflows/
    ├── microdatos-etl.yml              # Scheduled ETL every 6h + manual dispatch
    ├── claude.yml                      # Claude Code bot (@claude in issues/PRs)
    └── claude-code-review.yml          # Automated PR review
```

---

## How to Run / Develop

### Run the ETL locally

```bash
cd microdatos-etl
npm install          # installs adm-zip only
node download-microdatos.js
```

This downloads new daily ZIPs from the DGT listing page, processes only dates whose `data/YYYY/MM/DD.csv` does not yet exist, and regenerates the monthly aggregation CSV for affected months.

### Re-aggregate a specific month

```bash
cd microdatos-etl
node download-microdatos-mensual.js
```

### View the dashboard locally

Open `dgt-matriculaciones-moto/index.html` directly in a browser. The dashboard loads CSVs via `fetch()` using relative paths (`../microdatos-etl/data/...`), so it works from the filesystem without a server.

### CI/CD

- The ETL workflow (`microdatos-etl.yml`) runs automatically every 6 hours. It commits new data directly to `main` with the message `"Update microdatos-etl data"`.

---

## Key Conventions

### Data filtering (ETL)

Only records matching ALL of these criteria are kept:
- `COD_TIPO === "50"` (motorcycles)
- `CLAVE_TRAMITE === "1"` (new registration)
- `IND_NUEVO_USADO === "N"` (new vehicle)
- `FABRICANTE_ITV !== "ND"` (known manufacturer)
- `CILINDRADA_ITV` is non-empty and not `"0"`

### CSV column names

Daily CSVs use these columns (exactly):
`FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`, `PROVINCIA_VEH`, `CILINDRADA_ITV`

Monthly aggregation CSVs:
- `acumulado-marca-modelo-provincia.csv`: `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT`

### Model normalization

Model names are normalized before writing CSVs. Rules are per-brand and use exact match or prefix match. When a `brand + model` combination has multiple `CILINDRADA_ITV` values in the same month, the most frequent one is used and a warning is emitted — this is expected behavior, not a bug.

### Province mapping

`COD_PROVINCIA_VEH` (2-digit code) is mapped to a human-readable `PROVINCIA_VEH` string. The mapping lives in `lib/normalize.js`.

### Frontend

- No build step, no bundler, no framework. Vanilla HTML/CSS/JS only.
- Chart.js 4.4.0 is loaded via CDN (`https://cdn.jsdelivr.net/npm/chart.js`).
- CSV data is fetched at runtime using `fetch()` with relative paths.
- Each project lives in its own subdirectory and is fully self-contained.
- Do not add npm dependencies or build tooling to the frontend.

### Shared ETL logic

Shared ETL logic lives in `microdatos-etl/lib/`. Add new shared logic there, not inline in the ETL scripts.

### File paths

- All new projects must be created as subdirectories of the repo root (e.g., `new-project/index.html`).
- Never place data files outside `microdatos-etl/data/`.
- Temporary ZIP/TXT files from the ETL must not be committed or left in `microdatos-etl/data/`.

---

## What NOT to Do / Gotchas

- **Do not modify `main` branch history.** The ETL workflow commits directly to `main` on a schedule; force-pushing or rebasing will break it.
- **Do not add a build step to the frontend.** GitHub Pages serves static files from the repo root on `main` with no build phase.
- **Do not change CSV column names or file path patterns** without updating both `download-microdatos.js` and `dgt-matriculaciones-moto/index.html` — they are tightly coupled.
- **Do not commit ZIP or TXT files.** DGT source files are transient; only the generated CSVs under `microdatos-etl/data/` should be committed.
- **Do not skip the existence check** in the ETL (`DD.csv` already exists → skip). Re-downloading already-processed days wastes bandwidth and can produce duplicate data if re-run.
- **Do not assume the dashboard runs on a server.** It is opened directly as a local file or served as a static file; no server-side logic is available.
- **There is no test suite.** Validate ETL changes by running locally and inspecting the generated CSVs before pushing.

---

## Architecture Decisions

- **Monorepo on GitHub Pages**: each sub-project is a self-contained directory. There is no separate backend or API.
- **CSVs as the data contract**: the ETL writes CSVs; the dashboard reads them. Changing their schema requires updating both sides simultaneously.
- **Scheduled ETL via GitHub Actions**: no external scheduler or database. Data freshness is limited to ~6-hour windows.
- **No framework, no bundler**: keeps deployment trivial (push to `main` = live). Any change to the frontend is immediately reflected after the Pages deploy.
- **Model normalization in ETL, not frontend**: normalization rules are centralized in `lib/normalize.js` to keep the frontend dumb and the data clean at rest.

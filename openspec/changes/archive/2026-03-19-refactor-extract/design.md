## Context

The `microdatos-etl/` directory contains two Node.js CommonJS scripts:

- `download-microdatos.js` — daily ETL (~300 lines): downloads new ZIP files for each missing date, extracts rows, and writes per-date CSV + updates monthly aggregates.
- `download-microdatos-mensual.js` — monthly ETL (~300 lines): reads all existing daily CSVs for a given month and rewrites the monthly aggregates.

Approximately 250 lines — 60% of each file — are byte-for-byte duplicates: field definitions, normalization tables, HTTP utility, ZIP extraction, aggregate writing, and the row filter predicate. The monthly script even has a `// keep in sync` comment acknowledging the duplication.

The codebase uses plain Node.js (v18+), CommonJS (`require()`), no bundler, no TypeScript, no test suite.

## Goals / Non-Goals

**Goals:**
- Eliminate all duplicated code by extracting it into `microdatos-etl/lib/` modules.
- Reduce each ETL script to its unique orchestration logic (~80-100 lines each).
- Ensure no behavioral changes: identical CSV outputs before and after.

**Non-Goals:**
- Introducing a test suite (no test infrastructure exists; out of scope).
- Converting to ES modules or TypeScript.
- Changing any ETL behavior, scheduling, output format, or downstream consumers.
- Merging the two ETL scripts into one.

## Decisions

### Decision 1: Flat `lib/` directory, one file per concern

**Chosen**: `microdatos-etl/lib/{constants,fields,normalize,http,zip,filter,aggregate}.js`

**Alternatives considered**:
- Single `shared.js` file: simpler, but creates a large module with mixed concerns and makes future splits harder.
- Nested structure (`lib/io/`, `lib/data/`): over-engineered for 7 small files.

**Rationale**: One file per concern maps directly to the duplicated blocks, makes each module easy to find and replace, and keeps the `require()` paths short.

### Decision 2: Do not extract `processTxt`

**Chosen**: Leave the full `processTxt` function in each script.

**Context**: The daily ETL accumulates rows into an array; the monthly ETL accumulates them into a Map keyed by brand+model. The two functions share the filter predicate and field extraction, but diverge in accumulation.

**What IS extracted**: The filter predicate (`isMotorcycleRow`) and field extraction helper (`extractRowFields`) go into `lib/filter.js`. Each script's `processTxt` calls these helpers but retains its own accumulation loop.

**Rationale**: A shared `processTxt` would require a callback or strategy parameter, adding indirection with no readability gain. Keeping accumulation in each script preserves clarity.

### Decision 3: Extract order — normalize first

**Chosen**: Implement in this order: `normalize.js` → `fields.js` → `aggregate.js` → `http.js` + `zip.js` → `filter.js`.

**Rationale**: `normalize.js` carries the highest maintenance risk (the `// keep in sync` comment targets this block). Starting there delivers the most value earliest and validates the module pattern before touching plumbing code.

### Decision 4: No new npm dependencies

**Chosen**: All lib modules use only Node.js built-ins (`fs`, `path`, `http`, `https`, `zlib`, `stream`).

**Rationale**: The existing ETL has zero npm dependencies for its core logic. Adding a dependency (e.g., `axios`, `adm-zip`) would require a `package.json` change, a lock file update, and CI changes — all out of scope.

### Decision 5: CommonJS `module.exports`, not ESM

**Chosen**: Each lib file uses `module.exports = { ... }`.

**Rationale**: Both ETL scripts use `require()` throughout. Mixing ESM would require `.mjs` extensions or `"type": "module"` in `package.json`, which is a separate migration.

## Risks / Trade-offs

**Runtime regression if extraction introduces subtle differences** → Mitigation: Extract byte-for-byte where possible; review git diff of each script after extraction to confirm only `require()` additions and removed duplicate blocks remain. Run both scripts manually against a test date before merging.

**`aggregate.js` path helpers may diverge between daily and monthly** → The `monthDir`, `monthlyPath`, `brandMonthlyPath`, and `provinciaMonthlyPath` helpers are near-identical; any subtle difference must be resolved before extraction. Mitigation: Diff the two implementations explicitly during the `aggregate.js` task.

**No automated regression test** → There is no test suite to catch output differences. Mitigation: After extraction, run the daily ETL against a date not yet in `data/` and compare output CSV to the version produced before extraction (or compare against the monthly ETL output for the same month).

## Migration Plan

1. Create `microdatos-etl/lib/` directory.
2. Extract modules in the order defined in Decision 3, one module at a time.
3. After each module: update both ETL scripts to `require()` the new module, delete the now-redundant block, and verify the scripts still parse without errors (`node --check`).
4. After all modules are extracted: run both ETL scripts in a dry-run / test environment and confirm CSV outputs are unchanged.
5. Remove the `// keep in sync` comment from `download-microdatos-mensual.js`.
6. Commit with message referencing this change.

**Rollback**: Because this is a pure refactor with no behavior change, rollback is a revert of the commits introducing `lib/`. No data migration needed.

## Open Questions

None. The scope is fully bounded by the existing duplicated code.

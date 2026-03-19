## Why

The two ETL scripts (`download-microdatos.js` and `download-microdatos-mensual.js`) share ~250 lines of duplicated code — approximately 60% of each file. A `// keep in sync` comment in the monthly script confirms the duplication is already a known maintenance burden. Extracting the shared code now reduces the risk of logic drift and makes each ETL script easier to read and modify.

## What Changes

- New `microdatos-etl/lib/` directory with six shared modules extracted from both ETL scripts.
- `microdatos-etl/download-microdatos.js` shrinks from ~300 lines to ~80-100 lines; only daily-specific accumulation logic remains.
- `microdatos-etl/download-microdatos-mensual.js` shrinks from ~300 lines to ~80-100 lines; only monthly-specific accumulation logic remains.
- The `// keep in sync` comment and the duplicated blocks it refers to are eliminated.
- No changes to ETL behavior, output files, or downstream consumers (the `dgt-matriculaciones-moto/` dashboard reads only the CSV output, which is unaffected).

## Capabilities

### New Capabilities

- `microdatos-etl-shared-lib`: Shared library modules (`lib/constants.js`, `lib/fields.js`, `lib/normalize.js`, `lib/http.js`, `lib/zip.js`, `lib/filter.js`, `lib/aggregate.js`) used by both ETL scripts.

### Modified Capabilities

- `microdatos-etl`: Internal implementation of both ETL scripts changes — each script now `require()`s from `lib/` instead of containing the duplicated code inline. No behavioral changes to ETL outputs or scheduling.

## Impact

- **Files created**: `microdatos-etl/lib/constants.js`, `fields.js`, `normalize.js`, `http.js`, `zip.js`, `filter.js`, `aggregate.js`
- **Files modified**: `microdatos-etl/download-microdatos.js`, `microdatos-etl/download-microdatos-mensual.js`
- **No changes to**: CSV output format, GitHub Actions workflow, `dgt-matriculaciones-moto/` dashboard, `package.json` (no new dependencies — Node.js built-ins only)

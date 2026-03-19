## Context

The repo contains two JavaScript surfaces:

1. **`microdatos-etl/`** — Node.js CommonJS scripts (Node 20, no TypeScript, no bundler). Already has its own `package.json` with `adm-zip` as the only runtime dependency.
2. **`dgt-matriculaciones-moto/index.html`** — Inline vanilla JS in a single HTML file, browser environment.

There is no root `package.json`, and no existing ESLint configuration anywhere in the repo. The existing CI workflows are a scheduled ETL job and a Claude code-review job; neither enforces code quality gates.

## Goals / Non-Goals

**Goals:**

- Enforce a consistent, pragmatic ESLint baseline for all JS in the repo
- Fail PRs automatically when ESLint reports errors
- Keep configuration simple — single flat config at the repo root

**Non-Goals:**

- Formatting (Prettier is out of scope)
- TypeScript linting (no TS in this project)
- Auto-fixing commits from CI
- Enforcing branch protection rules via Terraform/IaC (manual UI step is acceptable)

## Decisions

### 1. Flat config (`eslint.config.js`) at repo root

ESLint flat config is the default since ESLint v9 and aligns with Node 20 (already used in CI). A single root-level config file covers both the ETL scripts and the frontend without needing per-directory configs.

**Alternatives considered:**
- `.eslintrc.js` (legacy format) — still supported but being phased out; flat config is the forward-compatible choice.
- Per-directory configs — unnecessary complexity for a two-surface repo.

### 2. `eslint` installed in `microdatos-etl/package.json` as dev-dependency

The only `package.json` in the repo lives in `microdatos-etl/`. Adding `eslint` there keeps the dependency manifest co-located with the existing `npm install` step in the ETL workflow.

The ESLint CI job will `npm install` from `microdatos-etl/` to get the binary, then invoke it from the repo root using `../node_modules/.bin/eslint`.

**Alternatives considered:**
- Root-level `package.json` — would be cleaner long-term but introduces a new manifest with no other content; too much churn for now.
- `npx eslint` without installation — works but is slower and less deterministic in CI.

### 3. Two separate `languageOptions` blocks in flat config

- ETL scripts (`microdatos-etl/**/*.js`): `env: node`, `sourceType: commonjs`, `ecmaVersion: 2022`
- Frontend (`dgt-matriculaciones-moto/**/*.js` and inline scripts via the HTML file): `env: browser`, `sourceType: script`, `ecmaVersion: 2020`

The frontend JS is inline in `index.html`; ESLint does not lint HTML by default so the browser-env block primarily future-proofs for extracted `.js` files.

**Alternatives considered:**
- Single global config with both `node` and `browser` globals — mixes environments and could mask real bugs (e.g., using `window` in Node code).

### 4. Pragmatic rule set — errors only for real bugs

Rules enabled as errors:
- `no-unused-vars` — catches dead code
- `no-undef` — catches missing imports / typos
- `eqeqeq` — prevents type-coercion surprises
- `no-console` set to `warn` (not error) for ETL scripts where console output is intentional

No stylistic rules (indentation, quotes, semi) — those belong to a formatter.

### 5. Separate GitHub Actions workflow file (`eslint.yml`)

Keeps CI concerns separated. The new job name `eslint / lint` is what GitHub uses as the status check identifier for branch protection.

## Risks / Trade-offs

- **Existing code may have lint errors** → The first PR after this is merged will need a "fix lint" commit or the workflow will block it. Recommended: run ESLint locally before merging the setup PR itself.
- **`no-undef` can produce false positives in browser globals** → Mitigated by setting `env: browser` for the frontend block, which adds all standard browser globals.
- **ESLint binary path coupling** → The CI job hard-codes `microdatos-etl/node_modules/.bin/eslint`. If `package.json` ever moves, the workflow path must be updated. This is acceptable for now given the small repo size.

## Migration Plan

1. Install ESLint locally, run `npx eslint .` to audit existing errors
2. Fix or `// eslint-disable-next-line` any pre-existing violations before merging
3. Merge the setup PR — the `eslint.yml` workflow activates immediately for subsequent PRs
4. In GitHub repo settings → Branches → Branch protection rules for `main`, add `eslint / lint` as a required status check

Rollback: delete `eslint.yml` and remove `eslint` from `package.json`. No runtime files are affected.

## Open Questions

- Should `no-console` be an error for frontend code? (Currently set to `warn` everywhere — can tighten later.)
- Is branch protection already enabled on `main`? If not, it must be enabled before required status checks can be added.

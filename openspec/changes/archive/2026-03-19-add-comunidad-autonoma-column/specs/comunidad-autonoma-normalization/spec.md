## ADDED Requirements

### Requirement: Province-code to community map
`normalize.js` SHALL export a `PROVINCIA_TO_COMUNIDAD` constant: a plain object keyed by 2-letter province code (same keys as `PROVINCE_MAP`, e.g. `"B"`, `"MA"`) whose values are the canonical autonomous community name in Spanish.

The map SHALL cover all codes present in `PROVINCE_MAP`, including `"CE"` (Ceuta), `"ML"` (Melilla), `"DS"` (Desconocido), and `"EX"` (Extranjero).

#### Scenario: Known code returns its community
- **WHEN** `PROVINCIA_TO_COMUNIDAD["B"]` is accessed
- **THEN** the value is `"Cataluña"`

#### Scenario: Special codes are mapped
- **WHEN** `PROVINCIA_TO_COMUNIDAD["DS"]` or `PROVINCIA_TO_COMUNIDAD["EX"]` is accessed
- **THEN** a non-null string is returned (e.g., `"Desconocido"` / `"Extranjero"`)

#### Scenario: Every PROVINCE_MAP key has an entry
- **WHEN** every key in `PROVINCE_MAP` is used to index `PROVINCIA_TO_COMUNIDAD`
- **THEN** none of them return `undefined`

### Requirement: normalizeComunidad function
`normalize.js` SHALL export a `normalizeComunidad(code)` function that returns the autonomous community name for the given 2-letter province code.

If the code is not found in `PROVINCIA_TO_COMUNIDAD`, the function SHALL return the input unchanged and SHALL emit a `console.warn` indicating the unknown code.

#### Scenario: Known code
- **WHEN** `normalizeComunidad("M")` is called
- **THEN** it returns `"Comunidad de Madrid"`

#### Scenario: Unknown code falls back gracefully
- **WHEN** `normalizeComunidad("XX")` is called
- **THEN** it returns `"XX"` and prints a warning to stderr

#### Scenario: Function is analogous to normalizeProvince
- **WHEN** both `normalizeProvince(code)` and `normalizeComunidad(code)` are called with the same valid code
- **THEN** both return a non-empty string without warnings

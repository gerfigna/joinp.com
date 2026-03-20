# Proposal: Eliminar la generación de ficheros CSV acumulado-marca.csv y acumulado-marca-modelo.csv

## Intent

El dashboard (`dgt-matriculaciones-moto/index.html`) solo consume `acumulado-marca-modelo-provincia.csv`. Los ficheros `acumulado-marca.csv` y `acumulado-marca-modelo.csv` son generados por el ETL pero nunca utilizados por ningún consumidor. Esto genera escritura innecesaria de archivos, confusión sobre qué ficheros son "oficiales", y两份 de lógica de agregación que no aporta valor.

## Scope

### In Scope
- Eliminar la escritura de `acumulado-marca.csv` y `acumulado-marca-modelo.csv` en `writeAggregates()` (`lib/aggregate.js`)
- Eliminar las funciones auxiliares `monthlyPath()` y `brandMonthlyPath()` de `lib/aggregate.js` (ya no se usan)
- Actualizar `openspec/specs/microdatos-etl/spec.md` para eliminar los requisitos relacionados
- Actualizar `openspec/config.yaml` y `AGENTS.md` para reflejar que solo se genera `acumulado-marca-modelo-provincia.csv`
- Eliminar los ficheros `acumulado-marca.csv` y `acumulado-marca-modelo.csv` existentes en `data/`
- Actualizar `README.md` y comentarios en `download-microdatos-mensual.js` que mencionen estos ficheros

### Out of Scope
- Cambios en el dashboard (ya usa solo `acumulado-marca-modelo-provincia.csv`)
- Reestructuración del agregador o la función `recalculateMonthly`
- Creación de nuevos agregados

## Approach

1. Modificar `writeAggregates()` en `lib/aggregate.js` para escribir únicamente `acumulado-marca-modelo-provincia.csv`
2. Eliminar `monthlyPath()` y `brandMonthlyPath()` del módulo (quedan huérfanas)
3. Actualizar `download-microdatos-mensual.js`: limpiar comentarios que mencionen los CSV eliminados; eliminar `monthlyPath` del destructuring en la línea 43
4. Actualizar specs y documentación
5. Ejecutar `git rm` en todos los `acumulado-marca.csv` y `acumulado-marca-modelo.csv` existentes en `data/`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `microdatos-etl/lib/aggregate.js` | Modified | Eliminar escritura de 2 de 3 CSVs; eliminar 2 funciones helper |
| `microdatos-etl/download-microdatos-mensual.js` | Modified | Limpiar comentarios y imports huérfanos |
| `openspec/specs/microdatos-etl/spec.md` | Modified | Eliminar requisitos de agregado-marca y agregado-marca-modelo |
| `openspec/config.yaml` | Modified | Actualizar fuentes de datos listadas |
| `AGENTS.md` | Modified | Actualizar descripción de CSV de agregación mensual |
| `README.md` | Modified | Eliminar menciones a los 2 CSV eliminados |
| `microdatos-etl/data/**/**/acumulado-marca.csv` | Removed | ~15 ficheros eliminados |
| `microdatos-etl/data/**/**/acumulado-marca-modelo.csv` | Removed | ~15 ficheros eliminados |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Algún script externo o herramienta lee estos CSV | Low | El único consumidor conocido es el dashboard que usa provincia; verificar con búsqueda en todo el repo antes de ejecutar |
| Rollback difícil por volumen de ficheros eliminados | Low | Los ficheros se pueden regenerar ejecutando el ETL con reproceso; guardar sha del commit anterior |

## Rollback Plan

1. `git revert` del commit que aplica este cambio regenera todos los CSV eliminados (son generados por el ETL)
2. Alternativamente, restaurar `lib/aggregate.js` y specs desde el commit anterior: `git checkout HEAD~1 -- microdatos-etl/lib/aggregate.js openspec/specs/microdatos-etl/spec.md`
3. Los ficheros de datos eliminados se regeneran automáticamente en la siguiente ejecución ETL

## Dependencies

- Ninguna dependencia externa. El dashboard ya funciona con solo `acumulado-marca-modelo-provincia.csv`

## Success Criteria

- [ ] `writeAggregates()` solo escribe `acumulado-marca-modelo-provincia.csv`
- [ ] `monthlyPath()` y `brandMonthlyPath()` eliminadas de `lib/aggregate.js`
- [ ] Spec actualizado: requisitos de agregado-marca y agregado-marca-modelo eliminados
- [ ] Documentación (`AGENTS.md`, `README.md`, `config.yaml`) actualizada
- [ ] Ficheros existentes `acumulado-marca.csv` y `acumulado-marca-modelo.csv` en `data/` eliminados
- [ ] Dashboard sigue funcionando correctamente tras el cambio

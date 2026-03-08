## Context

El ETL (`microdatos-etl/download-microdatos.js`) ya produce un CSV mensual agrupado por marca y modelo (`acumulado-marca-modelo.csv`) mediante la función `recalculateMonthly`. El nuevo reporte `acumulado-marca.csv` es una agregación de nivel superior: suma de `COUNT` por `MARCA_ITV` únicamente, sin desglose de modelo.

## Goals / Non-Goals

**Goals:**
- Generar `/microdatos-etl/data/YYYY/MM/acumulado-marca.csv` con columnas `MARCA_ITV,COUNT` en cada recalculación mensual.
- Reutilizar exactamente la misma lógica de activación selectiva (solo meses con nuevos datos).

**Non-Goals:**
- No se crea un nuevo comando, workflow, ni dependencia npm.
- No se modifica el formato ni la frecuencia del `acumulado-marca-modelo.csv` existente.
- No se expone el CSV vía ninguna API ni interfaz web en este cambio.

## Decisions

**Reutilizar `recalculateMonthly` vs. función separada**

Se extiende la función `recalculateMonthly` existente en lugar de crear una función independiente. Ambos archivos se generan en la misma pasada sobre los ficheros diarios, evitando una segunda lectura del disco.

Alternativa considerada: función `recalculateMonthlyByBrand` separada — descartada porque duplicaría la lectura de ficheros diarios y añadiría complejidad sin beneficio.

**Derivar `acumulado-marca` desde los ficheros diarios (no desde `acumulado-marca-modelo.csv`)**

La fuente de verdad son los ficheros diarios `DD.csv`. Derivar el acumulado de marca desde el CSV de marca-modelo requeriría parsear un formato diferente y sumar columnas, lo que es más frágil. Leer directamente los ficheros diarios mantiene una fuente de verdad única.

## Risks / Trade-offs

- [Riesgo] Aumento marginal de tiempo de I/O en `recalculateMonthly` — Mitigación: el volumen de ficheros diarios por mes es bajo (≤31), impacto despreciable.
- [Trade-off] Los dos acumulados siempre se regeneran juntos; no es posible regenerar solo uno. Aceptable dado que comparten la misma fuente y lógica de activación.

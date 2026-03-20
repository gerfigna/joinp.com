# Proposal: Nuevo ETL para acumulados por marca y por rangos de potencia (KW_ITV)

## Intent

Crear un nuevo script de ETL (`download-microdatos-potencia.js`) que genera acumulados mensuales y anuales por marca y por rangos de potencia (KW_ITV) a partir de los ficheros ZIP mensuales de la DGT. Los datos actuales (acumulado-marca-modelo-provincia) no se tocan.

## Scope

### In Scope
- Nuevo script `download-microdatos-potencia.js` que descarga ZIPs mensuales de la DGT
- Extracción del campo `KW_ITV` (posición 227 en fields.js)
- 4 nuevos ficheros CSV por mes/año:
  - `data/YYYY/MM/acumulado-marca-mensual.csv` → `MARCA_ITV,COUNT`
  - `data/YYYY/MM/acumulado-potencia-mensual.csv` → `RANGO_POTENCIA,COUNT`
  - `data/YYYY/acumulado-marca-anual.csv` → `MARCA_ITV,COUNT`
  - `data/YYYY/acumulado-potencia-anual.csv` → `RANGO_POTENCIA,COUNT`
- Rangos de potencia: `Hasta 11 kW` (≤11), `11-35 kW` (>11 y ≤35), `Más de 35 kW` (>35)
- Verificación de existencia por fichero de salida (no por mes) para coexistir con el ETL diario
- Recalculo anual completo tras procesar cada mes nuevo

### Out of Scope
- Modificación de `download-microdatos.js` o `download-microdatos-mensual.js`
- Actualización del dashboard (`index.html`) para mostrar los nuevos datos
- Ficheros `acumulado-marca-modelo-provincia.csv` existentes

## Approach

**Approach C (Hybrid):** Script nuevo + módulo compartido.

1. `lib/filter.js` — nueva función `extractPowerFields()` para extraer MARCA_ITV + KW_ITV
2. `lib/power-aggregate.js` — nuevo módulo con clase `PowerAggregator` y funciones de escritura
3. `download-microdatos-potencia.js` — script principal, sigue el mismo patrón que `download-microdatos-mensual.js` (mismas URLs, mismo httpGet, misma extracción ZIP)
4. KW_ITV vacío/inválido → se omite la fila del agregado (no se incluye en ningún rango)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `microdatos-etl/lib/filter.js` | Modified | Nueva función extractPowerFields() |
| `microdatos-etl/lib/power-aggregate.js` | New | PowerAggregator + writeMarcaMonthly/Annual, writePotenciaMonthly/Annual |
| `microdatos-etl/download-microdatos-potencia.js` | New | Script principal, copia patrón de download-microdatos-mensual.js |
| `microdatos-etl/package.json` | No change | No nuevas dependencias |
| `.github/workflows/microdatos-etl.yml` | Modified | Añadir nuevo script al workflow |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| KW_ITV vacío o 0 en muchas filas de moto | High | Omitir filas sin KW_ITV válido; logging informativo |
| Concurrencia con ETL diario (mismo mes) | Low | Verificar existencia por fichero de salida |
| Recalculo anual ineficiente (12 veces para 2025) | Low | Aceptable dado el volumen |

## Rollback Plan

Eliminar `download-microdatos-potencia.js` y `lib/power-aggregate.js`. Regenerar `acumulado-marca-modelo-provincia.csv` corriendo `download-microdatos-mensual.js`. Los 4 nuevos ficheros CSV pueden borrarse sin impacto en datos existentes.

## Dependencies

- DGT: URLs mensuales de la DGT — mismo patrón que `download-microdatos-mensual.js`
- `lib/fields.js`: KW_ITV ya definido en posición 227
- `lib/http.js`, `lib/zip.js`: reusados tal cual

## Success Criteria

- [ ] `download-microdatos-potencia.js` genera los 4 ficheros CSV correctos para un mes dado
- [ ] KW_ITV vacío/inválido se omite sin romper el script
- [ ] Al procesar un mes nuevo, los ficheros anuales se recalculan con todos los meses disponibles
- [ ] Si el fichero de salida mensual ya existe, el script lo omite
- [ ] Sin nuevas dependencias en `package.json`
- [ ] Logging claro: mes procesado, filas válidas, KW_ITV omitidos

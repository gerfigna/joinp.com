## Technical Approach

Nuevo script `download-microdatos-mes.js` que replica el patrón del ETL mensual existente (`download-microdatos-mensual.js`): descarga ZIPs mensuales de la DGT, filtra filas de moto con `isMotorcycleRow` (reusado), extrae `MARCA_ITV` + `KW_ITV`, y escribe 4 ficheros CSV agregados por mes/año. Sin modificar ningún código existente.

## Architecture Decisions

### Decision: Reusar `isMotorcycleRow` para filtrado

**Choice**: Reusar la función `isMotorcycleRow` existente en `lib/filter.js` (sin cambios).
**Rationale**: Ya filtra `COD_TIPO="50"`, `CLAVE_TRAMITE="1"`, `IND_NUEVO="N"`, fabricante conocido y cilindrada > 0. KW_ITV se filtra en `extractPowerFields`, no en el predicate.

### Decision: Nuevo módulo `lib/power-aggregate.js`

**Choice**: Crear `lib/power-aggregate.js` con clase `PowerAggregator` que gestiona state en memoria y escrituras CSV.
**Rationale**: El script necesita mantener state entre meses para recalcular acumulados anuales. Una clase con métodos `add()`, `writeMonthly(year, month)` y `writeAnnual(year)` es el patrón más limpio y permite tests unitarios.

### Decision: Detección de meses a procesar por directorio existente

**Choice**: Escanear `data/` buscando directorios `YYYY/MM/` que contengan un daily CSV (`DD.csv`), y verificar el fichero de salida.
**Rationale**: El ETL diario crea directorios `YYYY/MM/` con `DD.csv` files. Escanear `data/` permite funcionar automáticamente para cualquier mes futuro sin hardcodear listas.

### Decision: Recalcular año completo tras procesar cada mes nuevo

**Choice**: Tras procesar un mes nuevo, leer todos los `acumulado-marca-mensual.csv` disponibles del mismo año y reescribir los anuales.
**Rationale**: Simplifica la lógica — no necesita tracking de estado entre ejecuciones. Coste aceptable: máximo 12 lecturas de CSV por ejecución.

## Data Flow

```
DGT monthly ZIP (YYYYMM)
    │
    ▼
download-microdatos-mes.js
    │  ① download (httpGet)
    │  ② extract .txt (extractTxtFromZip)
    │  ③ filter lines (isMotorcycleRow)
    │  ④ extract fields (extractPowerFields)
    ▼
PowerAggregator.add(marca, kw)
    │  - Counts by MARCA_ITV
    │  - Counts by RANGO_POTENCIA
    ▼
writeMarcaMonthly / writePotenciaMonthly  ──►  data/YYYY/MM/*.csv
    │
    │  (after processing month)
    ▼
readAllMonthly(year) ──► writeMarcaAnnual / writePotenciaAnnual  ──►  data/YYYY/*.csv
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `microdatos-etl/lib/filter.js` | Modify | Añadir `extractPowerFields(line)` que devuelve `{ marca, kw }` |
| `microdatos-etl/lib/power-aggregate.js` | Create | Clase `PowerAggregator`, `getPowerRange(kw)`, funciones de escritura CSV |
| `microdatos-etl/download-microdatos-mes.js` | Create | Script principal |
| `.github/workflows/microdatos-etl.yml` | Modify | Añadir step para `node download-microdatos-mes.js` |

## Interfaces / Contracts

### KW_ITV → RANGO_POTENCIA

```javascript
function getPowerRange(kw) {
  const n = parseFloat(kw);
  if (!kw || isNaN(n) || n <= 0) return null;
  if (n <= 11)  return 'Hasta 11 kW';
  if (n <= 35)  return '11-35 kW';
  return 'Más de 35 kW';
}
```

### PowerAggregator API

```javascript
class PowerAggregator {
  constructor()  // this.marcaCounts = Map, this.potenciaCounts = Map
  add(marca, kw) // Classifies kw → range, increments both counters
  writeMonthly(year, month)  // Writes 2 CSV files for the month
  writeAnnual(year)          // Reads all monthly CSVs for year, writes 2 annual CSVs
}

function getPowerRange(kw)   // → string | null
function marcaMonthlyPath(year, month)
function potenciaMonthlyPath(year, month)
function marcaAnnualPath(year)
function potenciaAnnualPath(year)
```

### CSV Output Formats

`data/YYYY/MM/acumulado-marca-mensual.csv`:
```
MARCA_ITV,COUNT
"MARCA_1",123
```

`data/YYYY/MM/acumulado-potencia-mensual.csv`:
```
RANGO_POTENCIA,COUNT
"Até 11 kW",456
"11-35 kW",789
"Más de 35 kW",101
```

`data/YYYY/acumulado-marca-anual.csv` y `data/YYYY/acumulado-potencia-anual.csv`: misma estructura, suma anual.

## Open Questions

- [ ] ¿Qué URL usa la DGT para los ZIPs mensuales? ¿Es la misma que `download-microdatos-mensual.js`?
- [ ] ¿Queremos que el workflow corra `download-microdatos-mes.js` cada 6h o con schedule separado (ej. daily)?
- [ ] ¿KW_ITV puede contener valores decimales o solo enteros?

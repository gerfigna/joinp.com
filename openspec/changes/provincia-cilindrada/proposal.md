## Why

Los datos diarios y los agregados mensuales actuales no incluyen información geográfica ni de cilindrada. Añadir `COD_PROVINCIA_VEH` y `CILINDRADA_ITV` permite análisis más ricos por provincia y segmento de motor, que son dimensiones clave para entender el mercado de matriculaciones de motos en España.

## What Changes

- Los CSV diarios (`DD.csv`) incluirán `COD_PROVINCIA_VEH` y `CILINDRADA_ITV` además de los cinco campos actuales. Los archivos diarios existentes se eliminarán para regenerarlos con el nuevo formato completo.
- El agregado mensual `acumulado-marca-modelo.csv` incluirá `CILINDRADA_ITV` como campo adicional.
- Se creará un nuevo agregado mensual `acumulado-marca-modelo-provincia.csv` con los campos `MARCA_ITV`, `MODELO_ITV`, `COD_PROVINCIA_VEH`, `CILINDRADA_ITV` y `COUNT`.
- Se añadirá una validación que garantiza que cada combinación `MARCA_ITV + MODELO_ITV` tiene siempre el mismo valor de `CILINDRADA_ITV`. Si se detecta inconsistencia, el script terminará con un error descriptivo.

## Capabilities

### New Capabilities

- `acumulado-marca-modelo-provincia`: Agregado mensual por marca, modelo y provincia con cilindrada.

### Modified Capabilities

- `microdatos-etl`: Extracción de campos adicionales (`COD_PROVINCIA_VEH`, `CILINDRADA_ITV`), nueva validación de consistencia de cilindrada, y generación del nuevo agregado mensual.
- `acumulado-marca-modelo`: El agregado mensual existente añade `CILINDRADA_ITV` como campo.

## Impact

- `microdatos-etl/download-microdatos.js`: modificación del parser de campos, escritura de CSV diario, lógica de agregación mensual y nueva validación.
- **BREAKING**: los CSV diarios existentes en `microdatos-etl/data/` se eliminan antes del despliegue; el ETL los regenera todos en la siguiente ejecución.
- Los agregados mensuales se recalcularán automáticamente al regenerarse los diarios.
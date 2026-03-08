## Context

El ETL actual extrae 5 campos por registro (`FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`) y genera dos agregados mensuales: `acumulado-marca-modelo.csv` y `acumulado-marca.csv`. El parser de ancho fijo ya tiene definidos `COD_PROVINCIA_VEH` (pos 152, len 2) y `CILINDRADA_ITV` (pos 94, len 5) en el array `FIELDS`, pero no se extraen ni se usan.

## Goals / Non-Goals

**Goals:**
- Añadir `COD_PROVINCIA_VEH` y `CILINDRADA_ITV` a los campos extraídos por registro
- Añadir `COD_PROVINCIA_VEH` y `CILINDRADA_ITV` al CSV diario
- Añadir `CILINDRADA_ITV` al agregado mensual `acumulado-marca-modelo.csv`
- Crear nuevo agregado mensual `acumulado-marca-modelo-provincia.csv`
- Validar que `CILINDRADA_ITV` es consistente por `MARCA_ITV + MODELO_ITV` y abortar si no

**Non-Goals:**
- Añadir `CILINDRADA_ITV` a `acumulado-marca.csv`
- Modificar el frontend `dgt-matriculaciones-moto/`

## Decisions

### Campos adicionales extraídos del registro

`CILINDRADA_ITV` y `COD_PROVINCIA_VEH` ya están definidos en `FIELDS` — solo hace falta incluirlos en el objeto de fila procesado y en la escritura del CSV diario.

El CSV diario pasa de 5 columnas a 7: `FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV,COD_PROVINCIA_VEH,CILINDRADA_ITV`.

### Validación de consistencia de cilindrada

**Opción A** — Validar al construir el agregado mensual (al final de `recalculateMonthly`).
**Opción B** — Validar por registro durante la lectura de archivos diarios.

Se elige **Opción A**: la validación es más limpia al operar sobre los datos ya agregados (un solo valor de cilindrada esperado por clave `MARCA+MODELO`), y se puede hacer en una pasada sobre el `Map` de conteos antes de escribir los archivos. Si hay inconsistencia, se lanza un error con la marca, modelo y cilindradas conflictivas.

### Estructura del nuevo agregado provincia

`acumulado-marca-modelo-provincia.csv` tiene las columnas: `MARCA_ITV,MODELO_ITV,COD_PROVINCIA_VEH,CILINDRADA_ITV,COUNT`.

El ordenamiento es: `MARCA_ITV` → `MODELO_ITV` → `COD_PROVINCIA_VEH` (todo alfabético/lexicográfico).

La clave de agregación es `MARCA_ITV + MODELO_ITV + COD_PROVINCIA_VEH`. `CILINDRADA_ITV` se añade como metadato de la fila (verificado consistente por marca-modelo).

### Migración: eliminación de CSVs diarios existentes

Los archivos `DD.csv` ya generados tienen 5 columnas y son incompatibles con el nuevo formato. La estrategia es eliminarlos todos antes del despliegue del cambio, de modo que el ETL los regenere desde cero en la siguiente ejecución con las 7 columnas completas. No se requiere lógica de compatibilidad retroactiva en el reader.

## Risks / Trade-offs

- **Pérdida temporal de datos**: al eliminar los diarios históricos el repo pierde los datos hasta que el ETL los regenere. La regeneración puede tardar varios días si la DGT solo publica el día actual. → Aceptable dado que los datos son públicos y recuperables.
- **Validación de cilindrada abortará el script**: si hay datos inconsistentes en la fuente (error DGT), el ETL falla hasta que se corrija la normalización. → Aceptable: es mejor fallar ruidosamente que producir datos incorrectos.
- **Tamaño del nuevo agregado**: provincia añade una dimensión; el CSV puede ser significativamente más grande. → Aceptable para el caso de uso actual.

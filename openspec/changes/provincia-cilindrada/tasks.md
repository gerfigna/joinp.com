## 0. Migración de datos

- [x] 0.1 Eliminar todos los archivos `DD.csv` existentes bajo `microdatos-etl/data/` y hacer commit, para que sean regenerados por el ETL con el nuevo formato de 7 columnas

## 1. Extracción de campos adicionales

- [x] 1.1 En `microdatos-etl/download-microdatos.js`, añadir `COD_PROVINCIA_VEH` y `CILINDRADA_ITV` al objeto de fila devuelto por `processTxt` (ya están en `FIELDS`, solo hay que incluirlos en el objeto extraído)
- [x] 1.2 Actualizar `writeDailyCsv` en `microdatos-etl/download-microdatos.js` para incluir `COD_PROVINCIA_VEH` y `CILINDRADA_ITV` como columnas 6 y 7 en la cabecera y en cada fila del CSV diario

## 2. Validación de consistencia de cilindrada

- [x] 2.1 En `recalculateMonthly` de `microdatos-etl/download-microdatos.js`, tras acumular los conteos, validar que cada clave `MARCA_ITV + MODELO_ITV` tiene un único valor de `CILINDRADA_ITV`; si hay conflicto, llamar a `process.exit(1)` con un mensaje que indique marca, modelo y cilindradas conflictivas

## 3. Actualización del agregado marca-modelo

- [x] 3.1 Actualizar el lector de diarios en `recalculateMonthly` para leer `COD_PROVINCIA_VEH` (col 5) y `CILINDRADA_ITV` (col 6) de los CSV diarios de 7 columnas
- [x] 3.2 Añadir `CILINDRADA_ITV` como campo en `acumulado-marca-modelo.csv`: cabecera `MARCA_ITV,MODELO_ITV,CILINDRADA_ITV,COUNT` y valor por fila

## 4. Nuevo agregado marca-modelo-provincia

- [x] 4.1 Añadir la función `provinciaMonthlyPath(year, month)` en `microdatos-etl/download-microdatos.js` que devuelve `data/YYYY/MM/acumulado-marca-modelo-provincia.csv`
- [x] 4.2 En `recalculateMonthly`, acumular conteos por clave `MARCA_ITV + MODELO_ITV + COD_PROVINCIA_VEH` y escribir `acumulado-marca-modelo-provincia.csv` con cabecera `MARCA_ITV,MODELO_ITV,COD_PROVINCIA_VEH,CILINDRADA_ITV,COUNT`, filas ordenadas por `MARCA_ITV` → `MODELO_ITV` → `COD_PROVINCIA_VEH`

## 5. Verificación

- [x] 5.1 Ejecutar el script con datos reales en `microdatos-etl/data/` y verificar que `acumulado-marca-modelo.csv` incluye `CILINDRADA_ITV`
- [x] 5.2 Verificar que se genera `acumulado-marca-modelo-provincia.csv` con el formato correcto
- [x] 5.3 Verificar que `acumulado-marca.csv` no se ve afectado
- [x] 5.4 Verificar que el script emite warning y usa la cilindrada más frecuente si hay inconsistencia
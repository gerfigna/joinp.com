## 1. Implementación en el script ETL

- [x] 1.1 En `microdatos-etl/download-microdatos.js`, añadir la función `brandMonthlyPath(year, month)` que devuelve la ruta `data/YYYY/MM/acumulado-marca.csv`
- [x] 1.2 En `recalculateMonthly`, calcular los totales por `MARCA_ITV` acumulando los `counts` existentes por marca (sumar sobre todas las combinaciones marca-modelo)
- [x] 1.3 Escribir el fichero `acumulado-marca.csv` con cabecera `MARCA_ITV,COUNT`, filas ordenadas alfabéticamente por `MARCA_ITV`, al final de `recalculateMonthly`

## 2. Verificación

- [x] 2.1 Ejecutar el script localmente con datos de prueba (o datos reales ya descargados en `microdatos-etl/data/`) y comprobar que se genera `acumulado-marca.csv` con el formato correcto
- [x] 2.2 Verificar que `acumulado-marca-modelo.csv` no se ve afectado por el cambio
- [x] 2.3 Verificar que meses sin nuevos datos no regeneran el fichero
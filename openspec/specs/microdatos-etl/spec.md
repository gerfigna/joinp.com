# Microdatos ETL

## Purpose

Automatizar la descarga diaria de microdatos de matriculaciones desde DGT.

## Requirements

### Requirement: Ejecucion diaria programada

El sistema SHALL ejecutar una tarea programada diaria a las 08:00 GMT+0 en GitHub Actions.

#### Scenario: Ejecucion programada

- WHEN llega la hora 08:00 GMT+0
- THEN se ejecuta un workflow de GitHub Actions
- AND se inicia el proceso ETL de microdatos

### Requirement: Descarga y parseo del listado HTML

El sistema SHALL descargar el HTML de:
`https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html`.
Luego SHALL interpretar el listado dentro de `ul#listado` para extraer enlaces `.zip` de microdatos.

#### Scenario: Extraccion de enlaces zip

- WHEN el HTML contiene elementos `<a>` dentro de `#listado`
- THEN el sistema obtiene las URLs `https://www.dgt.es/microdatos/.../export_mat_YYYYMMDD.zip`
- AND descarta enlaces no zip o duplicados

### Requirement: Descarga incremental por fecha

El sistema SHALL descargar solo los ficheros de fechas que no existan ya en `/microdatos-etl/data`.

#### Scenario: Fichero ya existente

- WHEN un archivo `export_mat_YYYYMMDD.zip` ya existe en `/microdatos-etl/data`
- THEN el sistema no vuelve a descargarlo

#### Scenario: Fichero nuevo

- WHEN un archivo `export_mat_YYYYMMDD.zip` no existe en `/microdatos-etl/data`
- THEN el sistema lo descarga y lo guarda en esa ruta
- AND mantiene disponible el resultado para su uso posterior (artifact del workflow)

### Requirement: Ubicacion del script

El sistema SHALL ubicar el script principal de ETL dentro del directorio `/microdatos-etl/`.

#### Scenario: Estructura del repositorio

- WHEN se ejecuta el workflow
- THEN el comando usa un script en `/microdatos-etl/`

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

El sistema SHALL descargar solo los ficheros ZIP de fechas cuyo CSV final no exista ya en `/microdatos-etl/data/YYYY/MM/DD.csv`.

#### Scenario: CSV de fecha ya existente

- WHEN existe `/microdatos-etl/data/YYYY/MM/DD.csv` para una fecha concreta
- THEN el sistema no descarga el `export_mat_YYYYMMDD.zip` de esa fecha

#### Scenario: CSV de fecha inexistente

- WHEN no existe `/microdatos-etl/data/YYYY/MM/DD.csv` para una fecha concreta
- THEN el sistema descarga el `export_mat_YYYYMMDD.zip` de esa fecha
- AND procesa su contenido para generar el CSV de salida

### Requirement: Descompresión y lectura del contenido

El sistema SHALL tratar los ficheros descargados como ZIP, descomprimirlos y leer el fichero TXT contenido.
El TXT SHALL interpretarse como registros de columnas de ancho fijo en caracteres, siguiendo esta estructura de campos y longitudes:

`FEC_MATRICULA(8), COD_CLASE_MAT(1), FEC_TRAMITACION(8), MARCA_ITV(30), MODELO_ITV(22), COD_PROCEDENCIA_ITV(1), BASTIDOR_ITV(21), COD_TIPO(2), COD_PROPULSION_ITV(1), CILINDRADA_ITV(5), POTENCIA_ITV(6), TARA(6), PESO_MAX(6), NUM_PLAZAS(3), IND_PRECINTO(2), IND_EMBARGO(2), NUM_TRANSMISIONES(2), NUM_TITULARES(2), LOCALIDAD_VEHICULO(24), COD_PROVINCIA_VEH(2), COD_PROVINCIA_MAT(2), CLAVE_TRAMITE(1), FEC_TRAMITE(8), CODIGO_POSTAL(5), FEC_PRIM_MATRICULACION(8), IND_NUEVO_USADO(1), PERSONA_FISICA_JURIDICA(1), CODIGO_ITV(9), SERVICIO(3), COD_MUNICIPIO_INE_VEH(5), MUNICIPIO(30), KW_ITV(7), NUM_PLAZAS_MAX(3), CO2_ITV(5), RENTING(1), COD_TUTELA(1), COD_POSESION(1), IND_BAJA_DEF(1), IND_BAJA_TEMP(1), IND_SUSTRACCION(1), BAJA_TELEMATICA(11), TIPO_ITV(25), VARIANTE_ITV(25), VERSION_ITV(35), FABRICANTE_ITV(70), MASA_ORDEN_MARCHA_ITV(6), MASA_MAXIMA_TECNICA_ITV(6), CATEGORIA_HOMOLOGACION_EUROPEA_ITV(4), CARROCERIA(4), PLAZAS_PIE(3), NIVEL_EMISIONES_EURO_ITV(8), CONSUMO_WH_KM_ITV(4), CLASIFICACION_REGLAMENTO_VEHICULOS_ITV(4), CATEGORIA_VEHICULO_ELECTRICO(4), AUTONOMIA_VEHICULO_ELECTRICO(6), MARCA_VEHICULO_BASE(30), FABRICANTE_VEHICULO_BASE(50), TIPO_VEHICULO_BASE(35), VARIANTE_VEHICULO_BASE(25), VERSION_VEHICULO_BASE(35), DISTANCIA_EJES_12_ITV(4), VIA_ANTERIOR_ITV(4), VIA_POSTERIOR_ITV(4), TIPO_ALIMENTACION_ITV(1), CONTRASENA_HOMOLOGACION_ITV(25), ECO_INNOVACION_ITV(1), REDUCCION_ECO_ITV(4), CODIGO_ECO_ITV(25), FEC_PROCESO(8)`

#### Scenario: ZIP procesado correctamente

- WHEN existe un `export_mat_YYYYMMDD.zip` nuevo
- THEN el sistema lo descomprime
- AND localiza y lee el TXT contenido como registros de ancho fijo

### Requirement: Extracción de campos objetivo

El sistema SHALL extraer de cada registro los campos:
`FEC_MATRICULA`, `COD_CLASE_MAT`, `FEC_TRAMITACION`, `MARCA_ITV`, `MODELO_ITV`.

#### Scenario: Extracción por registro

- WHEN un registro es parseado correctamente
- THEN se obtienen los cinco campos objetivo con el valor recortado de espacios laterales

### Requirement: Normalización de modelo por marca

Durante la extracción, el sistema SHALL aplicar normalización de `MODELO_ITV` según `MARCA_ITV` con estas reglas:

- Para `YAMAHA`:
  `GPD125D-A -> NMAX125`, `GPD125-A -> NMAX125`, `YP125R-DA -> XMAX125`, `YP125RA -> XMAX125`
- Para `SYM`:
  si `MODELO_ITV` empieza por `SYMPHONY 125`, normalizar a `SYMPHONY 125`
- Para `HONDA`:
  `WW125A -> PCX125`, `WW125S -> PCX125`, `FSH125 -> SH125`, `SH125AD -> SH125`, `NSS125AD -> FORZA125`

#### Scenario: Modelo mapeado

- WHEN una fila cumple alguna regla de normalización
- THEN `MODELO_ITV` se sustituye por el valor canónico definido para su marca

#### Scenario: Modelo no mapeado

- WHEN una fila no cumple ninguna regla de normalización
- THEN `MODELO_ITV` conserva su valor original

### Requirement: Generación y almacenamiento CSV

El sistema SHALL guardar los registros resultantes en formato CSV con una salida por fecha en:
`/microdatos-etl/data/YYYY/MM/DD.csv`.

#### Scenario: Escritura de salida por fecha

- WHEN termina el procesamiento de una fecha `YYYYMMDD`
- THEN se crea el archivo `/microdatos-etl/data/YYYY/MM/DD.csv`
- AND el CSV contiene las columnas `FEC_MATRICULA,COD_CLASE_MAT,FEC_TRAMITACION,MARCA_ITV,MODELO_ITV`

### Requirement: Agregado mensual por marca y modelo

El sistema SHALL mantener un CSV mensual con el acumulado (contador) de combinaciones `MARCA_ITV` y `MODELO_ITV`.
La salida mensual SHALL guardarse en:
`/microdatos-etl/data/YYYY/MM/acumulado-marca-modelo.csv`.

#### Scenario: Estructura del acumulado mensual

- WHEN se genera el CSV mensual
- THEN incluye las columnas `MARCA_ITV,MODELO_ITV,COUNT`
- AND cada fila representa una combinación única `MARCA_ITV` + `MODELO_ITV`
- AND `COUNT` es el número total de registros de ese mes para esa combinación

#### Scenario: Orden del acumulado mensual

- WHEN se escribe el CSV mensual
- THEN las filas se ordenan alfabéticamente por `MARCA_ITV`
- AND en caso de empate, por `MODELO_ITV`

### Requirement: Recalculo selectivo de meses

En cada ejecución, el sistema SHALL recalcular solo los meses para los que se hayan incorporado datos nuevos durante esa misma ejecución.

#### Scenario: Mes con datos nuevos

- WHEN en la ejecución se descarga y procesa al menos un día nuevo de un mes concreto
- THEN se recalcula `acumulado-marca-modelo.csv` para ese mes

#### Scenario: Mes sin datos nuevos

- WHEN en la ejecución no hay días nuevos para un mes concreto
- THEN no se recalcula el CSV mensual de ese mes

### Requirement: Reglas de filtrado de registros

El sistema SHALL descartar registros que no cumplan todas estas condiciones:
`COD_TIPO === "50"`, `CLAVE_TRAMITE === "1"`, `IND_NUEVO_USADO === "N"`, `FABRICANTE_ITV !== "ND"`.

#### Scenario: Registro descartado por reglas

- WHEN un registro incumple cualquiera de las cuatro reglas
- THEN el registro no forma parte de la salida final

#### Scenario: Registro valido

- WHEN un registro cumple las cuatro reglas
- THEN el registro puede incluirse en el conjunto resultante con los campos objetivo

### Requirement: Ubicacion del script

El sistema SHALL ubicar el script principal de ETL dentro del directorio `/microdatos-etl/`.

#### Scenario: Estructura del repositorio

- WHEN se ejecuta el workflow
- THEN el comando usa un script en `/microdatos-etl/`

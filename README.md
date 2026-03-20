# joinp.com

Repositorio estático para publicar datos y visualizaciones sobre matriculaciones de motos en España a partir de los microdatos diarios de la DGT.

## Componentes

### Dashboard

El dashboard de matriculaciones de motos está disponible públicamente en:

- https://joinp.com/dgt-matriculaciones-moto/

La página permite explorar las matriculaciones mediante:

- selector de año y mes
- filtro por marca
- filtro por provincia
- rango de cilindrada
- tabla ordenable y paginada
- gráfico de tarta con cuota por marca

Comportamiento funcional principal:

- Al abrir la página intenta mostrar el mes más reciente disponible.
- Si no hay filtro de provincia, agrega resultados por `MARCA_ITV + MODELO_ITV`.
- Si se selecciona provincia, muestra el detalle de esa provincia.
- Todos los filtros se combinan con lógica AND.
- El gráfico muestra las 14 marcas con más matriculaciones y agrupa el resto como `Otras`.
- Si no existe el CSV del mes seleccionado, la tabla y el gráfico muestran estado vacío.

Dependencias del dashboard:

- archivos CSV generados por `microdatos-etl`

### Microdatos ETL

`microdatos-etl` es el proceso que descarga y transforma los microdatos de la DGT para alimentar el dashboard.

Flujo del ETL:

1. Descarga el HTML de listados de la DGT.
2. Extrae enlaces `export_mat_YYYYMMDD.zip` desde `ul#listado`.
3. Omite fechas cuyo CSV diario ya existe en `microdatos-etl/data/YYYY/MM/DD.csv`.
4. Descarga el ZIP pendiente, extrae el TXT y lo interpreta como fichero de ancho fijo.
5. Filtra solo registros válidos de motos nuevas:
   - `COD_TIPO === "50"`
   - `CLAVE_TRAMITE === "1"`
   - `IND_NUEVO_USADO === "N"`
   - `FABRICANTE_ITV !== "ND"`
   - `CILINDRADA_ITV` no vacía y distinta de `0`
6. Normaliza `MODELO_ITV` por marca y convierte `COD_PROVINCIA_VEH` a `PROVINCIA_VEH`.
7. Escribe el CSV diario y recalcula los agregados mensuales del mes afectado.

Actualización de datos:

- Los datos se actualizan automáticamente cada día.
- Cuando aparecen nuevos microdatos, se regeneran los ficheros necesarios para que el dashboard muestre la información más reciente disponible.

Campos extraídos por registro:

- `FEC_MATRICULA`
- `COD_CLASE_MAT`
- `FEC_TRAMITACION`
- `MARCA_ITV`
- `MODELO_ITV`
- `PROVINCIA_VEH`
- `CILINDRADA_ITV`

Salidas generadas:

- `microdatos-etl/data/YYYY/MM/DD.csv`
  CSV diario filtrado y normalizado.
- `microdatos-etl/data/YYYY/MM/acumulado-marca-modelo-provincia.csv`
  Agregado mensual por marca, modelo y provincia con columnas `MARCA_ITV,MODELO_ITV,PROVINCIA_VEH,COMUNIDAD_AUTONOMA,CILINDRADA_ITV,COUNT`.

Notas de implementación:

- La normalización de modelos aplica reglas exactas y por prefijo según la marca.
- Si una combinación `marca + modelo` aparece con varias cilindradas en el mismo mes, se usa la más frecuente y se emite un warning.
- Los artefactos temporales ZIP/TXT no se guardan dentro de `microdatos-etl/data/`.

## Estructura

```text
.
├── dgt-matriculaciones-moto/
│   └── index.html
├── microdatos-etl/
│   ├── data/
│   ├── download-microdatos.js
│   └── package.json
├── openspec/
└── .github/workflows/
```

## Especificaciones

Las especificaciones funcionales están en `openspec/`, principalmente:

- `openspec/specs/matriculaciones-dashboard/spec.md`
- `openspec/specs/microdatos-etl/spec.md`

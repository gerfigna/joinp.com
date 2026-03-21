## Why

La página `dgt-matriculaciones-moto` actualmente solo muestra una tabla de matrículas filtrable. Añadir una segunda pestaña con gráficos de evolución temporal permite analizar tendencias históricas de potencia y marcas desde 2015 hasta el año actual, ofreciendo una visión analítica que la tabla no proporciona.

## What Changes

- Añadir sistema de navegación por pestañas en `dgt-matriculaciones-moto/index.html`
- **Pestaña 1 ("Datos")**: contenido actual sin cambios — selector de fecha (año/mes), filtros y tabla de matrículas
- **Pestaña 2 ("Evolución")**: dos gráficos de evolución anual:
  - Gráfico 1: evolución de matrículas por grupo de potencia (2015–año actual)
  - Gráfico 2: evolución de matrículas por marca (2015–año actual)
  - Selector por gráfico: mostrar en números absolutos o en porcentaje del total anual
- Carga de datos históricos de CSVs anuales (2015–año actual) al entrar en la pestaña 2
- **Pestaña 3 ("Info")**: contenido estático con sección de Disclaimer (fuente de datos, posibles errores, carácter informativo) y sección de Release Notes (historial de cambios en orden cronológico inverso)

## Capabilities

### New Capabilities

- `moto-tabs-navigation`: Sistema de pestañas en la página dgt-matriculaciones-moto que alterna entre la vista de datos actual y la vista de gráficos de evolución
- `moto-evolution-charts`: Dos gráficos de evolución anual (potencia y marcas) con selector absoluto/porcentaje, cargando datos de CSVs desde 2015 hasta el año actual
- `moto-info-tab`: Pestaña estática con sección de Disclaimer (fuente de datos DGT microdatos, posibles retrasos o errores, carácter informativo) y sección de Release Notes (historial de cambios de la herramienta en orden cronológico inverso)

### Modified Capabilities

<!-- No existing spec-level requirements change -->

## Impact

- `dgt-matriculaciones-moto/index.html`: añadir tabs UI, contenedor de gráficos, selectores absoluto/porcentaje
- `dgt-matriculaciones-moto/` (JS): nueva lógica para cargar CSVs de múltiples años, agregar datos por año/potencia/marca, renderizar gráficos
- Nueva dependencia: librería de gráficos (Chart.js, ya disponible en el proyecto o a añadir via CDN)
- No hay cambios en el ETL ni en la estructura de los CSVs

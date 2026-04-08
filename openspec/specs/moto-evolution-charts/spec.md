## ADDED Requirements

### Requirement: Fuente de datos históricos anuales
La pestaña "Evolución" SHALL cargar datos de los CSVs anuales generados por el ETL para todos los años desde 2015 hasta el año en curso inclusive. Los años para los que el CSV no esté disponible (HTTP 404 u otro error) SHALL omitirse silenciosamente de las series de los gráficos.

#### Scenario: Carga de datos disponibles
- **WHEN** se activa la pestaña "Evolución"
- **THEN** se realizan peticiones fetch en paralelo a `/microdatos-etl/data/{YYYY}/acumulado-potencia-anual.csv` y `/microdatos-etl/data/{YYYY}/acumulado-marca-anual.csv` para cada año desde 2015 hasta el año actual
- **THEN** los años con respuesta exitosa se incluyen en los gráficos

#### Scenario: Año sin datos disponibles
- **WHEN** el fetch de un año concreto devuelve error o 404
- **THEN** ese año se excluye de los gráficos sin mostrar error al usuario

### Requirement: Gráfico de evolución por rango de potencia
La pestaña "Evolución" SHALL mostrar un gráfico de barras apiladas con la evolución anual de matrículas agrupadas por rango de potencia (`Hasta 11 kW`, `11-35 kW`, `Más de 35 kW`). El eje X representa los años disponibles en orden cronológico. El eje Y representa el número de matrículas (modo absoluto) o el porcentaje del total anual (modo porcentaje).

#### Scenario: Visualización en modo absoluto
- **WHEN** el selector del gráfico de potencia está en modo "Absoluto"
- **THEN** el eje Y muestra unidades (número de matrículas)
- **THEN** cada barra apilada muestra el recuento real por rango

#### Scenario: Visualización en modo porcentaje
- **WHEN** el selector del gráfico de potencia está en modo "Porcentaje"
- **THEN** el eje Y muestra valores de 0 a 100
- **THEN** cada segmento de barra representa el porcentaje del total de matrículas de ese año para ese rango
- **THEN** la suma de segmentos de cada año es siempre 100%

#### Scenario: Cambio de modo no recarga datos
- **WHEN** el usuario cambia entre modo Absoluto y Porcentaje
- **THEN** el gráfico se actualiza visualmente sin nuevas peticiones de red

### Requirement: Gráfico de evolución por marca
La pestaña "Evolución" SHALL mostrar un gráfico de barras apiladas con la evolución anual de matrículas para las top 30 marcas por volumen total acumulado en el periodo. No existe categoría "Otras" ni "Otros". El eje X representa los años disponibles. El eje Y representa matrículas (modo absoluto) o porcentaje del total anual (modo porcentaje).

#### Scenario: Selección de top 30 marcas con visibilidad por defecto
- **WHEN** se renderizan los datos de evolución por marca
- **THEN** se calculan las 30 marcas con mayor suma total de matrículas en todos los años disponibles
- **THEN** las marcas en las posiciones 1–15 (top 15) están habilitadas y visibles por defecto en el gráfico
- **THEN** las marcas en las posiciones 16–30 están ocultas por defecto pero pueden activarse desde la leyenda de Chart.js
- **THEN** no existe ninguna serie "Otras" ni "Otros"

#### Scenario: Visualización en modo absoluto
- **WHEN** el selector del gráfico de marcas está en modo "Absoluto"
- **THEN** el eje Y muestra número de matrículas
- **THEN** cada segmento representa el recuento real de esa marca en ese año

#### Scenario: Visualización en modo porcentaje
- **WHEN** el selector del gráfico de marcas está en modo "Porcentaje"
- **THEN** el eje Y muestra valores de 0 a 100
- **THEN** cada segmento representa el porcentaje que esa marca representa sobre el total de matrículas de ese año

#### Scenario: Cambio de modo no recarga datos
- **WHEN** el usuario cambia entre modo Absoluto y Porcentaje en el gráfico de marcas
- **THEN** el gráfico se actualiza sin nuevas peticiones de red

### Requirement: Selectores de modo independientes por gráfico
Cada gráfico SHALL tener su propio selector de modo (Absoluto / Porcentaje) independiente del otro. Cambiar el modo de un gráfico SHALL NOT afectar al otro.

#### Scenario: Selectores independientes
- **WHEN** el usuario cambia el modo del gráfico de potencia a "Porcentaje"
- **THEN** el gráfico de marcas permanece en su modo actual (sin cambio)

#### Scenario: Ambos gráficos en modos distintos
- **WHEN** el gráfico de potencia está en modo "Porcentaje" y el de marcas en modo "Absoluto"
- **THEN** ambos gráficos muestran simultáneamente sus datos en los modos correspondientes

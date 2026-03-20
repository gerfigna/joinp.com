## 1. Estructura HTML — pestañas

- [x] 1.1 En `dgt-matriculaciones-moto/index.html`, añadir el wrapper de pestañas con dos `<input type="radio">` ocultos (`tab-datos` activo por defecto) y los dos `<label>` de navegación ("Datos" / "Evolución")
- [x] 1.2 Envolver el contenido actual (period-selector, filters, tabla, gráfico de tarta) dentro del contenedor `<div class="tab-content tab-datos-content">`
- [x] 1.3 Añadir el contenedor vacío `<div class="tab-content tab-evolucion-content">` con: indicador de carga, div para gráfico de potencia (canvas + selector absoluto/%), div para gráfico de marcas (canvas + selector absoluto/%)

## 2. Estilos CSS — pestañas

- [x] 2.1 En el `<style>` embebido de `dgt-matriculaciones-moto/index.html`, añadir estilos para el wrapper de pestañas, los labels de navegación (aspecto de tab, estado activo)
- [x] 2.2 Añadir reglas CSS `input[type=radio]:checked ~` para mostrar/ocultar el contenido correcto según la pestaña activa
- [x] 2.3 Asegurar que los estilos de pestañas son responsivos y consistentes con el diseño visual actual de la página

## 3. Carga de datos históricos

- [x] 3.1 En el `<script>` embebido, añadir función `loadEvolutionData()` que construye el array de años [2015…currentYear] y lanza `Promise.all()` con fetch paralelo de `acumulado-potencia-anual.csv` y `acumulado-marca-anual.csv` para cada año
- [x] 3.2 Implementar manejo de errores en fetch: años con error/404 se excluyen silenciosamente del resultado
- [x] 3.3 Parsear cada CSV anual usando el `parseCSV()` ya existente; almacenar resultado en variable `evolutionData` en memoria
- [x] 3.4 Conectar `loadEvolutionData()` al evento `change` del radio input de la pestaña "Evolución"; llamar solo si `evolutionData === null` (carga lazy con caché)

## 4. Gráfico de evolución por potencia

- [x] 4.1 Implementar función `buildPowerChartData(evolutionData, mode)` que transforma los datos de potencia en datasets para Chart.js (`mode`: `'absolute'` | `'percent'`)
- [x] 4.2 En modo `'percent'`, calcular `value / totalYear * 100` para cada rango/año
- [x] 4.3 Inicializar Chart.js con `type: 'bar'`, `stacked: true`, usando el canvas del gráfico de potencia; eje Y con unidades o % según modo
- [x] 4.4 Conectar el selector absoluto/porcentaje del gráfico de potencia: al cambiar, llamar `buildPowerChartData()` con el nuevo modo y actualizar el chart (`.data.datasets` + `.update()`)

## 5. Gráfico de evolución por marcas

- [x] 5.1 Implementar función `getTopBrands(evolutionData, n=10)` que suma el total acumulado por marca en todos los años disponibles y devuelve las top N marcas
- [x] 5.2 Implementar función `buildBrandsChartData(evolutionData, topBrands, mode)` que agrupa las marcas fuera del top 10 como "Otras" y transforma en datasets para Chart.js
- [x] 5.3 En modo `'percent'`, calcular porcentaje de cada marca sobre el total de matrículas de ese año
- [x] 5.4 Inicializar Chart.js con `type: 'bar'`, `stacked: true`, usando el canvas del gráfico de marcas
- [x] 5.5 Conectar el selector absoluto/porcentaje del gráfico de marcas: al cambiar, recalcular datasets y actualizar el chart

## 7. Pestaña Info

- [x] 7.1 En `dgt-matriculaciones-moto/index.html`, añadir el tercer `<input type="radio">` oculto (`tab-info`) y su `<label>` de navegación ("Info") junto a los existentes de "Datos" y "Evolución"
- [x] 7.2 Añadir el contenedor `<div class="tab-content tab-info-content">` con: sección `<section class="disclaimer">` (título + párrafo de texto) y sección `<section class="release-notes">` (título + lista de entradas)
- [x] 7.3 Escribir el texto inicial de la sección Disclaimer: describir que los datos provienen de los microdatos de la DGT, que pueden contener retrasos o errores, y que la herramienta es de uso informativo sin carácter oficial
- [x] 7.4 Escribir el contenido inicial de la sección Release Notes: añadir al menos una entrada con fecha y descripción que documente la incorporación de los gráficos de evolución (pestaña "Evolución") y la pestaña "Info"

## 6. Integración y verificación

- [x] 6.1 Verificar que al cambiar entre pestañas la funcionalidad actual (filtros, tabla, gráfico de tarta) sigue funcionando correctamente
- [x] 6.2 Verificar que los dos selectores absoluto/porcentaje funcionan de forma independiente (cambiar uno no afecta al otro)
- [x] 6.3 Verificar comportamiento cuando algunos años no tienen CSV disponible (excluidos sin error visible)
- [x] 6.4 Verificar que la carga lazy funciona: datos no se cargan hasta abrir pestaña "Evolución", y no se recargan en visitas sucesivas

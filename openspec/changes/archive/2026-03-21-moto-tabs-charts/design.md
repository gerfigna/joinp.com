## Context

`dgt-matriculaciones-moto/index.html` es un SPA de archivo único con HTML/CSS/JS embebidos. Usa Chart.js v4.4.0 (ya incluido via CDN) para el gráfico de tarta de marcas. El ETL ya genera CSVs anuales agregados por potencia y por marca:

- `/microdatos-etl/data/{YYYY}/acumulado-potencia-anual.csv` — columnas: `RANGO_POTENCIA, COUNT`
- `/microdatos-etl/data/{YYYY}/acumulado-marca-anual.csv` — columnas: `MARCA_ITV, COUNT`

Los rangos de potencia son exactamente 3: `Hasta 11 kW`, `11-35 kW`, `Más de 35 kW`.

## Goals / Non-Goals

**Goals:**
- Añadir navegación por pestañas sin romper la funcionalidad actual
- Cargar los CSVs anuales de potencia y marca para el rango 2015–año actual al activar la pestaña 2
- Renderizar dos gráficos de líneas/barras con Chart.js
- Permitir alternar entre vista absoluta y porcentaje del total anual, por gráfico independientemente

**Non-Goals:**
- No cambiar la lógica de carga/filtrado de la pestaña 1
- No introducir frameworks ni bundler
- No añadir nuevas dependencias JS (Chart.js ya está disponible)
- No implementar filtros adicionales en la pestaña de evolución (solo el selector absoluto/%)

## Decisions

### D1: Sistema de pestañas — CSS puro con radio inputs ocultos

**Decisión**: Usar el patrón CSS `input[type=radio]:checked ~ .tab-content` para alternar pestañas sin JS adicional.

**Alternativas consideradas**:
- JS con `display: none/block`: más flexible pero añade lógica de estado
- CSS puro con radio: suficiente para 2 pestañas, cero JS de UI

**Rationale**: Consistente con la filosofía vanilla del proyecto. Para 2 pestañas es perfectamente mantenible.

### D2: Carga de datos históricos — fetch paralelo y lazy

**Decisión**: Al activar la pestaña 2 (evento `change` en el radio input), lanzar `Promise.all()` con fetch de los CSVs anuales para todos los años 2015–`currentYear`. Cachear el resultado en una variable `let evolutionData = null` para no recargar en visitas sucesivas a la pestaña.

**Rationale**: Los CSVs anuales son ligeros (máx. 3 filas para potencia, ~50 para marcas). Fetch paralelo es suficiente. No se necesita un service worker ni caché más sofisticada.

**Gestión de años sin datos**: Si un año no tiene CSV (fetch falla o 404), se excluye silenciosamente de las series del gráfico. El año en curso puede tener datos parciales — se incluye siempre que el CSV exista.

### D3: Tipo de gráfico — barras apiladas

**Decisión**: Usar `type: 'bar'` con `stacked: true` en Chart.js para ambos gráficos.

**Alternativas consideradas**:
- Líneas: buenas para tendencias pero dificultan la comparación de proporciones
- Barras apiladas: muestran tanto el total como la distribución interna de cada año

**Rationale**: Con solo 3 rangos de potencia, las barras apiladas son legibles y permiten ver tanto el volumen total como el mix. Para marcas se mostrarán las top N (configurable, default 10) + "Otras".

### D4: Selector absoluto/porcentaje — independiente por gráfico

**Decisión**: Dos checkboxes o botones toggle, uno por gráfico, que recomputar los datasets del gráfico sin recargar datos.

**Rationale**: La transformación absoluto→porcentaje es puramente de presentación: `value / totalYear * 100`. Se recalcula en memoria desde `evolutionData`.

### D5: Top N marcas — fixed a 10

**Decisión**: En el gráfico de marcas mostrar las 10 marcas con mayor total acumulado en el periodo + "Otras".

**Rationale**: Más de 10 colores en un gráfico de barras apiladas es ilegible. El total acumulado como criterio de selección evita cambios de leyenda entre años.

## Risks / Trade-offs

- **Años sin CSV** → Los años donde el ETL no generó annual CSV (ej. años anteriores a la existencia del campo KW_ITV en los datos) no aparecerán. El gráfico puede tener huecos si hay años intermedios sin datos. Mitigation: mostrar solo los años con datos disponibles; documentar en UI si es necesario.

- **Tamaño del archivo index.html** → Ya es un archivo grande (~30KB). Añadir lógica de charts y tabs lo incrementará. No es un problema técnico real para GitHub Pages pero dificulta mantenimiento. Trade-off aceptado: consistente con la arquitectura actual.

- **Chart.js ya cargado** → El CDN de Chart.js se carga al inicio de la página aunque el usuario nunca abra la pestaña 2. No es un problema nuevo, ya estaba incluido para el gráfico de tarta existente.

## Migration Plan

1. Modificar `index.html` en la sección de estructura HTML para añadir tabs wrapper
2. Añadir estilos CSS para las pestañas en el `<style>` embebido
3. Añadir función `loadEvolutionData()` y lógica de renderizado de gráficos en `<script>`
4. Mover el contenido actual al interior del contenedor de pestaña 1 (ajuste de indentación, no cambio funcional)
5. Desplegar en GitHub Pages (push a main)

**Rollback**: Revertir el commit. No hay migraciones de datos ni cambios en el ETL.

## Open Questions

- ¿Desde qué año exacto tienen datos los CSVs anuales de potencia/marca? Si 2015 no existe, el rango efectivo podría ser diferente. La implementación lo maneja silenciosamente (fetch fallido = año excluido).

## ADDED Requirements

### Requirement: Navegación por pestañas en la página principal
La página `dgt-matriculaciones-moto` SHALL mostrar tres pestañas: "Datos", "Evolución" e "Info". Solo una pestaña SHALL estar visible a la vez. La pestaña "Datos" SHALL estar activa por defecto al cargar la página.

#### Scenario: Carga inicial muestra pestaña Datos
- **WHEN** el usuario carga la página
- **THEN** la pestaña "Datos" está activa y visible
- **THEN** las pestañas "Evolución" e "Info" no son visibles

#### Scenario: Cambio a pestaña Evolución
- **WHEN** el usuario hace clic en la pestaña "Evolución"
- **THEN** el contenido de la pestaña "Evolución" es visible
- **THEN** el contenido de las pestañas "Datos" e "Info" queda oculto

#### Scenario: Cambio de vuelta a pestaña Datos
- **WHEN** el usuario hace clic en la pestaña "Datos"
- **THEN** el contenido de la pestaña "Datos" es visible
- **THEN** el contenido de las pestañas "Evolución" e "Info" queda oculto

#### Scenario: Cambio a pestaña Info
- **WHEN** el usuario hace clic en la pestaña "Info"
- **THEN** el contenido de la pestaña "Info" es visible
- **THEN** el contenido de las pestañas "Datos" y "Evolución" queda oculto

### Requirement: Contenido de pestaña Datos sin cambios
La pestaña "Datos" SHALL contener exactamente el mismo contenido que la página actual: selector de periodo (año/mes), panel de filtros (marca, comunidad autónoma, provincia, rango de cilindrada), tabla paginada y gráfico de tarta de marcas.

#### Scenario: Funcionalidad actual preservada
- **WHEN** el usuario interactúa con los filtros o selector de periodo en la pestaña "Datos"
- **THEN** la tabla y el gráfico se actualizan igual que antes de la introducción de pestañas

### Requirement: Carga lazy de datos de evolución
Los datos históricos anuales SHALL cargarse únicamente cuando el usuario activa la pestaña "Evolución" por primera vez. Los datos SHALL cachearse en memoria para visitas sucesivas a la pestaña dentro de la misma sesión.

#### Scenario: Primera activación de pestaña Evolución
- **WHEN** el usuario activa la pestaña "Evolución" por primera vez
- **THEN** la página inicia la carga de los CSVs anuales históricos
- **THEN** se muestra un indicador de carga mientras los datos se obtienen

#### Scenario: Segunda activación de pestaña Evolución
- **WHEN** el usuario vuelve a la pestaña "Evolución" habiendo ya cargado datos previamente
- **THEN** los gráficos se muestran inmediatamente sin nueva petición de red

### Requirement: Contenido de pestaña Info
La pestaña "Info" SHALL contener dos secciones de contenido estático: "Disclaimer" y "Release Notes". El contenido SHALL renderizarse sin ninguna petición de red ni carga de datos adicional.

#### Scenario: Acceso a la pestaña Info
- **WHEN** el usuario hace clic en la pestaña "Info"
- **THEN** el contenido de las secciones Disclaimer y Release Notes es visible de forma inmediata

#### Scenario: Contenido estático sin dependencias
- **GIVEN** que ningún CSV ni dato externo ha sido cargado
- **WHEN** el usuario hace clic en la pestaña "Info"
- **THEN** el contenido de la pestaña se muestra correctamente sin errores

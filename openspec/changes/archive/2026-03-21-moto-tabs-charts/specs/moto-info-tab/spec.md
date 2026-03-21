## ADDED Requirements

### Requirement: Sección Disclaimer
La pestaña "Info" SHALL mostrar una sección "Disclaimer" que informe al usuario sobre: (1) la fuente de los datos (microdatos DGT), (2) la posibilidad de retrasos o errores en los datos, y (3) el carácter informativo de la herramienta, sin valor legal ni oficial.

#### Scenario: Visualización del Disclaimer
- **WHEN** el usuario accede a la pestaña "Info"
- **THEN** la sección "Disclaimer" es visible con texto explicativo sobre la fuente de datos DGT microdatos
- **THEN** el texto menciona que los datos pueden contener retrasos o errores
- **THEN** el texto indica que la herramienta es de uso informativo y no tiene carácter oficial

#### Scenario: Disclaimer visible sin interacción adicional
- **WHEN** el usuario abre la pestaña "Info" por primera vez
- **THEN** la sección "Disclaimer" está visible sin necesidad de hacer scroll ni expandir ningún elemento

### Requirement: Sección Release Notes
La pestaña "Info" SHALL mostrar una sección "Release Notes" con un listado de cambios y actualizaciones de la herramienta en orden cronológico inverso (más reciente primero).

#### Scenario: Visualización de Release Notes
- **WHEN** el usuario accede a la pestaña "Info"
- **THEN** la sección "Release Notes" es visible con al menos una entrada de versión o actualización
- **THEN** las entradas están ordenadas de más reciente a más antigua

#### Scenario: Formato de las entradas
- **WHEN** el usuario lee la sección "Release Notes"
- **THEN** cada entrada incluye una fecha o identificador de versión y una descripción de los cambios introducidos

#### Scenario: Contenido inicial de Release Notes
- **GIVEN** que es la primera versión de la herramienta que incluye la pestaña Info
- **WHEN** el usuario accede a la sección "Release Notes"
- **THEN** existe al menos una entrada que describe la incorporación de los gráficos de evolución (pestaña "Evolución") y la propia pestaña "Info"

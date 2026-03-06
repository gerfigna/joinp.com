## 1. Refactorizar normalización en el ETL

- [ ] 1.1 Reemplazar `YAMAHA_MAP` y `HONDA_MAP` por una tabla unificada `BRAND_EXACT` en `microdatos-etl/download-microdatos.js`, migrando las reglas existentes y añadiendo `WR125-A -> WR125` para YAMAHA
- [ ] 1.2 Crear tabla `BRAND_PREFIX` en `microdatos-etl/download-microdatos.js` con las reglas de prefijo de SYM (migrada desde inline), YAMAHA (MTT690, MTT890, MWS125), BMW, BRIXTON, DUCATI, HONDA, KTM y KYMCO
- [ ] 1.3 Añadir reglas exactas de APRILIA, BENELLI y BMW a `BRAND_EXACT`
- [ ] 1.4 Refactorizar `normalizeModel()` para usar `BRAND_EXACT` (lookup) y `BRAND_PREFIX` (iteración de prefijos), en ese orden de precedencia

## 2. Actualizar spec canónico

- [ ] 2.1 Actualizar `openspec/specs/microdatos-etl/spec.md`: reemplazar el requisito "Model normalization by brand" con la versión ampliada (exact + prefix rules para todas las marcas)

## 3. Eliminar datos históricos para reproceso

- [ ] 3.1 Eliminar todos los CSV diarios en `microdatos-etl/data/` (`YYYY/MM/DD.csv`) para forzar el reproceso completo con las nuevas reglas
- [ ] 3.2 Eliminar todos los acumulados mensuales en `microdatos-etl/data/` (`YYYY/MM/acumulado-marca-modelo.csv`)
- [ ] 3.3 Hacer commit del estado limpio (sin datos) antes de ejecutar el ETL

# Documento de Interfaz de Envío de Datos — Matriculaciones DGT

**Fuente**: Dirección General de Tráfico (DGT) — Secretaría General  
**Organismo**: Ministerio del Interior, Josefa Valcárcel 44, 28027-Madrid

---

## Índice

- [1. Descripción del fichero](#1-descripción-del-fichero)
- [2. Estructura de campos (layout fixed-width)](#2-estructura-de-campos-layout-fixed-width)
- [3. Ficheros disponibles](#3-ficheros-disponibles)
- [4. Tablas de códigos](#4-tablas-de-códigos)
  - [COD_CLASE_MAT](#codclasemat)
  - [COD_PROCEDENCIA](#codprocedencia)
  - [COD_SERVICIO](#codservicio)
  - [COD_TIPO](#codtipo)
  - [COD_PROPULSION](#codpropulsion)
  - [COD_PROVINCIA_VEH](#codprovincia_veh)
  - [COD_PROVINCIA_MAT](#codprovincia_mat)
  - [CLAVE_TRAMITE](#clavetramite)
  - [SERVICIO](#servicio)
  - [IND_BAJA_DEF](#indbaja_def)
  - [CATEGORIA_VEHICULO_ELECTRICO](#categoriavehiculoelectrico)
- [5. Campos de interés por caso de uso](#5-campos-de-interés-por-caso-de-uso)

---

## 1. Descripción del fichero

Los ficheros de matriculaciones de la DGT son ficheros de texto de **ancho fijo** (fixed-width). Cada línea representa un trámite sobre un vehículo.

### Primera línea (solo fichero diario)

El fichero diario incluye una cabecera literal:

```
Vehículos matriculados. Letras de la serie de la última matrícula asignada: XXX
```

El fichero mensual **no incluye** esta línea.

### Trámites contenidos

- Matriculaciones de vehículos
- Matriculaciones de ciclomotores
- Matriculaciones temporales para empresas
- Matriculaciones temporales
- Rematriculaciones
- Prórrogas de matrícula temporal
- Pasos de matrícula temporal a definitiva

---

## 2. Estructura de campos (layout fixed-width)

Cada campo ocupa una posición fija. `POS` es el índice de inicio (base 0), `LEN` es la longitud en caracteres.  
Los valores numéricos usan formato con ceros/blancos a la izquierda (`FORMAT 'ZZZ9'` = blancos; `FORMAT '999'` = ceros).  
Fechas en formato `DDMMYYYY`.

| #  | Campo | POS | LEN | Tipo | Formato | Descripción |
|----|-------|-----|-----|------|---------|-------------|
| 1  | `FEC_MATRICULA` | 0 | 8 | CHAR(8) | DATE DDMMYYYY | Fecha de matriculación del vehículo |
| 2  | `COD_CLASE_MAT` | 8 | 1 | CHAR(1) | Ver tabla | Código de clase de matrícula |
| 3  | `FEC_TRAMITACION` | 9 | 8 | CHAR(8) | DATE DDMMYYYY | Fecha de tramitación (fecha de transferencia en el caso de transferencias) |
| 4  | `MARCA_ITV` | 17 | 30 | CHAR(30) | — | Descripción de la marca del vehículo |
| 5  | `MODELO_ITV` | 47 | 22 | CHAR(22) | — | Modelo del vehículo |
| 6  | `COD_PROCEDENCIA_ITV` | 69 | 1 | CHAR(1) | Ver tabla | Código de procedencia del vehículo |
| 7  | `BASTIDOR_ITV` | 70 | 21 | CHAR(21) | — | Primeros 8 caracteres del bastidor; el resto se completa con `*` |
| 8  | `COD_TIPO` | 91 | 2 | CHAR(2) | Ver tabla | Código del tipo de vehículo |
| 9  | `COD_PROPULSION_ITV` | 93 | 1 | CHAR(1) | Ver tabla | Código del tipo de propulsión |
| 10 | `CILINDRADA_ITV` | 94 | 5 | CHAR(5) | DECIMAL(5,0) FORMAT 'ZZZZ9' | Cilindrada del vehículo. `0` o vacío en vehículos eléctricos |
| 11 | `POTENCIA_ITV` | 99 | 6 | CHAR(6) | DECIMAL(5,2) FORMAT 'ZZ9.99' | Potencia fiscal en CVF (caballos de vapor fiscales). 3 enteros + 2 decimales |
| 12 | `TARA` | 105 | 6 | CHAR(6) | DECIMAL(7,0) FORMAT 'ZZZZ9' | Tara del vehículo (kg). Carga útil = PESO_MAX − TARA |
| 13 | `PESO_MAX` | 111 | 6 | CHAR(6) | DECIMAL(7,0) FORMAT 'ZZZZZ9' | Peso máximo del vehículo (kg) |
| 14 | `NUM_PLAZAS` | 117 | 3 | CHAR(3) | INTEGER FORMAT 'ZZ9' | Número de plazas (en vehículos de carga: plazas máx. en descargado) |
| 15 | `IND_PRECINTO` | 120 | 2 | CHAR(2) | `SI` / blanco | Indicador de vehículo precintado |
| 16 | `IND_EMBARGO` | 122 | 2 | CHAR(2) | `SI` / blanco | Indicador de vehículo embargado |
| 17 | `NUM_TRANSMISIONES` | 124 | 2 | CHAR(2) | INTEGER FORMAT '99' | Número de transmisiones que ha tenido el vehículo |
| 18 | `NUM_TITULARES` | 126 | 2 | CHAR(2) | INTEGER FORMAT '99' | Número de titulares del vehículo |
| 19 | `LOCALIDAD_VEHICULO` | 128 | 24 | CHAR(24) | — | Localidad del domicilio del vehículo |
| 20 | `COD_PROVINCIA_VEH` | 152 | 2 | CHAR(2) | Ver tabla | Código de la provincia donde está domiciliado el vehículo |
| 21 | `COD_PROVINCIA_MAT` | 154 | 2 | CHAR(2) | Ver tabla | Código de la provincia donde fue matriculado el vehículo |
| 22 | `CLAVE_TRAMITE` | 156 | 1 | CHAR(1) | Ver tabla | Código del trámite |
| 23 | `FEC_TRAMITE` | 157 | 8 | CHAR(8) | DATE DDMMYYYY | Fecha en la que se realizó el trámite |
| 24 | `CODIGO_POSTAL` | 165 | 5 | CHAR(5) | INTEGER FORMAT '99999' | Código postal del domicilio del vehículo |
| 25 | `FEC_PRIM_MATRICULACION` | 170 | 8 | CHAR(8) | DATE DDMMYYYY | Fecha de la primera matriculación del vehículo |
| 26 | `IND_NUEVO_USADO` | 178 | 1 | CHAR(1) | `N` / `U` | Nuevo (N) o usado (U) al momento de la matriculación. Campo calculado en el almacén de datos |
| 27 | `PERSONA_FISICA_JURIDICA` | 179 | 1 | CHAR(1) | `D` / `X` | Tipo de titular: D = Física, X = Jurídica |
| 28 | `CODIGO_ITV` | 180 | 9 | CHAR(9) | — | Código ITV del vehículo |
| 29 | `SERVICIO` | 189 | 3 | CHAR(3) | Ver tabla | Código de servicio del vehículo (versión nueva) |
| 30 | `COD_MUNICIPIO_INE_VEH` | 192 | 5 | CHAR(5) | INTEGER FORMAT '99999' | Código INE del municipio del domicilio del vehículo |
| 31 | `MUNICIPIO` | 197 | 30 | CHAR(30) | — | Nombre del municipio donde está domiciliado el vehículo |
| 32 | `KW_ITV` | 227 | 7 | CHAR(7) | DECIMAL(8,2) FORMAT 'ZZZ9.99' | Potencia neta máxima en kW. Si es nulo el valor será `*******` |
| 33 | `NUM_PLAZAS_MAX` | 234 | 3 | CHAR(3) | INTEGER FORMAT 'ZZ9' | Número de plazas máximo (en vehículos de carga: plazas máx. en cargado) |
| 34 | `CO2_ITV` | 237 | 5 | CHAR(5) | SMALLINT FORMAT 'ZZZZZ' | Emisiones de CO2 (g/km) |
| 35 | `RENTING` | 242 | 1 | CHAR(1) | `S` / `N` / blanco | Vehículo de renting: S = sí, N o blanco = no |
| 36 | `COD_TUTELA` | 243 | 1 | CHAR(1) | `S` / `N` / blanco | Titular menor de edad o con tutela judicial |
| 37 | `COD_POSESION` | 244 | 1 | CHAR(1) | `V` / `S` / blanco | Tipo de posesión: V = Venta, S = Subasta, blanco = sin especificar |
| 38 | `IND_BAJA_DEF` | 245 | 1 | CHAR(1) | Ver tabla | Indicador de baja definitiva del vehículo |
| 39 | `IND_BAJA_TEMP` | 246 | 1 | CHAR(1) | `S` / `N` / blanco | Baja temporal: S = dado de baja temporal |
| 40 | `IND_SUSTRACCION` | 247 | 1 | CHAR(1) | `S` / `N` / blanco | Vehículo robado: S = denunciado como robado |
| 41 | `BAJA_TELEMATICA` | 248 | 11 | CHAR(11) | — | Si es baja telemática: `"En desguace"`. En caso contrario, blancos |
| 42 | `TIPO_ITV` | 259 | 25 | CHAR(25) | — | Tipo del vehículo (homologación ITV) |
| 43 | `VARIANTE_ITV` | 284 | 25 | CHAR(25) | — | Variante del vehículo (homologación ITV) |
| 44 | `VERSION_ITV` | 309 | 35 | CHAR(35) | — | Versión del vehículo (homologación ITV) |
| 45 | `FABRICANTE_ITV` | 344 | 70 | CHAR(70) | — | Fabricante del vehículo completo o completado. `ND` = no determinado |
| 46 | `MASA_ORDEN_MARCHA_ITV` | 414 | 6 | CHAR(6) | FORMAT 'zz9' | Masa en orden de marcha (kg) |
| 47 | `MASA_MAXIMA_TECNICA_ITV` | 420 | 6 | CHAR(6) | FORMAT 'zz9' | Masa máxima técnicamente admisible (kg) |
| 48 | `CATEGORIA_HOMOLOGACION_EUROPEA_ITV` | 426 | 4 | CHAR(4) | — | Categoría de homologación UE (ej. L3e, M1, N1…) |
| 49 | `CARROCERIA` | 430 | 4 | CHAR(4) | — | Carrocería del vehículo |
| 50 | `PLAZAS_PIE` | 434 | 3 | CHAR(3) | FORMAT 'zz9' | Número de plazas de pie |
| 51 | `NIVEL_EMISIONES_EURO_ITV` | 437 | 8 | CHAR(8) | — | Nivel de emisiones EURO (Euro 3, Euro 5, etc.) |
| 52 | `CONSUMO_WH_KM_ITV` | 445 | 4 | CHAR(4) | FORMAT 'zz9' | Consumo de energía eléctrica (Wh/km). Solo vehículos eléctricos |
| 53 | `CLASIFICACION_REGLAMENTO_VEHICULOS_ITV` | 449 | 4 | CHAR(4) | — | Clasificación según Anexo II del RD 2822 |
| 54 | `CATEGORIA_VEHICULO_ELECTRICO` | 453 | 4 | CHAR(4) | Ver tabla | Categoría de vehículo eléctrico (BEV, PHEV, HEV, REEV). Vacío si no es eléctrico |
| 55 | `AUTONOMIA_VEHICULO_ELECTRICO` | 457 | 6 | CHAR(6) | — | Autonomía del vehículo eléctrico (km). Solo vehículos eléctricos |
| 56 | `MARCA_VEHICULO_BASE` | 463 | 30 | CHAR(30) | — | Marca del vehículo base (para vehículos completados) |
| 57 | `FABRICANTE_VEHICULO_BASE` | 493 | 50 | CHAR(50) | — | Fabricante del vehículo base |
| 58 | `TIPO_VEHICULO_BASE` | 543 | 35 | CHAR(35) | — | Tipo del vehículo base |
| 59 | `VARIANTE_VEHICULO_BASE` | 578 | 25 | CHAR(25) | — | Variante del vehículo base |
| 60 | `VERSION_VEHICULO_BASE` | 603 | 35 | CHAR(35) | — | Versión del vehículo base |
| 61 | `DISTANCIA_EJES_12_ITV` | 638 | 4 | CHAR(4) | — | Distancia entre ejes 1-2 (mm) |
| 62 | `VIA_ANTERIOR_ITV` | 642 | 4 | CHAR(4) | — | Vía anterior (mm) |
| 63 | `VIA_POSTERIOR_ITV` | 646 | 4 | CHAR(4) | — | Vía posterior (mm) |
| 64 | `TIPO_ALIMENTACION_ITV` | 650 | 1 | CHAR(1) | `M`/`B`/`F` | Tipo de alimentación: M = Monocombustible, B = Bicombustible, F = Flexicombustible |
| 65 | `CONTRASENA_HOMOLOGACION_ITV` | 651 | 25 | CHAR(25) | — | Contraseña de homologación |
| 66 | `ECO_INNOVACION_ITV` | 676 | 1 | CHAR(1) | `S`/`N`/blanco | Eco-innovación: S = Sí, N = No. Pendiente de definición UE, hasta entonces en blanco |
| 67 | `REDUCCION_ECO_ITV` | 677 | 4 | CHAR(4) | — | Reducción eco-innovación. Pendiente de definición UE, hasta entonces en blanco |
| 68 | `CODIGO_ECO_ITV` | 681 | 25 | CHAR(25) | — | Código eco-innovación. Pendiente de definición UE, hasta entonces en blanco |
| 69 | `FEC_PROCESO` | 706 | 8 | CHAR(8) | DATE DDMMYYYY | Fecha en que se grabó el proceso (matriculación, baja o transferencia) |

**Longitud total de línea**: 714 caracteres.

---

## 3. Ficheros disponibles

| # | Tipo | Nombre de fichero |
|---|------|-------------------|
| 1 | Matriculaciones diarias | `export_mat_YYYYMMDD.txt` |
| 2 | Matriculaciones mensuales | `export_mensual_mat_YYYYMM.txt` |

Los ficheros se publican dentro de ZIPs en el portal de microdatos de la DGT.

---

## 4. Tablas de códigos

### COD_CLASE_MAT

Código de clase de matrícula (`COD_CLASE_MAT`, pos 8, len 1).

| Código | Descripción |
|--------|-------------|
| `0` | Ordinaria |
| `1` | Turística |
| `2` | Remolque |
| `3` | Diplomática |
| `4` | Reservada |
| `5` | Vehículo especial |
| `6` | Ciclomotor |
| `7` | Transporte Temporal |
| `8` | Histórica |

---

### COD_PROCEDENCIA

Código de procedencia de los datos de filiación (`COD_PROCEDENCIA_ITV`, pos 69, len 1).

| Código | Descripción |
|--------|-------------|
| `0` | Fabricación Nacional |
| `' '` (blanco) | Fabricación Nacional |
| nulo | Fabricación Nacional |
| `1` | Importación no comunitaria |
| `2` | Subasta |
| `3` | Importación UE |

---

### COD_SERVICIO

Código de servicio antiguo (campo legacy).

| Código | Descripción |
|--------|-------------|
| `0` | Particular |
| `1` | Público |
| `2` | Auto Taxi |
| `3` | Alquiler con conductor |
| `4` | Alquiler sin conductor |
| `5` | Escuela de conductores |
| `6` | Agrícola |
| `7` | Obras y servicios |
| `8` | Transporte escolar |
| `9` | Mercancías peligrosas |

---

### COD_TIPO

Código del tipo de vehículo (`COD_TIPO`, pos 91, len 2).

| Código | Descripción |
|--------|-------------|
| `' '` / nulo / `0` | Sin especificar |
| `00` | Camión |
| `01` | Camión plataforma |
| `02` | Camión caja |
| `03` | Camión furgón |
| `04` | Camión botellero |
| `05` | Camión cisterna |
| `06` | Camión jaula |
| `07` | Camión frigorífico |
| `08` | Camión taller |
| `09` | Camión para cantera |
| `0A` | Camión portavehículos |
| `0B` | Camión mixto |
| `0C` | Camión portacontenedores |
| `0D` | Camión basurero |
| `0E` | Camión isotermo |
| `0F` | Camión silo |
| `0G` | Vehículo mixto adaptable |
| `10` | Camión articulado |
| `11` | Camión articulado plataforma |
| `12` | Camión articulado caja |
| `13` | Camión articulado furgón |
| `14` | Camión articulado botellero |
| `15` | Camión articulado cisterna |
| `16` | Camión articulado jaula |
| `17` | Camión articulado frigorífico |
| `18` | Camión articulado taller |
| `19` | Camión articulado para cantera |
| `1A` | Camión articulado vivienda o caravana |
| `1C` | Camión articulado hormigonera |
| `1D` | Camión articulado volquete |
| `1E` | Camión articulado grúa |
| `1F` | Camión articulado contra incendios |
| `20` | Furgoneta |
| `21` | Furgoneta mixta |
| `22` | Ambulancia |
| `23` | Coche fúnebre |
| `24` | Camioneta |
| `25` | Todo terreno |
| `30` | Autobús |
| `31` | Autobús articulado |
| `32` | Autobús mixto |
| `33` | Bibliobús |
| `34` | Autobús laboratorio |
| `35` | Autobús taller |
| `36` | Autobús sanitario |
| `40` | Turismo |
| **`50`** | **Motocicleta de 2 ruedas sin sidecar** |
| `51` | Motocicleta con sidecar |
| `52` | Motocarro |
| `53` | Automóvil de 3 ruedas |
| `54` | Cuatriciclo pesado |
| `60` | Coche de inválido |
| `70` | Vehículo especial |
| `71` | Pala cargadora |
| `72` | Pala excavadora |
| `73` | Carretilla elevadora |
| `74` | Moniveladora |
| `75` | Compactadora |
| `76` | Apisonadora |
| `77` | Girogravilladora |
| `78` | Machacadora |
| `79` | Quitanieves |
| `7A` | Vivienda |
| `7B` | Barredora |
| `7C` | Hormigonera |
| `7D` | Volquete de canteras |
| `7E` | Grúa |
| `7F` | Servicio contra incendios |
| `7G` | Aspiradora de fangos |
| `7H` | Motocultor |
| `7I` | Maquinaria agrícola automotriz |
| `7J` | Pala cargadora-retroexcavadora |
| `7K` | Tren hasta 160 plazas |
| `80` | Tractor |
| `81` | Tractocamión |
| `82` | Tractocarro |
| `90` | Ciclomotor de 2 ruedas |
| `91` | Ciclomotor de 3 ruedas |
| `92` | Cuatriciclo ligero |
| `EX` | Extranjero |
| `R0` | Remolque |
| `R1` | Remolque plataforma |
| `R2` | Remolque caja |
| `R3` | Remolque furgón |
| `R4` | Remolque botellero |
| `R5` | Remolque cisterna |
| `R6` | Remolque jaula |
| `R7` | Remolque frigorífico |
| `R8` | Remolque taller |
| `R9` | Remolque para canteras |
| `RA` | Remolque vivienda o caravana |
| `RB` | Remolque de viajeros o de autobús |
| `RC` | Remolque hormigonera |
| `RD` | Remolque volquete de cantera |
| `RE` | Remolque de grúa |
| `RF` | Remolque contra incendios |
| `RH` | Maq. agrícola arrastrada de 2 ejes |
| `S0` | Semirremolque |
| `S1` | Semirremolque plataforma |
| `S2` | Semirremolque caja |
| `S3` | Semirremolque furgón |
| `S4` | Semirremolque botellero |
| `S5` | Semirremolque cisterna |
| `S6` | Semirremolque jaula |
| `S7` | Semirremolque frigorífico |
| `S8` | Semirremolque taller |
| `S9` | Semirremolque cantera |
| `SA` | Semirremolque vivienda o caravana |
| `SB` | Semirremolque viajeros o autobús |
| `SC` | Semirremolque hormigonera |
| `SD` | Semirremolque volquete de cantera |
| `SE` | Semirremolque grúa |
| `SF` | Semirremolque contra incendios |
| `SH` | Maq. agrícola arrastrada de 1 eje |

---

### COD_PROPULSION

Código del tipo de propulsión (`COD_PROPULSION_ITV`, pos 93, len 1).

| Código | Descripción |
|--------|-------------|
| `0` | Gasolina |
| `1` | Diesel |
| **`2`** | **Eléctrico** |
| `3` | Otros |
| `4` | Butano |
| `5` | Solar |
| `6` | Gas Licuado de Petróleo (GLP) |
| `7` | Gas Natural Comprimido (GNC) |
| `8` | Gas Natural Licuado (GNL) |
| `9` | Hidrógeno |
| `A` | Biometano |
| `B` | Etanol |
| `C` | Biodiesel |

---

### COD_PROVINCIA_VEH

Provincia de domiciliación del vehículo (`COD_PROVINCIA_VEH`, pos 152, len 2).

| Código | Provincia |
|--------|-----------|
| `A` | Alicante/Alacant |
| `AB` | Albacete |
| `AL` | Almería |
| `AV` | Ávila |
| `B` | Barcelona |
| `BA` | Badajoz |
| `BI` | Bizkaia |
| `BU` | Burgos |
| `C` | Coruña (A) |
| `CA` | Cádiz |
| `CC` | Cáceres |
| `CE` | Ceuta |
| `CO` | Córdoba |
| `CR` | Ciudad Real |
| `CS` | Castellón/Castelló |
| `CU` | Cuenca |
| `DS` | Desconocido |
| `EX` | Extranjero |
| `GC` | Palmas (Las) |
| `GI` | Girona |
| `GR` | Granada |
| `GU` | Guadalajara |
| `H` | Huelva |
| `HU` | Huesca |
| `IB` | Balears (Illes) |
| `J` | Jaén |
| `L` | Lleida |
| `LE` | León |
| `LO` | Rioja (La) |
| `LU` | Lugo |
| `M` | Madrid |
| `MA` | Málaga |
| `ML` | Melilla |
| `MU` | Murcia |
| `NA` | Navarra |
| `O` | Asturias |
| `OU` | Ourense |
| `P` | Palencia |
| `PO` | Pontevedra |
| `S` | Cantabria |
| `SA` | Salamanca |
| `SE` | Sevilla |
| `SG` | Segovia |
| `SO` | Soria |
| `SS` | Gipuzkoa |
| `T` | Tarragona |
| `TE` | Teruel |
| `TF` | Santa Cruz de Tenerife |
| `TO` | Toledo |
| `V` | Valencia/València |
| `VA` | Valladolid |
| `VI` | Araba/Álava |
| `Z` | Zaragoza |
| `ZA` | Zamora |

---

### COD_PROVINCIA_MAT

Provincia de matriculación (`COD_PROVINCIA_MAT`, pos 154, len 2). Mismos códigos que `COD_PROVINCIA_VEH` con una entrada adicional:

| Código | Descripción |
|--------|-------------|
| `SC` | Servicios Centrales (exclusivo de COD_PROVINCIA_MAT) |

El resto de códigos es idéntico a `COD_PROVINCIA_VEH`.

---

### CLAVE_TRAMITE

Código del trámite (`CLAVE_TRAMITE`, pos 156, len 1).

| Código | Descripción |
|--------|-------------|
| **`1`** | **Matriculación ordinaria y de ciclomotores** |
| `2` | Transferencia |
| `3` | Baja definitiva (excluidos Plan Renove, exportación y tránsito comunitario) |
| `4` | Baja definitiva por Plan Renove |
| `5` | Rematriculación |
| `6` | Baja temporal |
| `7` | Baja definitiva por exportación y por tránsito comunitario |
| `8` | Matriculación vehículo especial |
| `9` | Matriculación temporal |
| `A` | Prórroga matrícula temporal |
| `B` | Paso de matrícula temporal a definitiva |

---

### SERVICIO

Código de servicio del vehículo — versión nueva (`SERVICIO`, pos 189, len 3).

| Código | Descripción                                        |
|--------|----------------------------------------------------|
| `A00` | Público — Sin especificar                          |
| `A01` | Público — Alquiler sin conductor                   |
| `A02` | Público — Alquiler con conductor                   |
| `A03` | Público — Aprendizaje de conducción                |
| `A04` | Público — Taxi                                     |
| `A05` | Público — Auxilio en carretera                     |
| `A07` | Público — Ambulancia                               |
| `A08` | Público — Funerario                                |
| `A09` | Particular — Obras                                 |
| `A10` | Público — Mercancías peligrosas                    |
| `A11` | Público — Basurero                                 |
| `A12` | Público — Transporte escolar                       |
| `A13` | Público — Policía                                  |
| `A14` | Público — Bomberos                                 |
| `A15` | Público — Protección civil y salvamento            |
| `A16` | Público — Defensa                                  |
| `A18` | Público — Actividad económica                      |
| `A20` | Público — Mercancías perecederas                   |
| `B00` | Particular — Sin especificar                       |
| `B06` | Particular — Agrícola                              |
| `B07` | Particular — (sin descripción en documento fuente) |
| `B09` | Particular — Obras                                 |
| `B17` | Particular — Vivienda                              |
| `B18` | Particular — Actividad económica                   |
| `B19` | Particular — Recreativo                            |
| `B21` | Particular — Vehículo para ferias                  |
| `B21` | Particular — Vehículo para ferias                  |
| `B21` | Particular — Vehículo Histórico                    |

---

### IND_BAJA_DEF

Indicador del motivo de baja definitiva (`IND_BAJA_DEF`, pos 245, len 1).

| Código | Descripción |
|--------|-------------|
| `0` | Desguace |
| `1` | Agotamiento |
| `2` | Antigüedad |
| `3` | Renovación del parque |
| `4` | Otros motivos |
| `5` | R.D.L 4/1994, R.D.L 10/1994, R.D.L 4/1997 |
| `7` | Voluntaria |
| `8` | Exportación |
| `9` | Tránsito comunitario |
| `A` | De oficio por abandono |
| `B` | De oficio por seguridad |
| `C` | Por Tratamiento Residual |

---

### CATEGORIA_VEHICULO_ELECTRICO

Categoría eléctrica del vehículo (`CATEGORIA_VEHICULO_ELECTRICO`, pos 453, len 4). Vacío si el vehículo no es eléctrico.

| Código | Descripción |
|--------|-------------|
| `BEV` | Eléctrico de Batería (Battery Electric Vehicle) |
| `PHEV` | Eléctrico Enchufable (Plug-in Hybrid Electric Vehicle) |
| `HEV` | Eléctrico Híbrido (Hybrid Electric Vehicle — no enchufable) |
| `REEV` | Eléctrico de Autonomía Extendida (Range Extended Electric Vehicle) |

---

## 5. Campos de interés por caso de uso

Referencia rápida para análisis futuros sobre el parque de vehículos español.

### Matriculaciones de motos nuevas (caso actual)

```
COD_TIPO           = '50'   Motocicleta 2 ruedas sin sidecar
CLAVE_TRAMITE      = '1'    Matriculación ordinaria
IND_NUEVO_USADO    = 'N'    Nuevo
FABRICANTE_ITV    ≠ 'ND'    Con fabricante identificado
COD_CLASE_MAT      = '0'    Ordinaria
```

Campos útiles: `MARCA_ITV`, `MODELO_ITV`, `CILINDRADA_ITV`, `KW_ITV`, `COD_PROVINCIA_VEH`, `FEC_MATRICULA`

### Motos eléctricas nuevas

Mismo filtro que el anterior más:

```
COD_PROPULSION_ITV = '2'    Eléctrico
```

Campos adicionales de interés: `KW_ITV`, `AUTONOMIA_VEHICULO_ELECTRICO`, `CATEGORIA_VEHICULO_ELECTRICO`, `CONSUMO_WH_KM_ITV`

### Análisis de flota (todos los vehículos, no solo motos)

Filtrar por `COD_TIPO` según la categoría deseada (turismo = `40`, furgoneta = `20`, etc.)

### Transferencias de vehículos usados

```
CLAVE_TRAMITE = '2'   Transferencia
IND_NUEVO_USADO = 'U' Usado
```

### Bajas definitivas (seguimiento del parque)

```
CLAVE_TRAMITE IN ('3','4','7')   Bajas definitivas
IND_BAJA_DEF                      Motivo de la baja
```

### Vehículos de servicio público

```
SERVICIO LIKE 'A%'   Servicio público
```

### Vehículos históricos

```
COD_CLASE_MAT = '8'   Matrícula histórica
```

### Análisis territorial

`COD_PROVINCIA_VEH` (domicilio) vs `COD_PROVINCIA_MAT` (donde se matriculó) permiten detectar matriculaciones cruzadas entre provincias. `COD_MUNICIPIO_INE_VEH` + `MUNICIPIO` dan granularidad municipal.

### Emisiones y medioambiente

`CO2_ITV` (g/km), `NIVEL_EMISIONES_EURO_ITV` (Euro 5, Euro 6…), `COD_PROPULSION_ITV` (tipo de combustible), `CONSUMO_WH_KM_ITV` (eléctricos).

### Vehículos alternativos no eléctricos

```
COD_PROPULSION_ITV IN ('6','7','8','9','A','B','C')
  6 = GLP, 7 = GNC, 8 = GNL, 9 = Hidrógeno, A = Biometano, B = Etanol, C = Biodiesel
```

### Renting

```
RENTING = 'S'
```

Permite segmentar matriculaciones por persona física/jurídica + renting para análisis del mercado B2B vs B2C.

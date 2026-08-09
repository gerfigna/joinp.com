#!/usr/bin/env node
'use strict';

/**
 * Curación manual (investigación web, agosto 2026) de precio base y
 * etiquetas para los vehiculos en las posiciones 101-200 por matriculaciones.
 * Ver curate-vehiculos-top30.js para la metodología.
 */

const { SQLITE_DB_PATH } = require('./lib/constants');
const { openDatabase } = require('./lib/sqlite-store');

const CURATED = [
  { id: 161, marca: 'KOVE', modelo: 'KOVE 800 X GT', precio: 7999, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Turismo'] },
  { id: 316, marca: 'HONDA', modelo: 'CB 125 F', precio: 2999, tags: ['Moto Naked', 'Urbana', '125cc', 'Carné A1', 'Económica', 'Carretera'] },
  { id: 171, marca: 'KOVE', modelo: 'KOVE 800 X PRO 2026', precio: 7999, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 135, marca: 'ROYAL ENFIELD', modelo: 'HIMALAYAN 452', precio: 5400, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 92, marca: 'BMW', modelo: 'F 900 XR', precio: 12950, tags: ['Moto Touring', 'Grand Turismo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Turismo', 'Premium', 'Gama alta'] },
  { id: 53, marca: 'CFMOTO', modelo: '1000MT-X', precio: 9990, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Gama alta', 'Pantalla TFT', 'Trail Turismo'] },
  { id: 80, marca: 'SYM', modelo: 'SYMPHONY 50', precio: 2299, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 400, marca: 'CFMOTO', modelo: '675SR-R', precio: 7995, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 124, marca: 'QJMOTOR', modelo: 'SRK 125 S E5+', precio: 3299, tags: ['Moto Naked', 'Deportivo', '125cc', 'Carné A1', 'Carretera', 'Con ABS'] },
  { id: 52, marca: 'CYCLONE', modelo: 'RX2', precio: 3999, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Económica', 'Trail Deportiva'] },
  { id: 95, marca: 'PIAGGIO', modelo: 'VESPA GTS 125', precio: 6250, tags: ['Scooter', 'Clásico', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Premium', 'Scooter Urban'] },
  { id: 370, marca: 'VOGE', modelo: 'SR3', precio: 3992, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Carné A2', 'Gama media', 'Scooter Sport'] },
  { id: 573, marca: 'BMW', modelo: 'C 400 X', precio: 7960, tags: ['Scooter', 'Crossover', 'Adventure', 'Media (300-400cc)', 'Carné A2', 'Premium', 'Gama alta', 'Mixta', 'Scooter Adventure'] },
  { id: 39, marca: 'PEUGEOT', modelo: 'PULSION EVO', precio: 3399, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Sport'] },
  { id: 133, marca: 'KTM', modelo: 'KTM 125 DUKE', precio: 5299, tags: ['Moto Naked', 'Deportivo', '125cc', 'Carné A1', 'Carretera', 'Premium', 'Con ABS'] },
  { id: 362, marca: 'HONDA', modelo: 'NT1100', precio: 15600, tags: ['Moto Touring', 'Grand Turismo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Turismo', 'Premium', 'Gama alta', 'Pantalla TFT', 'Conectividad'] },
  { id: 523, marca: 'KTM', modelo: 'KTM 300 EXC', precio: 11195, tags: ['Trail', 'Off-road/Aventura', 'Carné A', 'Gama alta', 'Premium'] },
  { id: 278, marca: 'ZONTES', modelo: 'ZT125-U', precio: 3287, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Urban'] },
  { id: 156, marca: 'QJMOTOR', modelo: 'SQ 16 E5+', precio: 2899, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Con ABS', 'Scooter Urban'] },
  { id: 361, marca: 'APRILIA', modelo: 'SXR 50', precio: 2270, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Deportivo', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 50, marca: 'BAJAJ', modelo: 'PULSAR NS 125', precio: 2699, tags: ['Moto Naked', 'Deportivo', '125cc', 'Carné A1', 'Carretera', 'Económica', 'Con ABS', 'Conectividad'] },
  { id: 120, marca: 'ZONTES', modelo: '368D', precio: 4192, tags: ['Scooter', 'Deportivo', 'Urbana', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Scooter Sport'] },
  { id: 98, marca: 'YAMAHA', modelo: 'YZF-R9', precio: 16000, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 87, marca: 'KEEWAY', modelo: 'VIESTE 125', precio: 2190, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 172, marca: 'BENDA', modelo: 'NAPOLEON 125', precio: 4790, tags: ['Moto Custom', 'Clásico', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Premium', 'Con ABS', 'Control de tracción', 'Pantalla TFT'] },
  { id: 1, marca: 'CFMOTO', modelo: '800MT-X', precio: 7995, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Deportiva'] },
  { id: 237, marca: 'HONDA', modelo: 'CRF 300 L', precio: 6050, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 395, marca: 'BMW', modelo: 'F 450 GS', precio: 7390, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Beginner/Iniciación', 'Gama media', 'Premium', 'Trail Deportiva'] },
  { id: 134, marca: 'SYM', modelo: 'CRUISYM 125 TCS E5+', precio: 4499, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Control de tracción', 'Scooter Sport'] },
  { id: 83, marca: 'YAMAHA', modelo: 'XSR-125', precio: 4999, tags: ['Moto Naked', 'Clásico', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Premium'] },
  { id: 284, marca: 'MH MOTORCYCLES', modelo: 'VR10', precio: 3195, tags: ['Scooter', 'Crossover', 'Adventure', '125cc', 'Carné A1', 'Económica', 'Mixta', 'Scooter Adventure'] },
  { id: 100, marca: 'VOGE', modelo: '625R', precio: 5184, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama media', 'Con ABS'] },
  { id: 22, marca: 'ZONTES', modelo: 'ZT125-U1', precio: 3387, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Urban'] },
  { id: 314, marca: 'DUCATI', modelo: 'MULTISTRADA V2', precio: 15290, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 340, marca: 'SUZUKI', modelo: 'GSX-S 1000', precio: 12499, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 72, marca: 'SILENCE', modelo: 'S02', precio: 3490, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Bajo consumo', 'Compacto', 'Económica', 'Scooter Urban'] },
  { id: 148, marca: 'SUZUKI', modelo: 'AVENIS 125', precio: 2959, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Scooter Urban'] },
  { id: 211, marca: 'SYM', modelo: 'ADX 125 LC TCS E5+', precio: 3999, tags: ['Scooter', 'Crossover', 'Adventure', 'City/Commuting', '125cc', 'Carné A1', 'Control de tracción', 'Gama media', 'Mixta', 'Scooter Adventure'] },
  { id: 233, marca: 'KYMCO', modelo: 'SKYTOWN 125', precio: 2750, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Con ABS', 'Entry-level', 'Scooter Urban'] },
  { id: 485, marca: 'KAWASAKI', modelo: 'NINJA 650', precio: 8585, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 1059, marca: 'KOVE', modelo: 'KOVE 800 X PRO', precio: 7999, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 77, marca: 'KAWASAKI', modelo: 'NINJA ZX-4R', precio: 9450, tags: ['Moto Sport', 'Deportivo', 'Media (300-400cc)', 'Carné A2', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 79, marca: 'STARK', modelo: 'VARG', precio: 12490, tags: ['Off-road/Aventura', 'Premium', 'Gama alta'] },
  { id: 146, marca: 'HERO MOTOCORP', modelo: 'X PULSE 200 4V', precio: 2592, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Económica', 'Trail Deportiva'] },
  { id: 118, marca: 'QJMOTOR', modelo: 'SRV 125 E5+', precio: 3299, tags: ['Moto Custom', 'Clásico', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Económica', 'Con ABS'] },
  { id: 265, marca: 'QJMOTOR', modelo: 'SRT 900 S', precio: 8699, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Turismo'] },
  { id: 320, marca: 'KEEWAY', modelo: 'RKS 125', precio: 1990, tags: ['Moto Naked', 'Urbana', '125cc', 'Carné A1', 'Económica', 'Carretera', 'Entry-level'] },
  { id: 566, marca: 'BMW', modelo: 'S 1000 XR', precio: 18800, tags: ['Moto Touring', 'Grand Turismo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Turismo', 'Premium', 'Gama alta'] },
  { id: 390, marca: 'KAWASAKI', modelo: 'VERSYS 650', precio: 9050, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Turismo'] },
  { id: 254, marca: 'BMW', modelo: 'R 1300 RS', precio: 18330, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 84, marca: 'KTM', modelo: 'KTM 1390 SUPER ADVENTU', precio: 22299, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 141, marca: 'DUCATI', modelo: 'MULTISTRADA V4', precio: 22790, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 94, marca: 'ZONTES', modelo: '368M', precio: 4192, tags: ['Scooter', 'Deportivo', 'Urbana', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Scooter Sport'] },
  { id: 240, marca: 'PEUGEOT', modelo: 'TWEET FL 125 CC', precio: 2695, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Scooter Urban'] },
  { id: 300, marca: 'PIAGGIO', modelo: 'VESPA GTS', precio: 5999, tags: ['Scooter', 'Clásico', 'Urbana', 'Media (300-400cc)', 'Carné A2', 'Premium', 'Gama alta', 'Scooter Urban'] },
  { id: 163, marca: 'MOTO MORINI', modelo: 'X-CAPE 1200', precio: 11990, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Mixta', 'Gama alta', 'Trail Turismo', 'Con ABS', 'Pantalla TFT'] },
  { id: 68, marca: 'MH MOTORCYCLES', modelo: 'VRT', precio: 2795, tags: ['Scooter', 'Clásico', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Con ABS', 'Control de tracción', 'Scooter Urban'] },
  { id: 349, marca: 'HONDA', modelo: 'CBR500', precio: 7250, tags: ['Moto Sport', 'Deportivo', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 65, marca: 'YAMAHA', modelo: 'R7', precio: 10499, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 217, marca: 'BMW', modelo: 'F 900 GS ADVENTURE', precio: 15400, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Premium', 'Gama alta', 'Trail Deportiva'] },
  { id: 27, marca: 'QJMOTOR', modelo: 'SRT 900 SX', precio: 8999, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 165, marca: 'KAWASAKI', modelo: 'Z1100', precio: 12450, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 33, marca: 'KOVE', modelo: 'KOVE 800 X RALLY', precio: 10699, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 121, marca: 'QJMOTOR', modelo: 'SRT 600 SX E5+', precio: 5999, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Económica', 'Gama media', 'Trail Deportiva'] },
  { id: 24, marca: 'SYM', modelo: 'JOYMAX Z 300 E5+', precio: 4599, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Media (300-400cc)', 'Carné A2', 'Gama media', 'Scooter Sport'] },
  { id: 209, marca: 'VOGE', modelo: 'SR4 MAX', precio: 6289, tags: ['Scooter', 'Deportivo', 'Grand Turismo', 'Turismo', 'Media (300-400cc)', 'Carné A2', 'Premium', 'Gama media', 'Scooter Sport'] },
  { id: 307, marca: 'QJMOTOR', modelo: 'SRT 700 X E5+', precio: 8499, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 243, marca: 'APRILIA', modelo: 'RX 125', precio: 4450, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Trail Deportiva'] },
  { id: 350, marca: 'BMW', modelo: 'S 1000 RR', precio: 24430, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 348, marca: 'CFMOTO', modelo: '700MT', precio: 6995, tags: ['Trail', 'Moto Adventure', 'Moto Touring', 'Adventure', 'Grande (600cc+)', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Turismo'] },
  { id: 195, marca: 'PEUGEOT', modelo: 'DJANGO', precio: 3285, tags: ['Scooter', 'Clásico', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Scooter Urban'] },
  { id: 409, marca: 'BENELLI', modelo: 'BN125', precio: 2590, tags: ['Moto Naked', 'Urbana', '125cc', 'Carné A1', 'Económica', 'Carretera', 'Entry-level'] },
  { id: 46, marca: 'TRIUMPH', modelo: 'SPEED 400', precio: 5745, tags: ['Moto Naked', 'Clásico', 'Deportivo', 'Carné A2', 'Carretera', 'Premium', 'Gama media'] },
  { id: 368, marca: 'ZONTES', modelo: '125M', precio: 3487, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Gama media', 'Pantalla TFT', 'Scooter Urban'] },
  { id: 250, marca: 'PEUGEOT', modelo: 'TWEET', precio: 2390, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 371, marca: 'KAWASAKI', modelo: 'VULCAN S', precio: 8260, tags: ['Moto Custom', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 318, marca: 'YAMAHA', modelo: 'TRICITY 125', precio: 5299, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Premium', 'Con ABS', 'Scooter Urban'] },
  { id: 182, marca: 'CFMOTO', modelo: '675NK', precio: 6495, tags: ['Moto Naked', 'Deportivo', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 130, marca: 'MACBOR', modelo: 'MONTANA XR5 510 E5+', precio: 6199, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Carné A2', 'Off-road/Aventura', 'Gama media', 'Trail Deportiva'] },
  { id: 358, marca: 'KAWASAKI', modelo: 'VERSYS 1100', precio: 15285, tags: ['Moto Touring', 'Trail', 'Grand Turismo', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A', 'Carretera', 'Turismo', 'Premium', 'Gama alta', 'Trail Turismo'] },
  { id: 434, marca: 'MITT', modelo: 'TY125T-58E', precio: 3945, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Trail Deportiva'] },
  { id: 815, marca: 'EFUN', modelo: 'LION', precio: 6590, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Premium', 'Scooter Urban'] },
  { id: 230, marca: 'BENELLI', modelo: 'TRK 702', precio: 6590, tags: ['Trail', 'Moto Adventure', 'Adventure', 'Grande (600cc+)', '700cc+', 'Carné A2', 'Off-road/Aventura', 'Mixta', 'Gama media', 'Trail Deportiva'] },
  { id: 104, marca: 'HONDA', modelo: 'CL500', precio: 6100, tags: ['Moto Custom', 'Clásico', 'Carné A2', 'Urbana', 'Carretera', 'Gama media'] },
  { id: 219, marca: 'MITT', modelo: 'TY125T-26F', precio: 3945, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Trail Deportiva'] },
  { id: 167, marca: 'PIAGGIO', modelo: 'LIBERTY', precio: 2499, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Económica', 'Entry-level', 'Compacto', 'Scooter Urban'] },
  { id: 226, marca: 'KTM', modelo: 'KTM 390 ENDURO R', precio: 6399, tags: ['Trail', 'Off-road/Aventura', 'Carné A2', 'Gama media', 'Premium'] },
  { id: 32, marca: 'KEEWAY', modelo: 'ICON 125 S', precio: 1990, tags: ['Scooter', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Económica', 'Entry-level', 'Scooter Urban'] },
  { id: 164, marca: 'LAMBRETTA', modelo: 'V125 SPECIAL FLEX', precio: 3699, tags: ['Scooter', 'Clásico', 'Urbana', 'City/Commuting', '125cc', 'Carné A1', 'Premium', 'Scooter Urban'] },
  { id: 129, marca: 'KEEWAY', modelo: 'V-CRUISE', precio: 4390, tags: ['Moto Custom', 'Clásico', '125cc', 'Carné A1', 'Urbana', 'Carretera', 'Premium'] },
  { id: 288, marca: 'SILENCE', modelo: 'S01+', precio: 7500, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Premium', 'Scooter Urban'] },
  { id: 235, marca: 'KAWASAKI', modelo: 'ELIMINATOR', precio: 6825, tags: ['Moto Custom', 'Deportivo', 'Carné A2', 'Carretera', 'Gama media'] },
  { id: 334, marca: 'MITT', modelo: '125GP', precio: 3195, tags: ['Moto Sport', 'Deportivo', '125cc', 'Carné A1', 'Carretera', 'Económica'] },
  { id: 375, marca: 'HONDA', modelo: 'CBR600R3', precio: 12700, tags: ['Moto Sport', 'Deportivo', 'Grande (600cc+)', 'Carné A2', 'Carretera', 'Premium', 'Gama alta'] },
  { id: 422, marca: 'VELCA', modelo: 'EON', precio: 7490, tags: ['Scooter', 'Urbana', 'City/Commuting', 'Premium', 'Gama alta', 'Scooter Urban'] },
  { id: 487, marca: 'MITT', modelo: 'TY125T-26G', precio: 3195, tags: ['Trail', 'Moto Adventure', 'Adventure', '125cc', 'Carné A1', 'Off-road/Aventura', 'Económica', 'Trail Deportiva'] },
  { id: 187, marca: 'KAWASAKI', modelo: 'NINJA 500', precio: 6985, tags: ['Moto Sport', 'Deportivo', 'Carné A2', 'Carretera', 'Gama media'] },
  // ids 62 (RIEJU NOT APPLICABLE), 63 (BETA N/A), 247 (RIEJU N/A) omitidos: modelo no identificable.
];

function applyCuration(db) {
  const getTagId = db.prepare('SELECT id FROM tags WHERE NOMBRE = ?');
  const setPrecio = db.prepare('UPDATE vehiculos SET PRECIO = ? WHERE id = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO vehiculo_tags (VEHICULO_ID, TAG_ID) VALUES (?, ?)');
  const checkVehiculo = db.prepare('SELECT MARCA_ITV_NORMALIZADO marca, MODELO_ITV_NORMALIZADO modelo FROM vehiculos WHERE id = ?');

  let vehiculosActualizados = 0;
  let tagsAsignados = 0;

  db.exec('BEGIN');
  for (const entry of CURATED) {
    const current = checkVehiculo.get(entry.id);
    if (!current) { console.warn(`WARN: vehiculos.id=${entry.id} no existe — omitido`); continue; }
    if (current.marca !== entry.marca || current.modelo !== entry.modelo) {
      console.warn(`WARN: vehiculos.id=${entry.id} esperado ${entry.marca} ${entry.modelo}, encontrado ${current.marca} ${current.modelo} — omitido`);
      continue;
    }

    setPrecio.run(entry.precio, entry.id);
    vehiculosActualizados++;

    for (const tagName of entry.tags) {
      const tag = getTagId.get(tagName);
      if (!tag) { console.warn(`WARN: tag "${tagName}" no existe en el catálogo`); continue; }
      linkTag.run(entry.id, tag.id);
      tagsAsignados++;
    }
  }
  db.exec('COMMIT');

  console.log(`Precio actualizado en ${vehiculosActualizados} vehiculos. ${tagsAsignados} asignaciones vehiculo_tags creadas.`);
}

function main() {
  const db = openDatabase();
  applyCuration(db);
  db.close();
  console.log(`Done. DB: ${SQLITE_DB_PATH}`);
}

main();

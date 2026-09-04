'use strict';

// Catálogo de etiquetas para categorizar `vehiculos`. [nombre, categoría]
const TAGS = [
  // Tipo de vehículo
  ['Scooter', 'Tipo de vehículo'],
  ['Trail', 'Tipo de vehículo'],
  ['Moto Custom', 'Tipo de vehículo'],
  ['Moto Naked', 'Tipo de vehículo'],
  ['Moto Sport', 'Tipo de vehículo'],
  ['Moto Clásica', 'Tipo de vehículo'],
  ['Moto Touring', 'Tipo de vehículo'],
  ['Moto Adventure', 'Tipo de vehículo'],

  // Estilo/Concepto
  ['Urbana', 'Estilo/Concepto'],
  ['Deportivo', 'Estilo/Concepto'],
  ['Clásico', 'Estilo/Concepto'],
  ['Grand Turismo', 'Estilo/Concepto'],
  ['Crossover', 'Estilo/Concepto'],
  ['Adventure', 'Estilo/Concepto'],

  // Prestaciones/Segmento
  ['Económica', 'Prestaciones/Segmento'],
  ['Premium', 'Prestaciones/Segmento'],
  ['Bajo consumo', 'Prestaciones/Segmento'],
  ['Compacto', 'Prestaciones/Segmento'],
  ['Gran cilindrada', 'Prestaciones/Segmento'],
  ['Medio cilindrada', 'Prestaciones/Segmento'],
  ['Turismo', 'Prestaciones/Segmento'],
  ['Touring', 'Prestaciones/Segmento'],

  // Por cilindrada
  ['125cc', 'Cilindrada'],
  ['300cc', 'Cilindrada'],
  ['700cc+', 'Cilindrada'],
  ['Ligera (110-124cc)', 'Cilindrada'],
  ['Media (300-400cc)', 'Cilindrada'],
  ['Grande (600cc+)', 'Cilindrada'],

  // Por uso principal
  ['City/Commuting', 'Uso principal'],
  ['Carretera', 'Uso principal'],
  ['Off-road/Aventura', 'Uso principal'],
  ['Mixta', 'Uso principal'],

  // Por audiencia
  ['Carné A1', 'Audiencia'],
  ['Carné A2', 'Audiencia'],
  ['Carné A', 'Audiencia'],

  // Combinaciones útiles
  ['Scooter Urban', 'Combinación'],
  ['Scooter Sport', 'Combinación'],
  ['Scooter Adventure', 'Combinación'],
  ['Trail Deportiva', 'Combinación'],
  ['Trail Turismo', 'Combinación'],
];

module.exports = { TAGS };

/* Model-specific artwork: eight silhouettes, each with five painted images. */
(function () {
  'use strict';
  const base = document.currentScript.src;
  const paints = Object.freeze([
    Object.freeze({ id: 'polar', name: 'Branco Polar', hex: '#e7ebef' }),
    Object.freeze({ id: 'ocean', name: 'Azul Oceano', hex: '#287ec5' }),
    Object.freeze({ id: 'ruby', name: 'Vermelho Rubi', hex: '#c33d42' }),
    Object.freeze({ id: 'graphite', name: 'Grafite', hex: '#333d4a' }),
    Object.freeze({ id: 'solar', name: 'Amarelo Solar', hex: '#e9b847' })
  ]);
  const atlases = Object.freeze({
    a: Object.freeze({ url: new URL('../assets/fleet-models-a.webp', base).href, width: 1536, height: 1024 }),
    b: Object.freeze({ url: new URL('../assets/fleet-models-b.webp', base).href, width: 1536, height: 1024 })
  });
  const models = Object.freeze([
    { id: 'velox-city', name: 'Velox City', kind: 'Hatch', category: 'hatch', atlas: 'a', row: 0, defaultPaint: 'ocean', description: 'Hatch de cinco portas, linhas angulares e perfil urbano.' },
    { id: 'montara-cross', name: 'Montara Cross', kind: 'SUV', category: 'suv', atlas: 'a', row: 1, defaultPaint: 'polar', description: 'SUV de teto alto, frente robusta e espaço para a família.' },
    { id: 'aureon-sedan', name: 'Aureon Sedan', kind: 'Sedã', category: 'sedan', atlas: 'a', row: 2, defaultPaint: 'ruby', description: 'Sedã alongado, linhas elegantes e cabine confortável.' },
    { id: 'ravik-utility', name: 'Ravik Utility', kind: 'Picape', category: 'pickup', atlas: 'a', row: 3, defaultPaint: 'solar', description: 'Picape de cabine dupla, proporções fortes e vocação de trabalho.' },
    { id: 'nexo-compact', name: 'Nexo Compact', kind: 'Compacto', category: 'compact', atlas: 'b', row: 0, defaultPaint: 'polar', description: 'Compacto arredondado de três portas, leve e fácil de reconhecer.' },
    { id: 'altis-sport', name: 'Altis Sport', kind: 'Esportivo', category: 'sports', atlas: 'b', row: 1, defaultPaint: 'graphite', description: 'Cupê baixo e largo, com desenho esportivo e personalidade própria.' },
    { id: 'orion-p', name: 'Orion P', kind: 'Picape', category: 'pickup', atlas: 'b', row: 2, defaultPaint: 'polar', description: 'Picape de cabine simples e caçamba longa, distinta da Ravik.' },
    { id: 'lynx-z4', name: 'Lynx Z4', kind: 'Hatch', category: 'hatch', atlas: 'b', row: 3, defaultPaint: 'ocean', description: 'Hatch de duas portas com carroceria larga e atitude esportiva.' }
  ].map(Object.freeze));
  // The generated sheet has small spacing differences between vehicles. These
  // boundaries follow the real gaps, preserving bumpers and long pickup beds.
  const crops = Object.freeze({
    a: Object.freeze([
      { columns: [0, 311, 618, 928, 1238, 1536], y: 45, height: 200 },
      { columns: [0, 312, 624, 934, 1240, 1536], y: 278, height: 223 },
      { columns: [0, 313, 620, 932, 1238, 1536], y: 541, height: 194 },
      { columns: [0, 315, 621, 930, 1237, 1536], y: 752, height: 220 }
    ].map(Object.freeze)),
    b: Object.freeze([
      { columns: [0, 314, 618, 919, 1224, 1536], y: 30, height: 247 },
      { columns: [0, 316, 620, 925, 1230, 1536], y: 312, height: 193 },
      { columns: [0, 321, 625, 926, 1229, 1536], y: 535, height: 211 },
      { columns: [0, 318, 621, 923, 1226, 1536], y: 765, height: 217 }
    ].map(Object.freeze))
  });
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const sprites = Object.freeze({
    hatch: Object.freeze({ label: 'Hatch', box: '311 45 307 200' }),
    suv: Object.freeze({ label: 'SUV', box: '0 278 312 223' }),
    sedan: Object.freeze({ label: 'Sedã', box: '620 541 312 194' }),
    pickup: Object.freeze({ label: 'Picape', box: '1237 752 299 220' }),
    compact: Object.freeze({ label: 'Compacto', box: '0 30 314 247' }),
    sports: Object.freeze({ label: 'Esportivo', box: '925 312 305 193' })
  });
  function category(car = {}) {
    const kind = normalized(car.kind || car.segment);
    if (/suv|utilitario/.test(kind)) return 'suv';
    if (/seda/.test(kind)) return 'sedan';
    if (/picape|pickup/.test(kind)) return 'pickup';
    if (/esport|sport/.test(kind)) return 'sports';
    if (/compact/.test(kind)) return 'compact';
    return 'hatch';
  }
  function modelFor(car = {}) {
    if (typeof car === 'string') return models.find(model => model.id === car || normalized(model.name) === normalized(car)) || null;
    return models.find(model => model.id === car.modelId) ||
      models.find(model => normalized(model.name) === normalized(car.name)) ||
      models.find(model => model.category === category(car));
  }
  function colorChannels(value) {
    const match = String(value || '').match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (!match) return null;
    const hex = match[1].length === 3 ? [...match[1]].map(char => char + char).join('') : match[1];
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  }
  function paintFor(car = {}) {
    const explicit = paints.find(paint => paint.id === car.paintId);
    if (explicit) return explicit;
    const channels = colorChannels(car.color);
    if (channels) return paints.reduce((best, paint) => {
      const distance = colorChannels(paint.hex).reduce((sum, value, index) => sum + (value - channels[index]) ** 2, 0);
      return distance < best.distance ? { paint, distance } : best;
    }, { paint: paints[0], distance: Infinity }).paint;
    const model = modelFor(car);
    return paints.find(paint => paint.id === model.defaultPaint) || paints[0];
  }
  function variant(car = {}) {
    const model = modelFor(car), paint = paintFor(car), atlas = atlases[model.atlas];
    const column = paints.indexOf(paint), crop = crops[model.atlas][model.row];
    return Object.freeze({ id: model.id + ':' + paint.id, modelId: model.id, paintId: paint.id,
      model, paint, url: atlas.url, width: atlas.width, height: atlas.height,
      box: [crop.columns[column], crop.y, crop.columns[column + 1] - crop.columns[column], crop.height].join(' '),
      reference: !!car.name && normalized(car.name) !== normalized(model.name) });
  }
  function variants(modelId) {
    const model = modelFor(modelId);
    return model ? Object.freeze(paints.map(paint => variant({ name: model.name, modelId: model.id, paintId: paint.id }))) : Object.freeze([]);
  }
  function render(car = {}, decorative = false) {
    const spec = variant(car), key = category(car), name = car.name || spec.model.name;
    const label = name + ' · ' + spec.paint.name + (spec.reference ? ' · carroceria ilustrativa de referência' : '');
    return '<svg class="ae-sprite" data-sprite="' + key + '" data-model="' + spec.modelId + '" data-paint="' + spec.paintId + '" data-variant="' + spec.id + '" viewBox="' + spec.box + '" preserveAspectRatio="xMidYMid slice" ' +
      (decorative ? 'aria-hidden="true"' : 'role="img" aria-label="' + escape(label) + '"') +
      '><image href="' + spec.url + '" width="' + spec.width + '" height="' + spec.height + '"/></svg>';
  }
  window.AESprites = Object.freeze({ category, sprites, models, paints, atlases, modelFor, paintFor, variant, variants, render });
})();

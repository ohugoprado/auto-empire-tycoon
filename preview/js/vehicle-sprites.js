/* Model-specific artwork: thirty-two silhouettes, each with five painted images. */
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
    b: Object.freeze({ url: new URL('../assets/fleet-models-b.webp', base).href, width: 1536, height: 1024 }),
    c: Object.freeze({ url: new URL('../assets/fleet-models-c.webp', base).href, width: 1536, height: 1024 }),
    d: Object.freeze({ url: new URL('../assets/fleet-models-d.webp', base).href, width: 1536, height: 1024 }),
    e: Object.freeze({ url: new URL('../assets/fleet-models-e.webp', base).href, width: 1536, height: 1024 }),
    f: Object.freeze({ url: new URL('../assets/fleet-models-f.webp', base).href, width: 1536, height: 1024 }),
    g: Object.freeze({ url: new URL('../assets/fleet-models-g.webp', base).href, width: 1536, height: 1024 }),
    h: Object.freeze({ url: new URL('../assets/fleet-models-h.webp', base).href, width: 1536, height: 1024 })
  });
  const models = Object.freeze([
    { id: 'velox-city', name: 'Velox City', kind: 'Hatch', category: 'hatch', atlas: 'a', row: 0, defaultPaint: 'ocean', description: 'Hatch de cinco portas, linhas angulares e perfil urbano.' },
    { id: 'montara-cross', name: 'Montara Cross', kind: 'SUV', category: 'suv', atlas: 'a', row: 1, defaultPaint: 'polar', description: 'SUV de teto alto, frente robusta e espaço para a família.' },
    { id: 'aureon-sedan', name: 'Aureon Sedan', kind: 'Sedã', category: 'sedan', atlas: 'a', row: 2, defaultPaint: 'ruby', description: 'Sedã alongado, linhas elegantes e cabine confortável.' },
    { id: 'ravik-utility', name: 'Ravik Utility', kind: 'Picape', category: 'pickup', atlas: 'a', row: 3, defaultPaint: 'solar', description: 'Picape de cabine dupla, proporções fortes e vocação de trabalho.' },
    { id: 'nexo-compact', name: 'Nexo Compact', kind: 'Compacto', category: 'compact', atlas: 'b', row: 0, defaultPaint: 'polar', description: 'Compacto arredondado de três portas, leve e fácil de reconhecer.' },
    { id: 'altis-sport', name: 'Altis Sport', kind: 'Esportivo', category: 'sports', atlas: 'b', row: 1, defaultPaint: 'graphite', description: 'Cupê baixo e largo, com desenho esportivo e personalidade própria.' },
    { id: 'orion-p', name: 'Orion P', kind: 'Picape', category: 'pickup', atlas: 'b', row: 2, defaultPaint: 'polar', description: 'Picape de cabine simples e caçamba longa, distinta da Ravik.' },
    { id: 'lynx-z4', name: 'Lynx Z4', kind: 'Hatch', category: 'hatch', atlas: 'b', row: 3, defaultPaint: 'ocean', description: 'Hatch de duas portas com carroceria larga e atitude esportiva.' },
    {"id": "velox-city-s", "name": "Velox City S", "kind": "Hatch", "category": "hatch", "atlas": "c", "row": 0, "defaultPaint": "ruby", "description": "Uma versão urbana com frente e acabamento próprios da família Velox."},
    {"id": "velox-city-gt", "name": "Velox City GT", "kind": "Hatch", "category": "hatch", "atlas": "c", "row": 1, "defaultPaint": "solar", "description": "Carroceria esportiva e detalhes marcantes para a linha City."},
    {"id": "montara-trail", "name": "Montara Trail", "kind": "SUV", "category": "suv", "atlas": "c", "row": 2, "defaultPaint": "graphite", "description": "Um SUV de presença aventureira, com identidade própria na coleção."},
    {"id": "montara-grand", "name": "Montara Grand", "kind": "SUV", "category": "suv", "atlas": "c", "row": 3, "defaultPaint": "ocean", "description": "Proporções amplas e desenho imponente na família Montara."},
    {"id": "aureon-executive", "name": "Aureon Executive", "kind": "Sedã", "category": "sedan", "atlas": "d", "row": 0, "defaultPaint": "polar", "description": "Linhas elegantes e desenho exclusivo para a versão Executive."},
    {"id": "aureon-hybrid", "name": "Aureon Hybrid", "kind": "Sedã", "category": "sedan", "atlas": "d", "row": 1, "defaultPaint": "ocean", "description": "Uma interpretação moderna do sedã, com frente e detalhes próprios."},
    {"id": "ravik-work", "name": "Ravik Work", "kind": "Picape", "category": "pickup", "atlas": "d", "row": 2, "defaultPaint": "graphite", "description": "Picape de trabalho com carroceria e acabamento próprios."},
    {"id": "ravik-adventure", "name": "Ravik Adventure", "kind": "Picape", "category": "pickup", "atlas": "d", "row": 3, "defaultPaint": "solar", "description": "A versão aventureira da Ravik, com presença robusta."},
    {"id": "nexo-urban", "name": "Nexo Urban", "kind": "Compacto", "category": "compact", "atlas": "e", "row": 0, "defaultPaint": "ruby", "description": "Um compacto urbano com desenho exclusivo na família Nexo."},
    {"id": "nexo-e", "name": "Nexo E", "kind": "Compacto", "category": "compact", "atlas": "e", "row": 1, "defaultPaint": "polar", "description": "Formas compactas e frente própria para a versão E."},
    {"id": "altis-rs", "name": "Altis RS", "kind": "Esportivo", "category": "sports", "atlas": "e", "row": 2, "defaultPaint": "ruby", "description": "Silhueta esportiva e detalhes exclusivos da versão RS."},
    {"id": "altis-track", "name": "Altis Track", "kind": "Esportivo", "category": "sports", "atlas": "e", "row": 3, "defaultPaint": "solar", "description": "Uma interpretação de pista com carroceria marcante."},
    {"id": "orion-x", "name": "Orion X", "kind": "Picape", "category": "pickup", "atlas": "f", "row": 0, "defaultPaint": "graphite", "description": "A família Orion ganha outra presença e desenho de carroceria."},
    {"id": "orion-xl", "name": "Orion XL", "kind": "Picape", "category": "pickup", "atlas": "f", "row": 1, "defaultPaint": "solar", "description": "Proporções amplas e identidade própria entre as picapes."},
    {"id": "lynx-z4-turbo", "name": "Lynx Z4 Turbo", "kind": "Hatch", "category": "hatch", "atlas": "f", "row": 2, "defaultPaint": "ocean", "description": "Um hatch de atitude esportiva com acabamento da versão Turbo."},
    {"id": "lynx-touring", "name": "Lynx Touring", "kind": "Sedã", "category": "sedan", "atlas": "f", "row": 3, "defaultPaint": "polar", "description": "Perfil de sedã e desenho próprio para a linha Touring."},
    {"id": "solara-prime", "name": "Solara Prime", "kind": "Sedã", "category": "sedan", "atlas": "g", "row": 0, "defaultPaint": "ruby", "description": "Um sedã de linhas limpas e personalidade própria."},
    {"id": "solara-cross", "name": "Solara Cross", "kind": "SUV", "category": "suv", "atlas": "g", "row": 1, "defaultPaint": "ocean", "description": "Carroceria de SUV com identidade visual da família Solara."},
    {"id": "vexa-mini", "name": "Vexa Mini", "kind": "Compacto", "category": "compact", "atlas": "g", "row": 2, "defaultPaint": "polar", "description": "Dimensões compactas e formas fáceis de reconhecer."},
    {"id": "vexa-urban", "name": "Vexa Urban", "kind": "Hatch", "category": "hatch", "atlas": "g", "row": 3, "defaultPaint": "solar", "description": "Um hatch urbano com carroceria e detalhes exclusivos."},
    {"id": "atlas-family", "name": "Atlas Family", "kind": "SUV", "category": "suv", "atlas": "h", "row": 0, "defaultPaint": "ocean", "description": "Um SUV familiar com presença e desenho próprios."},
    {"id": "atlas-cargo", "name": "Atlas Cargo", "kind": "Picape", "category": "pickup", "atlas": "h", "row": 1, "defaultPaint": "polar", "description": "Uma picape de vocação prática e carroceria distinta."},
    {"id": "pulse-coupe", "name": "Pulse Coupe", "kind": "Esportivo", "category": "sports", "atlas": "h", "row": 2, "defaultPaint": "ruby", "description": "Perfil baixo, linhas de cupê e personalidade marcante."},
    {"id": "pulse-gt-r", "name": "Pulse GT-R", "kind": "Esportivo", "category": "sports", "atlas": "h", "row": 3, "defaultPaint": "graphite", "description": "Desenho esportivo exclusivo para a versão GT-R."}
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
    ].map(Object.freeze)),
    c: Object.freeze([
      { columns: [0, 325, 624, 924, 1227, 1536], y: 60, height: 190 },
      { columns: [0, 325, 624, 924, 1227, 1536], y: 290, height: 200 },
      { columns: [0, 325, 624, 924, 1227, 1536], y: 515, height: 215 },
      { columns: [0, 325, 624, 924, 1227, 1536], y: 765, height: 210 }
    ].map(Object.freeze)),
    d: Object.freeze([
      { columns: [0, 319, 623, 927, 1231, 1536], y: 61, height: 197 },
      { columns: [0, 315, 620, 924, 1228, 1536], y: 298, height: 202 },
      { columns: [0, 315, 619, 923, 1227, 1536], y: 531, height: 208 },
      { columns: [0, 316, 620, 925, 1230, 1536], y: 756, height: 231 }
    ].map(Object.freeze)),
    e: Object.freeze([
      { columns: [0, 311, 614, 924, 1230, 1536], y: 67, height: 214 },
      { columns: [0, 314, 619, 924, 1232, 1536], y: 311, height: 217 },
      { columns: [0, 312, 619, 923, 1231, 1536], y: 563, height: 197 },
      { columns: [0, 310, 612, 922, 1228, 1536], y: 784, height: 195 }
    ].map(Object.freeze)),
    f: Object.freeze([
      { columns: [0, 309, 617, 925, 1232, 1536], y: 60, height: 195 },
      { columns: [0, 309, 617, 925, 1232, 1536], y: 315, height: 195 },
      { columns: [0, 309, 617, 925, 1232, 1536], y: 545, height: 205 },
      { columns: [0, 309, 617, 925, 1232, 1536], y: 800, height: 185 }
    ].map(Object.freeze)),
    g: Object.freeze([
      { columns: [0, 316, 622, 927, 1232, 1536], y: 45, height: 214 },
      { columns: [0, 317, 623, 928, 1232, 1536], y: 280, height: 230 },
      { columns: [0, 321, 627, 931, 1235, 1536], y: 509, height: 242 },
      { columns: [0, 317, 623, 929, 1235, 1536], y: 745, height: 249 }
    ].map(Object.freeze)),
    h: Object.freeze([
      { columns: [0, 327, 628, 924, 1223, 1536], y: 63, height: 205 },
      { columns: [0, 333, 631, 933, 1231, 1536], y: 301, height: 215 },
      { columns: [0, 327, 624, 920, 1217, 1536], y: 557, height: 187 },
      { columns: [0, 317, 619, 918, 1215, 1536], y: 765, height: 205 }
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
    const compatible = model => !car.kind && !car.segment || model.category === category(car);
    return models.find(model => normalized(model.name) === normalized(car.name)) ||
      models.find(model => model.id === car.modelId && compatible(model)) ||
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
    const column = paints.indexOf(paint), crop = crops[model.atlas]?.[model.row];
    const box = crop ? [crop.columns[column], crop.y, crop.columns[column + 1] - crop.columns[column], crop.height].join(' ') : '0 0 300 200';
    return Object.freeze({ id: model.id + ':' + paint.id, modelId: model.id, paintId: paint.id,
      model, paint, url: atlas.url, width: atlas.width, height: atlas.height,
      box, artworkReady: !!crop,
      reference: !!car.name && normalized(car.name) !== normalized(model.name) });
  }
  function variants(modelId) {
    const model = modelFor(modelId);
    return model ? Object.freeze(paints.map(paint => variant({ name: model.name, modelId: model.id, paintId: paint.id }))) : Object.freeze([]);
  }
  function render(car = {}, decorative = false) {
    const spec = variant(car), key = category(car), name = car.name || spec.model.name;
    const label = name + ' · ' + spec.paint.name + (spec.reference ? ' · carroceria ilustrativa de referência' : '');
    if (!spec.artworkReady) return '<svg class="ae-sprite" data-sprite="' + key + '" data-model="' + spec.modelId + '" data-paint="' + spec.paintId + '" data-artwork-ready="false" viewBox="0 0 300 200" role="img" aria-label="Imagem de ' + escape(name) + ' em revisão"><text x="150" y="100" text-anchor="middle" fill="currentColor" font-size="15">Arte em revisão</text></svg>';
    const factoryLogo = car.manufactured ? window.AECompanyEmblem?.svg?.(window.AEGameBrandLogo?.() || null) : '';
    const [vx,vy,vw,vh] = spec.box.split(' ').map(Number);
    // SVG inset stays proportional to each atlas crop. It is a brand badge,
    // not a claim of pixel-perfect placement on the car's grille.
    const badge = factoryLogo && [vx,vy,vw,vh].every(Number.isFinite)
      ? '<svg x="'+(vx+vw*.76)+'" y="'+(vy+vh*.06)+'" width="'+(vw*.18)+'" height="'+(vh*.27)+'" viewBox="0 0 160 160" aria-hidden="true">'+factoryLogo.replace(/^<svg[^>]*>/,'').replace(/<\\/svg>$/,'')+'</svg>'
      : '';
    return '<svg class="ae-sprite" data-sprite="' + key + '" data-model="' + spec.modelId + '" data-paint="' + spec.paintId + '" data-variant="' + spec.id + '" viewBox="' + spec.box + '" preserveAspectRatio="xMidYMid meet" ' +
      (decorative ? 'aria-hidden="true"' : 'role="img" aria-label="' + escape(label) + '"') +
      '><image href="' + spec.url + '" width="' + spec.width + '" height="' + spec.height + '"/></svg>';
  }
  window.AEGameBrandLogo = () => window.s?.empire?.economy?.factory?.logo || (typeof s !== 'undefined' ? s?.empire?.economy?.factory?.logo : null);
  window.AESprites = Object.freeze({ category, sprites, models, paints, atlases, modelFor, paintFor, variant, variants, render });
})();

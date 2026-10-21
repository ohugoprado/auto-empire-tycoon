/* Shared vehicle artwork: a single atlas, six independent SVG crop viewports. */
(function () {
  'use strict';
  const atlas = new URL('../assets/fleet-atlas.webp', document.currentScript.src).href;
  const sprites = Object.freeze({
    hatch: Object.freeze({ box: '8 105 492 375', label: 'Hatch' }),
    suv: Object.freeze({ box: '510 95 503 385', label: 'SUV' }),
    sedan: Object.freeze({ box: '1024 115 512 370', label: 'Sedã' }),
    pickup: Object.freeze({ box: '0 535 540 400', label: 'Picape' }),
    compact: Object.freeze({ box: '543 560 468 380', label: 'Compacto' }),
    sports: Object.freeze({ box: '1022 590 514 350', label: 'Esportivo' })
  });
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function category(car) {
    const kind = String(car.kind || car.segment || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/suv|utilitario/.test(kind)) return 'suv';
    if (/seda/.test(kind)) return 'sedan';
    if (/picape|pickup/.test(kind)) return 'pickup';
    if (/esport|sport/.test(kind)) return 'sports';
    if (/compact/.test(kind)) return 'compact';
    return 'hatch';
  }
  function render(car, decorative = false) {
    const key = category(car), spec = sprites[key];
    return '<svg class="ae-sprite" data-sprite="' + key + '" viewBox="' + spec.box + '" preserveAspectRatio="xMidYMid slice" ' +
      (decorative ? 'aria-hidden="true"' : 'role="img" aria-label="' + escape(spec.label + ' · ' + (car.name || spec.label)) + '"') +
      '><image href="' + atlas + '" width="1536" height="1024"/></svg>';
  }
  window.AESprites = Object.freeze({ category, sprites, render });
})();

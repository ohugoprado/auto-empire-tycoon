/* Cosmetic identity stays with a vehicle when it moves between game screens. */
(function () {
  'use strict';
  const artwork = window.AESprites;
  if (!artwork) return;
  const generatedCars = new WeakSet();
  function assign(car, paintId, preserveColor = false) {
    if (!car || typeof car !== 'object') return false;
    const model = artwork.modelFor(car);
    const paint = artwork.paints.find(item => item.id === paintId) || artwork.paintFor(car);
    let changed = false;
    for (const [key, value] of [['modelId', model.id], ['paintId', paint.id]]) {
      if (car[key] !== value) { car[key] = value; changed = true; }
    }
    if (!preserveColor) {
      if (car.color !== paint.hex) { car.color = paint.hex; changed = true; }
      if (car.colorName !== paint.name) { car.colorName = paint.name; changed = true; }
    }
    return changed;
  }
  function ensure(state) {
    if (!state) return false;
    let changed = false;
    for (const list of [state.stock, state.market]) {
      for (const car of Array.isArray(list) ? list : []) {
        // Fleet rotation can rename/repaint an object after makeCar. Resolve its
        // current name again; normalize only cars generated in this session.
        const fresh = car && generatedCars.has(car);
        changed = assign(car, fresh ? car.paintId : undefined, !fresh) || changed;
      }
    }
    return changed;
  }
  function refresh() {
    const changed = ensure(s);
    if (changed) save();
    return changed;
  }
  const previousMakeCar = makeCar;
  makeCar = function () {
    const car = previousMakeCar.apply(this, arguments);
    const index = Math.abs(Math.floor(Number(car.id) || 1) - 1) % artwork.paints.length;
    generatedCars.add(car);
    assign(car, artwork.paints[index].id);
    return car;
  };
  const previousRender = render;
  render = function () {
    refresh();
    return previousRender.apply(this, arguments);
  };
  window.AEVehicleAppearance = Object.freeze({ assign, ensure, refresh });
  let freshCampaign = typeof campaignLoaded !== 'undefined' && !campaignLoaded;
  try {
    if (typeof oldKey !== 'undefined' && localStorage.getItem(oldKey) !== null) freshCampaign = false;
  } catch (_) { freshCampaign = false; }
  let changed = false;
  if (freshCampaign) {
    for (const car of s.market || []) {
      const index = Math.abs(Math.floor(Number(car.id) || 1) - 1) % artwork.paints.length;
      changed = assign(car, artwork.paints[index].id) || changed;
    }
  }
  if (ensure(s) || changed) save();
})();

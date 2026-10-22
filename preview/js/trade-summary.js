/* Vehicle investment and gross estimates share the game's accounting basis. */
(function () {
  'use strict';
  const math = window.AETradeMath;
  if (!math) return;
  function snapshot(car, price) {
    const valid = price !== '' && price !== null && price !== undefined && Number.isFinite(Number(price)) && Number(price) > 0;
    return Object.freeze({ purchase: math.amount(car?.bought), expenses: math.amount(car?.spent),
      invested: math.basis(car), price: valid ? Number(price) : null,
      gross: valid ? math.analyze(car, price).gross : null });
  }
  function create() {
    const block = document.createElement('section');
    block.className = 'ae-trade-summary';
    block.setAttribute('aria-label', 'Custos e resultado estimado');
    const list = document.createElement('dl');
    for (const [field, label] of [['purchase', 'Compra'], ['expenses', 'Despesas no veículo'], ['invested', 'Total investido'], ['price', 'Preço de anúncio'], ['gross', 'Lucro bruto estimado']]) {
      const row = document.createElement('div');
      row.dataset.tradeRow = field;
      const term = document.createElement('dt'); term.textContent = label;
      const value = document.createElement('dd'); value.dataset.tradeField = field;
      row.append(term, value); list.append(row);
    }
    const note = document.createElement('p'); note.className = 'ae-trade-summary-note';
    note.textContent = 'Antes de tributos e despesas da empresa. O preço anunciado não garante uma venda.';
    block.append(list, note);
    return block;
  }
  function update(block, car, price, mode) {
    const data = snapshot(car, price);
    const signature = JSON.stringify([car.id, data, mode]);
    if (block.dataset.signature === signature) return;
    block.dataset.signature = signature;
    block.dataset.carId = String(car.id);
    for (const [field, value] of Object.entries(data)) {
      const output = block.querySelector('[data-trade-field="' + field + '"]');
      if (output) output.textContent = value === null ? (field === 'price' ? 'Sem preço válido' : '—') : fmt(value);
    }
    const priceRow = block.querySelector('[data-trade-row="price"]');
    priceRow.querySelector('dt').textContent = mode === 'offers' ? 'Melhor proposta atual' : 'Preço de anúncio';
    const gross = block.querySelector('[data-trade-field="gross"]');
    gross.classList.toggle('ae-trade-loss', data.gross !== null && data.gross < 0);
    gross.classList.toggle('ae-trade-gain', data.gross !== null && data.gross >= 0);
    block.querySelector('.ae-trade-summary-note').textContent = mode === 'offers'
      ? 'Lucro bruto antes de tributos e despesas da empresa. Compare cada proposta antes de aceitar.'
      : 'Antes de tributos e despesas da empresa. O preço anunciado não garante uma venda.';
  }
  function refresh() {
    if (!s?.stock) return;
    const cars = new Map(s.stock.map(car => [String(car.id), car]));
    for (const card of document.querySelectorAll('#stock > .panel')) {
      const id = card.querySelector('.vehicle[data-car-id]')?.dataset.carId || card.dataset.aeCarId;
      const car = cars.get(String(id));
      if (!car) continue;
      let block = card.querySelector(':scope > .ae-trade-summary');
      if (!block) {
        block = create();
        const actions = card.querySelector(':scope > .actions');
        if (actions) actions.before(block); else card.append(block);
        card.classList.add('ae-has-trade-summary');
      }
      update(block, car, car.listed ? car.price : null, 'stock');
    }
  }
  function dialog(id, mode) {
    const car = s.stock.find(item => item.id === id), body = document.getElementById('modalbody');
    if (!car || !body || modalCar !== id) return;
    const block = create(); block.classList.add('ae-trade-dialog-summary');
    if (mode === 'list') {
      const field = body.querySelector('#asking');
      if (!field) return;
      const analysis = body.querySelector('#ae-neg-analysis');
      if (analysis) { analysis.classList.add('ae-summary-replaces-finance'); analysis.prepend(block); }
      else field.after(block);
      const apply = () => update(block, car, field.value, 'list');
      field.addEventListener('input', apply); apply();
    } else {
      const amounts = (car.offers || []).map(offer => Number(offer.amount)).filter(amount => Number.isFinite(amount) && amount > 0);
      update(block, car, amounts.length ? Math.max(...amounts) : null, 'offers');
      const divider = body.querySelector('.divider');
      if (divider) divider.after(block); else body.append(block);
    }
  }
  const previousList = listDialog;
  listDialog = function (id) { const result = previousList.apply(this, arguments); dialog(id, 'list'); return result; };
  const previousOffers = offersDialog;
  offersDialog = function (id) { const result = previousOffers.apply(this, arguments); dialog(id, 'offers'); return result; };
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  window.AETradeSummary = Object.freeze({ snapshot, refresh });
  refresh();
})();

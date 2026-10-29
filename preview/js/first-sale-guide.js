/* Optional sale guidance: campaign progress, never an automatic transaction. */
(function () {
  'use strict';
  const overview = document.getElementById('ae-workspace-overview');
  const events = document.getElementById('events');
  if (!overview || !events) return;
  const statuses = new Set(['enabled', 'dismissed', 'completed']);
  const money = value => Number.isFinite(Number(value)) ? fmt(Number(value)) : 'Indisponível';
  const count = value => Math.max(0, Math.floor(Number(value) || 0));
  const card = document.createElement('section');
  const eventCard = document.createElement('section');
  card.id = 'ae-first-sale-guide';
  eventCard.id = 'ae-first-sale-guide-events';
  for (const element of [card, eventCard]) element.className = 'ae-guide-card';
  overview.prepend(card);
  events.append(eventCard);

  function read() {
    if (typeof s === 'undefined' || !s || !Array.isArray(s.stock)) return { status: 'unavailable', stage: 'choose', car: null, meta: null };
    const candidate = s.firstSaleGuide;
    const meta = candidate && candidate.version === 1 && statuses.has(candidate.status) ? candidate : null;
    if (s.empire?.economy?.bankrupt) return { status: 'unavailable', stage: 'choose', car: null, meta };
    let status = meta?.status || (count(s.sales) === 0 ? 'invited' : 'unavailable');
    if (status === 'enabled' && count(s.sales) > count(meta.baselineSales)) status = 'completed';
    const car = s.stock.find(item => item.id === meta?.targetCarId) || s.stock[0] || null;
    const stage = status === 'completed' ? 'complete' : !car ? 'choose' : car.offers?.length ? 'offers' :
      car.listed ? 'wait' : meta?.preparedCarId === car.id ? 'list' : 'prepare';
    return { status, stage, car, meta };
  }
  function snapshot() {
    const view = read();
    return Object.freeze({ status: view.status, stage: view.stage, targetCarId: view.car?.id || null,
      day: typeof s === 'undefined' ? 0 : count(s?.day), paused: typeof paused !== 'undefined' && paused });
  }
  function store() { save(); }
  function goGarage() {
    show('garage');
    const button = document.querySelector('[data-workspace="overview"]');
    if (button?.getAttribute('aria-pressed') !== 'true') button?.click();
    card.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
  function start() {
    if (!s || !Array.isArray(s.stock) || s.empire?.economy?.bankrupt) return false;
    s.firstSaleGuide = { version: 1, status: 'enabled', baselineSales: count(s.sales),
      targetCarId: s.stock[0]?.id || null, preparedCarId: null, acknowledged: false };
    store(); render(); goGarage(); return true;
  }
  function dismiss() {
    const view = read();
    if (view.status === 'unavailable') return false;
    s.firstSaleGuide = { ...(view.meta || { version: 1, baselineSales: count(s.sales), targetCarId: null, preparedCarId: null }), status: 'dismissed' };
    store(); render();
    toast('Guia pausado. Você pode retomá-lo em Eventos.');
    return true;
  }
  function resume() {
    const view = read();
    if (!view.meta) return start();
    if (s.empire?.economy?.bankrupt) return false;
    view.meta.status = view.status === 'completed' ? 'completed' : 'enabled';
    view.meta.acknowledged = false;
    store(); render(); goGarage(); return true;
  }
  function button(action, label, secondary, disabled) {
    const node = document.createElement('button');
    node.type = 'button'; node.dataset.guideAction = action; node.textContent = label;
    if (secondary) node.className = 'ae-guide-secondary';
    node.disabled = Boolean(disabled);
    return node;
  }
  function write(root, title, text, actions, label, status) {
    const signature = JSON.stringify([title, text, actions, label, status]);
    if (root.dataset.guideSignature === signature) return;
    const focused = root.contains(document.activeElement) ? document.activeElement?.dataset.guideAction : null;
    root.dataset.guideSignature = signature;
    const eyebrow = document.createElement('div'); eyebrow.className = 'ae-guide-kicker'; eyebrow.textContent = label;
    const heading = document.createElement('h2'); heading.id = root.id + '-title'; heading.textContent = title; heading.tabIndex = -1;
    const copy = document.createElement('p'); copy.textContent = text;
    const controls = document.createElement('div'); controls.className = 'ae-guide-actions';
    for (const spec of actions) controls.append(button(...spec));
    root.replaceChildren(eyebrow, heading, copy, controls);
    root.setAttribute('aria-labelledby', heading.id);
    if (status) {
      const state = document.createElement('p'); state.className = 'ae-guide-status'; state.setAttribute('role', 'status'); state.textContent = status; root.append(state);
    }
    if (focused) (root.querySelector('[data-guide-action="' + focused + '"]') || heading).focus({ preventScroll: true });
  }
  const steps = {
    choose: ['Escolha seu primeiro negócio', 'Compare preço, conservação e reparos no mercado. Uma boa reserva de caixa ajuda a preparar o veículo depois da compra.', 'market', 'Comparar veículos', 1],
    prepare: ['Avalie a preparação', 'Reparar é uma escolha. Confira a conservação e o custo antes de gastar; você também pode anunciar sem reparar.', 'prepare', 'Revisar preparação', 2],
    list: ['Defina o preço de anúncio', 'Compare o custo investido com o preço desejado. O lucro bruto estimado ainda não desconta impostos e despesas da empresa.', 'list', 'Anunciar veículo', 3],
    wait: ['Dê tempo aos compradores', 'O anúncio está ativo. Cada avanço simula um dia normal: pode gerar propostas e também despesas. Nenhuma oferta é garantida.', 'advance', 'Avançar 1 dia', 4],
    offers: ['Compare a proposta antes de vender', 'Confira o preço oferecido e o custo investido. Você pode recusar ou negociar; a decisão de vender continua sendo sua.', 'offers', 'Analisar propostas', 5]
  };
  function refresh() {
    let view = read();
    let changed = false;
    if (view.meta?.status === 'enabled') {
      if (view.status === 'completed') { view.meta.status = 'completed'; changed = true; }
      else if (view.car && view.meta.targetCarId !== view.car.id) {
        view.meta.targetCarId = view.car.id; view.meta.preparedCarId = null; changed = true;
      }
    }
    if (changed) { store(); view = read(); }
    card.hidden = view.status === 'dismissed' || view.status === 'unavailable' || (view.status === 'completed' && view.meta?.acknowledged);
    if (view.status === 'invited') {
      write(card, 'Do primeiro carro à venda', 'Um guia opcional para comparar, comprar, preparar e vender. Pause quando quiser.',
        [['start', 'Começar guia'], ['dismiss', 'Agora não', true]], 'SUA PRIMEIRA VENDA');
    } else if (view.status === 'completed') {
      write(card, 'Venda concluída!', 'Seu progresso foi salvo. Confira a transação em Finanças: o lucro bruto da venda e as despesas da empresa são valores diferentes.',
        [['finish', 'Concluir guia']], 'PERCURSO CONCLUÍDO');
    } else if (view.status === 'enabled') {
      const [title, copy, action, actionLabel, step] = steps[view.stage];
      const carName = view.car ? view.car.name + ' · ' : '';
      write(card, title, carName + copy,
        [[action, actionLabel], ...(view.stage === 'prepare' ? [['prepared', 'Já avaliei, continuar', true]] : []), ['dismiss', 'Pausar guia', true]],
        'ETAPA ' + step + ' DE 5', 'Dia ' + count(s.day) + ' · Por turnos. O próximo dia só começa ao tocar em Avançar dia.');
    }

    const existingCampaign = view.status === 'unavailable' && !s?.empire?.economy?.bankrupt;
    if (view.status === 'enabled') write(eventCard, 'Seu guia está em andamento', 'Retome o próximo passo na garagem. Pausar o guia mantém as regras e a simulação da campanha.',
      [['resume', 'Retomar na garagem'], ['dismiss', 'Pausar guia', true]], 'GUIA DE VENDA');
    else if (view.status === 'dismissed') write(eventCard, 'Continue de onde parou', 'O guia é opcional. Ao retomar, a próxima etapa acompanha os veículos e as propostas da campanha atual.',
      [['resume', 'Retomar guia']], 'GUIA DE VENDA');
    else if (view.status === 'completed') write(eventCard, 'Percurso de venda concluído', 'Você pode rever a conclusão ou iniciar o percurso para outro veículo, sem alterar suas vendas anteriores.',
      [['resume', 'Ver conclusão'], ['start', 'Guiar outra venda', true]], 'GUIA DE VENDA');
    else if (view.status === 'invited' || existingCampaign) write(eventCard, existingCampaign ? 'Quer acompanhar sua próxima venda?' : 'Sua primeira venda, passo a passo',
      'Use o percurso quando quiser. Ele orienta as decisões, sem comprar, reparar ou vender por você.', [['start', 'Começar guia']], 'GUIA DE VENDA');
    else write(eventCard, 'Guia indisponível nesta campanha', 'Uma campanha encerrada não pode avançar pelo guia. Você pode iniciar uma nova campanha pelos controles de Eventos.', [], 'GUIA DE VENDA');
  }
  function preparation() {
    const view = read();
    if (view.status !== 'enabled' || !view.car) return;
    const car = view.car;
    goGarage();
    open('<div id="ae-first-sale-dialog"><h2>Preparação é uma escolha</h2><p data-guide-car></p><dl class="ae-guide-facts"></dl><p>Reparos são opcionais e aumentam o investimento. A referência mecânica pode variar com descontos e defeitos; confira o orçamento do botão Reparar no estoque antes de confirmar um gasto.</p><div class="ae-guide-actions"><button type="button" data-guide-action="prepared">Continuar para o anúncio</button><button type="button" class="ghost" onclick="closeModal()">Voltar ao estoque</button></div></div>');
    document.querySelector('#ae-first-sale-dialog [data-guide-car]').textContent = car.name;
    const facts = document.querySelector('#ae-first-sale-dialog .ae-guide-facts');
    const basis = window.AETradeMath?.basis(car) ?? (Number(car.bought) || 0) + (Number(car.spent) || 0);
    for (const [label, value] of [['Conservação', count(car.condition) + '%'], ['Custo já investido', money(basis)], ['Referência mecânica de reparos', money(car.repair)]]) {
      const term = document.createElement('dt'), description = document.createElement('dd'); term.textContent = label; description.textContent = value; facts.append(term, description);
    }
  }
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-guide-action]');
    if (!control || !control.closest('#ae-first-sale-guide,#ae-first-sale-guide-events,#ae-first-sale-dialog')) return;
    const action = control.dataset.guideAction;
    if (action === 'start') return start();
    if (action === 'dismiss') return dismiss();
    if (action === 'resume') return resume();
    const view = read();
    if (action === 'finish' && view.meta && view.status === 'completed') { view.meta.acknowledged = true; store(); render(); return; }
    if (view.status !== 'enabled') return;
    if (action === 'market') { show('market'); window.scrollTo({ top: 0, behavior: 'auto' }); }
    else if (action === 'prepare') preparation();
    else if (action === 'prepared' && view.car) {
      view.meta.preparedCarId = view.car.id;
      if (control.closest('#ae-first-sale-dialog')) closeModal();
      store(); render(); goGarage();
    } else if (action === 'list' && view.car) listDialog(view.car.id);
    else if (action === 'offers' && view.car) offersDialog(view.car.id);
    else if (action === 'advance' && view.stage === 'wait') {
      if(typeof advanceDay==='function')advanceDay();else toast('O controle de avanço diário está indisponível.');
    }
  });
  window.AEFirstSaleGuide = Object.freeze({ snapshot, start, dismiss, resume });
  const previousRender = render;
  render = function () { const result = previousRender.apply(this, arguments); refresh(); return result; };
  refresh();
})();

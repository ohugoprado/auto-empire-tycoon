/* Shared backup transactions for the active campaign, including pre-import recovery. */
(function () {
  'use strict';
  const PROFILE_KEY = 'autoempire_company_profile_v1';
  const LIMIT = 2 * 1024 * 1024;
  const CAMPAIGNS = new Set(['autoempire_v02', 'autoempire_preview_v06']);
  const message = text => typeof toast === 'function' && toast(text);
  const activeKey = () => {
    if (!CAMPAIGNS.has(KEY)) throw Error('Campanha desconhecida');
    return KEY;
  };
  const recoveryKey = () => activeKey() + ':before-import';
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const numeric = value => typeof value === 'number' && Number.isFinite(value);
  function requireValue(condition, reason) { if (!condition) throw Error(reason); }
  function text(value, maximum, label) {
    // The company form accepts literal comparisons, such as "A < B Motors".
    // Reject actual HTML tag/comment prefixes, including unfinished markup,
    // without treating every less-than/greater-than sign as executable markup.
    requireValue(typeof value === 'string' && value.length <= maximum && !/<(?:\/?[a-z]|[!?])|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(value), label + ' inválido');
  }
  function checkTree(value, depth, budget) {
    requireValue(depth <= 24 && ++budget.count <= 40000, 'Backup muito complexo');
    if (typeof value === 'number') requireValue(Number.isFinite(value), 'Valor numérico inválido');
    else if (typeof value === 'string') text(value, 16384, 'Texto');
    else if (value !== null && typeof value === 'object') {
      requireValue(!Array.isArray(value) || value.length <= 2000, 'Lista muito grande');
      for (const key of Object.keys(value)) {
        requireValue(!['__proto__', 'prototype', 'constructor'].includes(key), 'Campo inválido');
        checkTree(value[key], depth + 1, budget);
      }
    }
  }
  function validateGame(game) {
    requireValue(plain(game) && game.version === 2, 'Versão de campanha incompatível');
    checkTree(game, 0, { count: 0 });
    for (const key of ['cash', 'profit', 'rep', 'minute']) requireValue(numeric(game[key]), 'Campo ' + key + ' inválido');
    for (const key of ['day', 'slots', 'nextId']) requireValue(Number.isSafeInteger(game[key]) && game[key] >= 1, 'Campo ' + key + ' inválido');
    requireValue(game.slots <= 1000 && game.rep >= 0 && game.rep <= 100 && game.minute >= 0 && game.minute < 1440, 'Limites da campanha inválidos');
    requireValue(Number.isSafeInteger(game.sales) && game.sales >= 0, 'Vendas inválidas');
    for (const key of ['stock', 'market', 'ledger', 'logs']) requireValue(Array.isArray(game[key]), 'Lista ' + key + ' inválida');
    requireValue(game.stock.length <= 500 && game.market.length <= 500 && game.ledger.length <= 2000 && game.logs.length <= 2000, 'Backup excede os limites');
    const ids = new Set();
    for (const car of [...game.stock, ...game.market]) {
      requireValue(plain(car) && Number.isSafeInteger(car.id) && car.id >= 1 && !ids.has(car.id), 'Identidade do veículo inválida');
      ids.add(car.id);
      for (const key of ['name', 'kind']) { text(car[key], 120, 'Veículo'); requireValue(car[key].trim().length > 0, 'Veículo sem nome ou categoria'); }
      requireValue(Number.isInteger(car.year) && car.year >= 1900 && car.year <= 3000, 'Ano do veículo inválido');
      for (const key of ['km', 'condition', 'value', 'repair', 'ask']) requireValue(numeric(car[key]) && car[key] >= 0, 'Valor do veículo inválido');
      requireValue(car.condition <= 100 && Array.isArray(car.offers), 'Condição ou propostas inválidas');
      for (const key of ['bought', 'spent', 'price', 'days']) if (car[key] !== undefined) requireValue(numeric(car[key]) && car[key] >= 0, 'Custo do veículo inválido');
      if (car.color !== undefined) requireValue(typeof car.color === 'string' && /^(?:#[\da-f]{3,8}|[a-z]{1,24}|(?:rgb|hsl)a?\([\d\s.,%+\-]+\))$/i.test(car.color), 'Cor do veículo inválida');
      for (const offer of car.offers) {
        requireValue(plain(offer) && numeric(offer.amount) && offer.amount > 0, 'Proposta inválida');
        text(offer.name, 120, 'Comprador');
      }
    }
    for (const car of game.stock) {
      for (const key of ['bought', 'spent', 'price', 'days']) requireValue(numeric(car[key]) && car[key] >= 0, 'Dados do estoque incompletos');
      requireValue(typeof car.listed === 'boolean', 'Anúncio do veículo inválido');
    }
    requireValue([...ids].every(id => id < game.nextId), 'Próximo identificador inválido');
    for (const record of game.ledger) {
      requireValue(plain(record) && Number.isInteger(record.day) && record.day >= 1 && numeric(record.amount), 'Transação inválida');
      text(record.name, 512, 'Transação');
    }
    for (const record of game.logs) text(record, 4096, 'Evento');
    return game;
  }
  function validateProfile(profile) {
    if (profile === null || profile === undefined) return null;
    requireValue(plain(profile), 'Perfil inválido');
    checkTree(profile, 0, { count: 0 });
    for (const key of ['company', 'owner']) {
      text(profile[key], 42, 'Perfil');
      requireValue(profile[key].trim().length >= 2 && /[\p{L}\p{N}]/u.test(profile[key]), 'Perfil incompleto');
    }
    return profile;
  }
  function decode(payload) {
    requireValue(plain(payload), 'Backup incompatível');
    let game;
    if (payload.format === 'autoempire-backup' && payload.version === 1) game = payload.save;
    else if (payload.app === 'Auto Empire Tycoon' && payload.schema === 1) game = payload.game;
    else throw Error('Formato de backup incompatível');
    return { game: validateGame(game), profile: validateProfile(payload.profile) };
  }
  function makePayload(game, profile) {
    const payload = JSON.parse(JSON.stringify({ format: 'autoempire-backup', version: 1, campaign: activeKey(), created: new Date().toISOString(), save: game, profile }));
    decode(payload);
    return payload;
  }
  function currentProfile() {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw === null ? null : JSON.parse(raw);
  }
  function download(payload, previous) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    requireValue(blob.size <= LIMIT, 'Backup excede 2 MB');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'auto-empire-' + (activeKey() === 'autoempire_v02' ? 'principal' : 'previa') + (previous ? '-recuperacao' : '') + '-dia-' + payload.save.day + '.json';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function exportCurrent() {
    try { download(makePayload(s, currentProfile()), false); message('Backup exportado'); return true; }
    catch (error) { message('Não foi possível exportar: ' + error.message); return false; }
  }
  function restoreItem(key, raw) {
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  }
  function updateRecoveryControls() {
    let available = false;
    try { const raw = localStorage.getItem(recoveryKey()); if (raw) { decode(JSON.parse(raw)); available = true; } } catch (_) {}
    document.querySelectorAll('[data-backup-recovery]').forEach(button => { button.disabled = !available; });
  }
  function commit(payload, recovering) {
    let incoming;
    try { incoming = decode(payload); }
    catch (error) { message('Backup inválido: ' + error.message); return false; }
    const destination = activeKey() === 'autoempire_v02' ? 'principal' : 'da prévia';
    if (!confirm((recovering ? 'Recuperar a versão anterior' : 'Importar este backup') + ' e substituir a campanha ' + destination + '? Uma cópia recuperável da campanha atual será guardada antes da troca.')) return false;
    let oldProfile, oldRecovery, wroteRecovery = false, wroteProfile = false;
    try {
      // Write the safety copy first and the active campaign last. A failed setItem
      // is atomic; neither quota failure nor a refused profile write replaces it.
      oldProfile = localStorage.getItem(PROFILE_KEY);
      oldRecovery = localStorage.getItem(recoveryKey());
      const previous = makePayload(s, oldProfile === null ? null : JSON.parse(oldProfile));
      localStorage.setItem(recoveryKey(), JSON.stringify(previous)); wroteRecovery = true;
      if (incoming.profile !== null) { localStorage.setItem(PROFILE_KEY, JSON.stringify(incoming.profile)); wroteProfile = true; }
      else if (recovering) { localStorage.removeItem(PROFILE_KEY); wroteProfile = true; }
      localStorage.setItem(activeKey(), JSON.stringify(incoming.game));
    } catch (error) {
      // The active write is last: it has not changed when this block is reached.
      // Restore ancillary values too, so failed imports are not partial imports.
      try { if (wroteProfile) restoreItem(PROFILE_KEY, oldProfile); } catch (_) {}
      try { if (wroteRecovery) restoreItem(recoveryKey(), oldRecovery); } catch (_) {}
      updateRecoveryControls();
      message('Não foi possível restaurar. A campanha atual foi mantida; verifique o espaço disponível.');
      return false;
    }
    // pagehide/visibilitychange autosave reads this same state during reload.
    // Leaving the previous state here would overwrite a successfully imported save.
    paused = true;
    s = incoming.game;
    updateRecoveryControls();
    location.reload();
    return true;
  }
  async function importFile(file) {
    try {
      requireValue(file && file.size > 0 && file.size <= LIMIT, 'Arquivo vazio ou maior que 2 MB');
      return commit(JSON.parse(await file.text()), false);
    } catch (error) { message('Backup inválido: ' + error.message); return false; }
  }
  function restorePrevious() {
    try {
      const raw = localStorage.getItem(recoveryKey());
      requireValue(raw !== null, 'Não há cópia anterior nesta campanha');
      return commit(JSON.parse(raw), true);
    } catch (error) { message('Não foi possível recuperar: ' + error.message); return false; }
  }
  function exportPrevious() {
    try {
      const raw = localStorage.getItem(recoveryKey()); requireValue(raw !== null, 'Não há cópia anterior');
      const previous = JSON.parse(raw); decode(previous); download(previous, true); return true;
    } catch (error) { message('Não foi possível exportar a recuperação: ' + error.message); return false; }
  }
  function attachRecoveryControls(container) {
    if (!container || container.querySelector('[data-backup-recovery]')) return;
    const panel = document.createElement('section'); panel.id = container.id === 'events' ? 'ae-backup-recovery' : 'ae-tools-backup-recovery'; panel.className = 'panel';
    const title = document.createElement('h3'); title.textContent = 'Recuperação da campanha';
    const note = document.createElement('p'); note.className = 'tiny'; note.textContent = 'Antes de uma importação, a campanha atual fica guardada neste navegador. Você pode restaurar ou exportar essa cópia.';
    const actions = document.createElement('div'); actions.className = 'actions';
    for (const [label, action] of [['Restaurar versão anterior', restorePrevious], ['Exportar versão anterior', exportPrevious]]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.dataset.backupRecovery = 'true'; button.textContent = label; button.addEventListener('click', action); actions.append(button);
    }
    panel.append(title, note, actions); container.append(panel);
    updateRecoveryControls();
  }
  window.AEBackups = Object.freeze({ exportCurrent, importFile, restorePrevious, exportPrevious, recoveryKey, attachRecoveryControls, validate: decode });
  attachRecoveryControls(document.getElementById('events'));
  updateRecoveryControls();
})();

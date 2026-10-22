/* One staff roster, one monthly payroll and idempotent legacy migration. */
(function () {
  'use strict';
  const SCHEMA = 1;
  const limit = 5;
  const catalog = Object.freeze({
    seller: Object.freeze({ label: 'Vendedor', cost: 850, hireFee: 2200, benefit: 'Aumenta o valor das propostas' }),
    mechanic: Object.freeze({ label: 'Mecânico', cost: 700, hireFee: 1800, benefit: 'Reduz custos de reparo' }),
    analyst: Object.freeze({ label: 'Avaliador', cost: 550, hireFee: 1500, benefit: 'Desconta custos de pesquisa' })
  });
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const count = value => value === true ? 1 : Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  function ensure(state) {
    if (!object(state.empire)) state.empire = {};
    const empire = state.empire;
    if (!object(empire.staff)) empire.staff = {};
    const staff = empire.staff;
    for (const role of Object.keys(catalog)) staff[role] = count(staff[role]);
    if (empire.staffSchema !== SCHEMA) {
      const legacy = object(state.staff) ? state.staff : {};
      const migrated = { mechanic: count(legacy.mechanic), seller: Math.max(count(legacy.sales), count(legacy.seller)), analyst: count(legacy.marketing) };
      const previousSellers = staff.seller;
      for (const role of Object.keys(catalog)) staff[role] += migrated[role];
      const benefits = { repairFloor: migrated.mechanic ? .2 : 0, sellerFloor: migrated.seller ? .08 : 0, saleReputation: migrated.analyst ? 2 : 0 };
      empire.staffMigration = { version: SCHEMA, day: state.day, legacy: clone(legacy), converted: migrated, benefits };
      empire.staffSchema = SCHEMA;
      // Existing quotes have no reliable base-price history. Preserve their
      // amount; legacy sellers may still receive their one old acceptance
      // bonus. Modern-only quotes must never be retroactively boosted twice.
      for (const car of Array.isArray(state.stock) ? state.stock : []) {
        for (const offer of Array.isArray(car.offers) ? car.offers : []) {
          if (offer && offer.staffSellerRate == null) {
            offer.staffSellerRate = migrated.seller ? 0 : Math.min(.09, previousSellers * .018);
            if (migrated.seller) offer.staffSellerLegacy = true;
          }
        }
      }
      // An old hire must not mint a new achievement reward during migration.
      if (Object.values(migrated).some(Boolean)) {
        if (!object(empire.achievements)) empire.achievements = {};
        if (!empire.achievements.team) empire.achievements.team = Math.max(1, count(state.day));
      }
    }
    // Retain the paid roster as a migration record, never a second active team.
    delete state.staff;
    return staff;
  }
  function benefits(state) {
    const staff = ensure(state), legacy = state.empire.staffMigration?.benefits || {};
    return {
      repairDiscount: Math.max(Math.max(0, Math.min(.2, Number(legacy.repairFloor) || 0)), Math.min(.3, staff.mechanic * .06)),
      sellerRate: Math.max(Math.max(0, Math.min(.08, Number(legacy.sellerFloor) || 0)), Math.min(.09, staff.seller * .018)),
      researchDiscount: Math.min(60, staff.analyst * 12),
      saleReputation: Math.max(0, Math.min(2, Number(legacy.saleReputation) || 0))
    };
  }
  function monthlyPayroll(state) {
    const staff = ensure(state);
    return Object.entries(catalog).reduce((sum, [role, spec]) => sum + staff[role] * spec.cost, 0);
  }
  function chargePayroll(state) {
    ensure(state);
    const day = count(state.day), empire = state.empire;
    if (!day || day % 30 !== 0 || empire.staffPayrollDay === day) return 0;
    const amount = monthlyPayroll(state);
    empire.staffPayrollDay = day;
    state.cash -= amount;
    empire.totalWages = (Number(empire.totalWages) || 0) + amount;
    return amount;
  }
  function prepareOffer(state, offer) {
    if (!offer || !Number.isFinite(Number(offer.amount)) || Number(offer.amount) <= 0) return false;
    const allBenefits = benefits(state);
    const rate = offer.staffSellerLegacy ? Math.min(.08, allBenefits.sellerRate) : allBenefits.sellerRate;
    const previous = Math.max(0, Number(offer.staffSellerRate) || 0);
    if (rate <= previous) return false;
    const base = Number(offer.amount) / (1 + previous);
    offer.amount = Math.max(100, Math.round(base * (1 + rate) / 100) * 100);
    offer.staffSellerRate = rate;
    return true;
  }
  window.AEStaff = Object.freeze({ schema: SCHEMA, limit, catalog, ensure, benefits, monthlyPayroll, chargePayroll, prepareOffer });
})();

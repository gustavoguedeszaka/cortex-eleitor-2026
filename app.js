/**
 * ════════════════════════════════════════════════════════════════
 * CORTEX 2026 — SIMULADOR FINANCEIRO UNIFICADO
 * app.js — UI controller, state management, rendering
 *
 * RULE: engine.js is NEVER touched. All calculation logic lives there.
 * This file handles ONLY DOM manipulation, events, and rendering.
 * ════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  const E = CortexEngine;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const fmt = E.fmt;
  const fmtPct = E.fmtPct;

  // ═══════════════════════════════════════════════════════════
  //  STATE (identical to previous — zero changes)
  // ═══════════════════════════════════════════════════════════
  let state = buildDefaultState();

  function buildDefaultState() {
    return {
      selectedState: 'SP',
      selectedCargo: 'Presidente',
      premiumRobustMode: true,
      costs: E.getDefaultCostInputs(),
      setupTeam: E.getDefaultSetupTeam(),
      operationTeam: E.getDefaultOperationTeam(),
      taxes: E.getDefaultTaxInputs(),
      commissions: E.getDefaultCommissionInputs(),
      margins: E.getDefaultMarginInputs(),
      shares: E.getDefaultShares(),
      reserves: E.getDefaultReserves(),
      floorPcts: E.getDefaultFloorPcts(),
      presidentFloor: E.DEFAULT_PRESIDENT_FLOOR,
      baselinePrices: E.getBaselinePrices(),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  DOM REFS
  // ═══════════════════════════════════════════════════════════
  const el = {
    hEstado: $('#h-estado'), hCargo: $('#h-cargo'),
    robustBadge: $('#robust-badge'),
    alertsBar: $('#alerts-bar'),
    tableStateLabel: $('#table-state-label'), mainTbody: $('#main-tbody'),
    chartLabel: $('#chart-label'), chartCenter: $('#chart-center'),
    chartLegend: $('#chart-legend'), donut: $('#donut'), costSummary: $('#cost-summary'),
    // DRE
    dreLines: $('#dre-lines'), dreLucroBlock: $('#dre-lucro-block'),
    dreStatusBox: $('#dre-status-box'), dreRadar: $('#dre-radar'),
    dreMonths: $('#dre-months'),
    // Controls
    cEstado: $('#c-estado'), cCargo: $('#c-cargo'), cMonths: $('#c-months'), cRobust: $('#c-robust'),
    cCapex: $('#c-capex'), cOpex: $('#c-opex'), cInfra: $('#c-infra'), cIa: $('#c-ia'),
    cApps: $('#c-apps'), cAdmin: $('#c-admin'), cContingency: $('#c-contingency'),
    cProlaboreOn: $('#c-prolabore-on'), cProlabore: $('#c-prolabore'),
    prolaboreHint: $('#prolabore-hint'),
    cCltBurden: $('#c-clt-burden'), cPjBurden: $('#c-pj-burden'),
    c247: $('#c-247'), c247People: $('#c-247-people'), coverageBox: $('#coverage-box'),
    setupBody: $('#team-setup-body'), opBody: $('#team-op-body'),
    cPis: $('#c-pis'), cCofins: $('#c-cofins'), cIss: $('#c-iss'),
    cIrpjPresumed: $('#c-irpj-presumed'), cIrpjRate: $('#c-irpj-rate'),
    cCsllPresumed: $('#c-csll-presumed'), cCsllRate: $('#c-csll-rate'),
    cIrpjAddRate: $('#c-irpj-add-rate'), cIrpjAddThreshold: $('#c-irpj-add-threshold'),
    cOtherWith: $('#c-other-with'), taxBreakdown: $('#tax-breakdown-display'),
    cCommSales: $('#c-comm-sales'), cCommBiz: $('#c-comm-biz'), cCommOther: $('#c-comm-other'),
    commSummary: $('#comm-summary'),
    cMOp: $('#c-m-op'), cMRnd: $('#c-m-rnd'), cMRisk: $('#c-m-risk'), cMPremium: $('#c-m-premium'),
    cMAdditive: $('#c-m-additive'), marginModeHint: $('#margin-mode-hint'), marginSummary: $('#margin-summary'),
    cFloorPres: $('#c-floor-pres'), cFloorGov: $('#c-floor-gov'), cFloorSen: $('#c-floor-sen'),
    cFloorDepf: $('#c-floor-depf'), cFloorDepe: $('#c-floor-depe'),
    cShSetup: $('#c-sh-setup'), cShOp: $('#c-sh-op'), cShOpex: $('#c-sh-opex'),
    cShInfra: $('#c-sh-infra'), cShToken: $('#c-sh-token'), cShApps: $('#c-sh-apps'), cShAdmin: $('#c-sh-admin'),
    cRToken: $('#c-r-token'), cRInfra: $('#c-r-infra'), cRSupport: $('#c-r-support'),
    cRLegSupport: $('#c-r-leg-support'), cRLegInfra: $('#c-r-leg-infra'), cRLegToken: $('#c-r-leg-token'),
    matrixThead: $('#matrix-thead'), matrixTbody: $('#matrix-tbody'),
    auditGrid: $('#audit-grid'), sanityGrid: $('#sanity-grid'),
    robustHint: $('#robust-hint'),
  };

  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    populateSelects();
    renderTeamTable('setup');
    renderTeamTable('operation');
    bindEvents();
    recalc();
  }

  function populateSelects() {
    const estHtml = E.STATES_DATA.map(s => `<option value="${s.uf}">${s.uf} — ${s.state}</option>`).join('');
    [el.hEstado, el.cEstado].forEach(s => { s.innerHTML = estHtml; });
    const cargoHtml = E.CARGOS.map(c => `<option value="${c}">${c}</option>`).join('');
    [el.hCargo, el.cCargo].forEach(s => { s.innerHTML = cargoHtml; });
  }

  // ═══════════════════════════════════════════════════════════
  //  EVENTS (identical logic — just updated selectors)
  // ═══════════════════════════════════════════════════════════
  function bindEvents() {
    // Sync header ↔ control selects
    el.hEstado.addEventListener('change', () => { el.cEstado.value = el.hEstado.value; readInputs(); recalc(); });
    el.hCargo.addEventListener('change',  () => { el.cCargo.value = el.hCargo.value;   readInputs(); recalc(); });
    el.cEstado.addEventListener('change', () => { el.hEstado.value = el.cEstado.value; readInputs(); recalc(); });
    el.cCargo.addEventListener('change',  () => { el.hCargo.value = el.cCargo.value;   readInputs(); recalc(); });

    // All scalar inputs
    const inputs = [
      el.cMonths, el.cRobust,
      el.cCapex, el.cOpex, el.cInfra, el.cIa, el.cApps, el.cAdmin, el.cContingency,
      el.cProlaboreOn, el.cProlabore,
      el.cCltBurden, el.cPjBurden, el.c247, el.c247People,
      el.cPis, el.cCofins, el.cIss, el.cIrpjPresumed, el.cIrpjRate,
      el.cCsllPresumed, el.cCsllRate, el.cIrpjAddRate, el.cIrpjAddThreshold, el.cOtherWith,
      el.cCommSales, el.cCommBiz, el.cCommOther,
      el.cMOp, el.cMRnd, el.cMRisk, el.cMPremium, el.cMAdditive,
      el.cFloorPres, el.cFloorGov, el.cFloorSen, el.cFloorDepf, el.cFloorDepe,
      el.cShSetup, el.cShOp, el.cShOpex, el.cShInfra, el.cShToken, el.cShApps, el.cShAdmin,
      el.cRToken, el.cRInfra, el.cRSupport, el.cRLegSupport, el.cRLegInfra, el.cRLegToken,
    ];
    inputs.forEach(inp => {
      if (!inp) return;
      inp.addEventListener('input', () => { readInputs(); recalc(); });
      inp.addEventListener('change', () => { readInputs(); recalc(); });
    });

    // Team tables — delegated
    el.setupBody.addEventListener('input', () => { readTeamFromDOM('setup'); recalc(); });
    el.setupBody.addEventListener('change', () => { readTeamFromDOM('setup'); recalc(); });
    el.opBody.addEventListener('input', () => { readTeamFromDOM('operation'); recalc(); });
    el.opBody.addEventListener('change', () => { readTeamFromDOM('operation'); recalc(); });

    // Team add buttons
    $('#btn-add-setup').addEventListener('click', () => {
      state.setupTeam.push({ role:'Nova função', qty:1, monthlyCost:10000, months:1, hiringModel:'PJ', enabled:true });
      renderTeamTable('setup'); recalc();
    });
    $('#btn-add-op').addEventListener('click', () => {
      state.operationTeam.push({ role:'Nova função', qty:1, monthlyCost:10000, months:6, hiringModel:'PJ', enabled:true });
      renderTeamTable('operation'); recalc();
    });

    // Team delete — delegated
    el.setupBody.addEventListener('click', e => {
      if (e.target.closest('.btn-del')) {
        const idx = parseInt(e.target.closest('.btn-del').dataset.idx);
        state.setupTeam.splice(idx, 1);
        renderTeamTable('setup'); recalc();
      }
    });
    el.opBody.addEventListener('click', e => {
      if (e.target.closest('.btn-del')) {
        const idx = parseInt(e.target.closest('.btn-del').dataset.idx);
        state.operationTeam.splice(idx, 1);
        renderTeamTable('operation'); recalc();
      }
    });

    // Table row click
    el.mainTbody.addEventListener('click', e => {
      const row = e.target.closest('tr');
      if (row?.dataset.cargo) {
        state.selectedCargo = row.dataset.cargo;
        el.hCargo.value = state.selectedCargo;
        el.cCargo.value = state.selectedCargo;
        recalc();
      }
    });

    // Collapsibles
    const toggleCollapsible = (btnId, bodyId) => {
      $(btnId).addEventListener('click', () => {
        $(bodyId).classList.toggle('collapsed');
        $(`${btnId} .chevron`).classList.toggle('open');
      });
    };
    toggleCollapsible('#btn-toggle-matrix', '#matrix-body');
    toggleCollapsible('#btn-toggle-audit', '#audit-body');
    toggleCollapsible('#btn-toggle-adv', '#adv-body');

    // Footer buttons
    $('#btn-reset').addEventListener('click', () => {
      if (confirm('Resetar todos os parâmetros para baseline aprovado?')) {
        state = buildDefaultState();
        syncUIFromState();
        renderTeamTable('setup');
        renderTeamTable('operation');
        recalc();
      }
    });
    $('#btn-export').addEventListener('click', exportJSON);
    $('#btn-import').addEventListener('change', importJSON);
  }

  // ═══════════════════════════════════════════════════════════
  //  READ INPUTS → STATE (identical — zero changes)
  // ═══════════════════════════════════════════════════════════
  function readInputs() {
    state.selectedState = el.cEstado.value;
    state.selectedCargo = el.cCargo.value;
    state.premiumRobustMode = el.cRobust.checked;
    state.costs.contractMonths = int(el.cMonths.value, 6);
    state.costs.capexSetup = num(el.cCapex.value);
    state.costs.opexMonthly = num(el.cOpex.value);
    state.costs.infraMonthly = num(el.cInfra.value);
    state.costs.iaTokensMonthly = num(el.cIa.value);
    state.costs.appsMonthly = num(el.cApps.value);
    state.costs.adminMonthly = num(el.cAdmin.value);
    state.costs.contingencyRate = num(el.cContingency.value) / 100;
    state.costs.includeProLabore = el.cProlaboreOn.checked;
    state.costs.proLaboreMonthly = num(el.cProlabore.value);
    state.costs.cltBurdenRate = num(el.cCltBurden.value) / 100;
    state.costs.pjBurdenRate = num(el.cPjBurden.value) / 100;
    state.costs.real247 = el.c247.checked;
    state.costs.real247People = int(el.c247People.value, 5);
    state.taxes.pis = num(el.cPis.value) / 100;
    state.taxes.cofins = num(el.cCofins.value) / 100;
    state.taxes.iss = num(el.cIss.value) / 100;
    state.taxes.presumedProfitRateIRPJ = num(el.cIrpjPresumed.value) / 100;
    state.taxes.irpjRate = num(el.cIrpjRate.value) / 100;
    state.taxes.presumedProfitRateCSLL = num(el.cCsllPresumed.value) / 100;
    state.taxes.csllRate = num(el.cCsllRate.value) / 100;
    state.taxes.irpjAdditionalRate = num(el.cIrpjAddRate.value) / 100;
    state.taxes.irpjAdditionalMonthlyThreshold = num(el.cIrpjAddThreshold.value);
    state.taxes.otherWithholdings = num(el.cOtherWith.value) / 100;
    state.commissions.salesDirector = num(el.cCommSales.value) / 100;
    state.commissions.businessIntroducer = num(el.cCommBiz.value) / 100;
    state.commissions.otherCommissions = num(el.cCommOther.value) / 100;
    state.margins.operatingProfitRate = num(el.cMOp.value) / 100;
    state.margins.rndRate = num(el.cMRnd.value) / 100;
    state.margins.riskReserveRate = num(el.cMRisk.value) / 100;
    state.margins.premiumRate = num(el.cMPremium.value) / 100;
    state.margins.useAdditiveMargin = el.cMAdditive.checked;
    state.presidentFloor = num(el.cFloorPres.value);
    state.floorPcts.Governador = num(el.cFloorGov.value) / 100;
    state.floorPcts.Senador = num(el.cFloorSen.value) / 100;
    state.floorPcts['Dep. Federal'] = num(el.cFloorDepf.value) / 100;
    state.floorPcts['Dep. Estadual'] = num(el.cFloorDepe.value) / 100;
    state.shares.setupShare = num(el.cShSetup.value) / 100;
    state.shares.operationShare = num(el.cShOp.value) / 100;
    state.shares.opexShare = num(el.cShOpex.value) / 100;
    state.shares.infraShare = num(el.cShInfra.value) / 100;
    state.shares.tokenShare = num(el.cShToken.value) / 100;
    state.shares.appShare = num(el.cShApps.value) / 100;
    state.shares.adminShare = num(el.cShAdmin.value) / 100;
    state.reserves.tokenSafetyRate = num(el.cRToken.value) / 100;
    state.reserves.infraRedundancyRate = num(el.cRInfra.value) / 100;
    state.reserves.supportReserveRate = num(el.cRSupport.value) / 100;
    state.reserves.legSupportReserve = num(el.cRLegSupport.value) / 100;
    state.reserves.legInfraReserve = num(el.cRLegInfra.value) / 100;
    state.reserves.legTokenReserve = num(el.cRLegToken.value) / 100;
  }

  function readTeamFromDOM(type) {
    const body = type === 'setup' ? el.setupBody : el.opBody;
    const arr = [];
    body.querySelectorAll('tr').forEach(row => {
      arr.push({
        enabled: row.querySelector('.t-enabled')?.checked ?? true,
        role: row.querySelector('.t-role')?.value || '',
        qty: int(row.querySelector('.t-qty')?.value, 1),
        monthlyCost: num(row.querySelector('.t-cost')?.value),
        months: int(row.querySelector('.t-months')?.value, 1),
        hiringModel: row.querySelector('.t-model')?.value || 'PJ',
      });
    });
    if (type === 'setup') state.setupTeam = arr;
    else state.operationTeam = arr;
  }

  function syncUIFromState() {
    el.cEstado.value = state.selectedState;
    el.hEstado.value = state.selectedState;
    el.cCargo.value = state.selectedCargo;
    el.hCargo.value = state.selectedCargo;
    el.cRobust.checked = state.premiumRobustMode;
    el.cMonths.value = state.costs.contractMonths;
    el.cCapex.value = state.costs.capexSetup;
    el.cOpex.value = state.costs.opexMonthly;
    el.cInfra.value = state.costs.infraMonthly;
    el.cIa.value = state.costs.iaTokensMonthly;
    el.cApps.value = state.costs.appsMonthly;
    el.cAdmin.value = state.costs.adminMonthly;
    el.cContingency.value = Math.round(state.costs.contingencyRate * 100);
    el.cProlaboreOn.checked = state.costs.includeProLabore;
    el.cProlabore.value = state.costs.proLaboreMonthly;
    el.cCltBurden.value = Math.round(state.costs.cltBurdenRate * 100);
    el.cPjBurden.value = Math.round(state.costs.pjBurdenRate * 100);
    el.c247.checked = state.costs.real247;
    el.c247People.value = state.costs.real247People;
    el.cPis.value = (state.taxes.pis * 100).toFixed(2);
    el.cCofins.value = (state.taxes.cofins * 100).toFixed(2);
    el.cIss.value = (state.taxes.iss * 100).toFixed(2);
    el.cIrpjPresumed.value = Math.round(state.taxes.presumedProfitRateIRPJ * 100);
    el.cIrpjRate.value = Math.round(state.taxes.irpjRate * 100);
    el.cCsllPresumed.value = Math.round(state.taxes.presumedProfitRateCSLL * 100);
    el.cCsllRate.value = Math.round(state.taxes.csllRate * 100);
    el.cIrpjAddRate.value = Math.round(state.taxes.irpjAdditionalRate * 100);
    el.cIrpjAddThreshold.value = state.taxes.irpjAdditionalMonthlyThreshold;
    el.cOtherWith.value = (state.taxes.otherWithholdings * 100).toFixed(1);
    el.cCommSales.value = Math.round(state.commissions.salesDirector * 100);
    el.cCommBiz.value = Math.round(state.commissions.businessIntroducer * 100);
    el.cCommOther.value = (state.commissions.otherCommissions * 100).toFixed(1);
    el.cMOp.value = Math.round(state.margins.operatingProfitRate * 100);
    el.cMRnd.value = Math.round(state.margins.rndRate * 100);
    el.cMRisk.value = Math.round(state.margins.riskReserveRate * 100);
    el.cMPremium.value = Math.round(state.margins.premiumRate * 100);
    el.cMAdditive.checked = state.margins.useAdditiveMargin;
    el.cFloorPres.value = state.presidentFloor;
    el.cFloorGov.value = Math.round((state.floorPcts.Governador || 0.89) * 100);
    el.cFloorSen.value = Math.round((state.floorPcts.Senador || 0.90) * 100);
    el.cFloorDepf.value = Math.round((state.floorPcts['Dep. Federal'] || 0.90) * 100);
    el.cFloorDepe.value = Math.round((state.floorPcts['Dep. Estadual'] || 0.92) * 100);
    el.cShSetup.value = Math.round((state.shares.setupShare || 0) * 100);
    el.cShOp.value = Math.round((state.shares.operationShare || 0) * 100);
    el.cShOpex.value = Math.round((state.shares.opexShare || 0) * 100);
    el.cShInfra.value = Math.round((state.shares.infraShare || 0) * 100);
    el.cShToken.value = Math.round((state.shares.tokenShare || 0) * 100);
    el.cShApps.value = Math.round((state.shares.appShare || 0) * 100);
    el.cShAdmin.value = Math.round((state.shares.adminShare || 0) * 100);
    el.cRToken.value = Math.round((state.reserves.tokenSafetyRate || 0) * 100);
    el.cRInfra.value = Math.round((state.reserves.infraRedundancyRate || 0) * 100);
    el.cRSupport.value = Math.round((state.reserves.supportReserveRate || 0) * 100);
    el.cRLegSupport.value = Math.round((state.reserves.legSupportReserve || 0) * 100);
    el.cRLegInfra.value = Math.round((state.reserves.legInfraReserve || 0) * 100);
    el.cRLegToken.value = Math.round((state.reserves.legTokenReserve || 0) * 100);
  }

  // ═══════════════════════════════════════════════════════════
  //  RECALC — calls engine then renders
  // ═══════════════════════════════════════════════════════════
  let lastResults = null;

  function recalc() {
    const results = E.calculateAll(state);
    lastResults = results;

    renderRobustBadge();
    renderAlerts(results);
    renderMainTable(results);
    renderDRE(results);           // ← NEW: DRE Panel
    renderDonut(results);
    renderCostSummary(results);
    renderTaxBreakdown(results);
    renderCommSummary();
    renderMarginSummary();
    renderCoverageBox(results.coverage247);
    renderProlaboreHint();
    renderMarginModeHint();
    renderMatrix(results);
    renderAudit(results);
    renderSanity(results);
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDERERS
  // ═══════════════════════════════════════════════════════════

  function renderRobustBadge() {
    el.robustBadge.classList.toggle('off', !state.premiumRobustMode);
    el.robustBadge.querySelector('.rb-label').textContent =
      state.premiumRobustMode ? 'Robusto' : 'Padrão';
    if (el.robustHint) {
      el.robustHint.textContent = state.premiumRobustMode
        ? 'Margem mín. 50%, redundância máxima'
        : 'Desativado — sem proteções automáticas';
    }
  }

  // ── DRE PANEL ────────────────────────────────
  function renderDRE(results) {
    const entry = results.matrix[state.selectedState]?.[state.selectedCargo];
    if (!entry) return;
    const r = entry.result;
    const cb = entry.costBreakdown;
    const months = state.costs.contractMonths;

    el.dreMonths.textContent = months;

    // Compute human operation cost + infra cost for DRE breakdown
    const humanCost = cb.setupTeamCost + cb.opTeamCost;
    const infraCost = cb.capex + cb.opex + cb.infra + cb.ia + cb.apps + cb.admin
                      + (cb.proLabore || 0) + cb.reservesTotal + cb.contingency;
    const effectiveTaxPct = r.taxes.effectiveTaxRate * 100;
    const commRate = r.commissions.effectiveCommissionRate * 100;

    // DRE Lines
    el.dreLines.innerHTML = `
      <div class="dre-line">
        <span class="dre-line-label">Volume de Negócios (Venda Bruta)</span>
        <span class="dre-line-value positive">${fmt(entry.finalPrice)}</span>
      </div>
      <div class="dre-line">
        <span class="dre-line-label">Impostos (-${effectiveTaxPct.toFixed(1)}%)</span>
        <span class="dre-line-value negative">-${fmt(r.taxes.totalTaxes)}</span>
      </div>
      <div class="dre-line">
        <span class="dre-line-label">Comissões (Vendas)</span>
        <span class="dre-line-value negative">-${fmt(r.commissions.totalCommissions)}</span>
      </div>

      <hr class="dre-separator"/>

      <div class="dre-subtotal">
        <span class="label">Receita Operacional Líquida</span>
        <span class="val">${fmt(r.netRevenue)}</span>
      </div>

      <div class="dre-detail-section">
        <div class="dre-detail-head">
          <span class="label">▶ Operação Humana</span>
          <span class="val">-${fmt(humanCost)}</span>
        </div>
        ${cb.setupTeamBreakdown?.filter(l => l.enabled).map(l =>
          `<div class="dre-detail-item"><span>${l.role} (${l.qty}x)</span><span class="v">${fmt(l.totalCost)}</span></div>`
        ).join('') || ''}
        ${cb.opTeamBreakdown?.filter(l => l.enabled).map(l =>
          `<div class="dre-detail-item"><span>${l.role} (${l.qty}x × ${l.months}m)</span><span class="v">${fmt(l.totalCost)}</span></div>`
        ).join('') || ''}
      </div>

      <div class="dre-detail-section">
        <div class="dre-detail-head">
          <span class="label">▶ Infra, IA & Operacional</span>
          <span class="val">-${fmt(infraCost)}</span>
        </div>
        <div class="dre-detail-item"><span>CAPEX Setup</span><span class="v">${fmt(cb.capex)}</span></div>
        <div class="dre-detail-item"><span>OPEX (${months}m)</span><span class="v">${fmt(cb.opex)}</span></div>
        <div class="dre-detail-item"><span>Infra (${months}m)</span><span class="v">${fmt(cb.infra)}</span></div>
        <div class="dre-detail-item"><span>IA/Tokens (${months}m)</span><span class="v">${fmt(cb.ia)}</span></div>
        <div class="dre-detail-item"><span>Apps (${months}m)</span><span class="v">${fmt(cb.apps)}</span></div>
        <div class="dre-detail-item"><span>Admin (${months}m)</span><span class="v">${fmt(cb.admin)}</span></div>
        ${cb.proLabore ? `<div class="dre-detail-item"><span>Pró-labore</span><span class="v">${fmt(cb.proLabore)}</span></div>` : ''}
        ${cb.reservesTotal ? `<div class="dre-detail-item"><span>Reservas Robustas</span><span class="v">${fmt(cb.reservesTotal)}</span></div>` : ''}
        <div class="dre-detail-item"><span>Contingência (${Math.round(cb.contingencyRate*100)}%)</span><span class="v">${fmt(cb.contingency)}</span></div>
      </div>
    `;

    // LUCRO BLOCK
    const marginClass = r.netMargin >= 0.50 ? 'healthy' : r.netMargin >= 0.20 ? 'warning' : 'danger';
    const profitNeg = r.profit < 0;
    el.dreLucroBlock.innerHTML = `
      <div class="dre-lucro-label">LUCRO LÍQUIDO FINAL (CAIXA REAL)</div>
      <div class="dre-lucro-row">
        <span class="dre-lucro-value ${profitNeg ? 'negative' : ''}">${fmt(r.profit)}</span>
        <div class="dre-margin-badge ${marginClass}">
          <div class="dre-margin-bg"></div>
          <div class="ring"></div>
          ${fmtPct(r.netMargin)}
        </div>
      </div>
    `;

    // STATUS BOX
    let statusIcon, statusLabel, statusMsg, statusCls;
    if (r.netMargin >= 0.50) {
      statusIcon = '✅'; statusLabel = 'SAUDÁVEL';
      statusMsg = 'Operação muito equilibrada. O caixa gerado permite sustentar a War Room de forma elástica e segura.';
      statusCls = 'healthy';
    } else if (r.netMargin >= 0.20) {
      statusIcon = '⚠️'; statusLabel = 'ATENÇÃO';
      statusMsg = 'Margem abaixo da meta robusta de 50%. Revisar custos ou preço.';
      statusCls = 'warning';
    } else {
      statusIcon = '🚨'; statusLabel = 'CRÍTICO';
      statusMsg = 'Operação em risco. Margem insuficiente para cobrir imprevistos.';
      statusCls = 'danger';
    }
    el.dreStatusBox.innerHTML = `<div class="dre-status ${statusCls}"><span class="dre-status-icon">${statusIcon}</span><strong>${statusLabel}:</strong> ${statusMsg}</div>`;

    // RADAR SECTION
    el.dreRadar.innerHTML = `
      <h5>🏴 Radar de Crise & Upsell</h5>
      <p>Receita não contabilizada acima: Se o volume do candidato estourar o limite de posts do plano base, ele comprará Pacotes de Crédito Avulsos, gerando <em>Revenue Recorrente.</em></p>
    `;
  }

  // ── ALERTS ────────────────────────────────
  function renderAlerts(results) {
    const alerts = [];
    const entry = results.matrix[state.selectedState]?.[state.selectedCargo];
    if (entry) {
      if (entry.priceAdjusted) alerts.push({ t:'warning', m: entry.adjustmentReason });
      if (entry.result.profit < 0) alerts.push({ t:'critical', m:`Lucro negativo para ${entry.cargo} (${entry.uf})` });
      if (entry.result.netMargin < 0.50 && state.premiumRobustMode) alerts.push({ t:'critical', m:`Margem ${fmtPct(entry.result.netMargin)} abaixo de 50%` });
    }
    const cov = results.coverage247;
    if (cov.status === 'CRITICAL') alerts.push({ t:'critical', m: cov.message });
    else if (cov.status === 'WARNING') alerts.push({ t:'warning', m: cov.message });

    const commRate = (state.commissions.salesDirector||0) + (state.commissions.businessIntroducer||0) + (state.commissions.otherCommissions||0);
    if (commRate < 0.15) alerts.push({ t:'critical', m:`Comissão total (${(commRate*100).toFixed(1)}%) abaixo de 15%` });
    const taxCheck = (state.taxes.pis||0) + (state.taxes.cofins||0) + (state.taxes.iss||0);
    if (taxCheck === 0) alerts.push({ t:'critical', m:'Tributos zerados' });
    if (state.costs.includeProLabore && state.costs.proLaboreMonthly > 15000)
      alerts.push({ t:'warning', m:'Pró-labore alto pode destruir eficiência fiscal.' });
    if (!state.margins.useAdditiveMargin) alerts.push({ t:'info', m:'Modo multiplicativo ativo — aumenta markup oculto.' });
    if (state.costs.contractMonths < 3) alerts.push({ t:'warning', m:'Contrato abaixo de 3 meses' });

    const iconCrit = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    const iconWarn = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    const iconInfo = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    el.alertsBar.innerHTML = alerts.map(a => {
      const icon = a.t === 'critical' ? iconCrit : a.t === 'warning' ? iconWarn : iconInfo;
      return `<div class="alert-chip ${a.t}"><span class="alert-icon">${icon}</span>${a.m}</div>`;
    }).join('');
  }

  // ── MAIN TABLE ────────────────────────────────
  function renderMainTable(results) {
    const uf = state.selectedState;
    const stData = E.STATES_DATA.find(s => s.uf === uf);
    el.tableStateLabel.textContent = stData ? stData.state : uf;

    el.mainTbody.innerHTML = E.CARGOS.map(cargo => {
      const e = results.matrix[uf][cargo];
      if (!e) return '';
      const r = e.result;
      const mc = r.netMargin >= 0.50 ? 'v-margin-good' : r.netMargin >= 0.20 ? 'v-margin-med' : 'v-margin-bad';
      const active = cargo === state.selectedCargo ? 'active' : '';
      const stCls = statusClass(r.riskStatus);
      const adjusted = e.priceAdjusted ? ' *' : '';
      return `<tr class="${active}" data-cargo="${cargo}">
        <td>${cargo}</td>
        <td class="v-price">${fmt(e.finalPrice)}${adjusted}</td>
        <td style="color:var(--text-3)">${fmt(e.floorPrice)}</td>
        <td class="v-cost">${fmt(r.baseCost)}</td>
        <td class="v-tax">${fmt(r.taxes.totalTaxes)}</td>
        <td class="v-comm">${fmt(r.commissions.totalCommissions)}</td>
        <td class="v-profit">${fmt(r.profit)}</td>
        <td class="${mc}">${fmtPct(r.netMargin)}</td>
        <td><span class="status-badge ${stCls}">${r.riskStatus}</span></td>
      </tr>`;
    }).join('');
  }

  function statusClass(status) {
    return { 'SAUDÁVEL':'st-ok', 'ATENÇÃO':'st-atencao', 'BAIXA':'st-baixa', 'CRÍTICO':'st-critico', 'PREJUÍZO':'st-prejuizo' }[status] || 'st-atencao';
  }

  // ── DONUT ────────────────────────────────
  let donutAnim = null;
  function renderDonut(results) {
    const entry = results.matrix[state.selectedState]?.[state.selectedCargo];
    if (!entry) return;
    const r = entry.result;
    el.chartLabel.textContent = entry.cargo;

    const canvas = el.donut;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 240;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const profit = Math.max(r.profit, 0);
    const cost = Math.max(r.baseCost, 0);
    const tax = Math.max(r.taxes.totalTaxes, 0);
    const comm = Math.max(r.commissions.totalCommissions, 0);
    const total = profit + cost + tax + comm || 1;

    const slices = [
      { value: profit, color: '#34d399', label: 'Lucro' },
      { value: cost,   color: '#fb7185', label: 'Custos' },
      { value: tax,    color: '#60a5fa', label: 'Tributos' },
      { value: comm,   color: '#f97316', label: 'Comissões' },
    ];

    el.chartCenter.innerHTML = `<span class="cc-label">Preço Final</span><span class="cc-value">${fmt(entry.finalPrice)}</span>`;
    el.chartLegend.innerHTML = slices.map(s => `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label}: ${fmt(s.value)}</div>`).join('');

    if (donutAnim) cancelAnimationFrame(donutAnim);
    animateDonut(ctx, size, slices, total);
  }

  function animateDonut(ctx, size, slices, total) {
    const cx = size / 2, cy = size / 2, outerR = size / 2 - 14, innerR = outerR * 0.64;
    let prog = 0;
    function draw() {
      prog = Math.min(prog + 0.045, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fill();
      let start = -Math.PI / 2;
      slices.forEach(sl => {
        const angle = (sl.value / total) * Math.PI * 2 * ease;
        if (angle < 0.001) { start += angle; return; }
        const a1 = start + 0.02, a2 = start + angle - 0.02;
        if (a2 > a1) {
          ctx.beginPath(); ctx.arc(cx, cy, outerR, a1, a2); ctx.arc(cx, cy, innerR, a2, a1, true); ctx.closePath();
          const g = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          g.addColorStop(0, sl.color + 'aa'); g.addColorStop(1, sl.color);
          ctx.fillStyle = g; ctx.shadowColor = sl.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
        }
        start += angle;
      });
      if (prog < 1) donutAnim = requestAnimationFrame(draw);
    }
    draw();
  }

  // ── COST SUMMARY ────────────────────────────────
  function renderCostSummary(results) {
    const entry = results.matrix[state.selectedState]?.[state.selectedCargo];
    if (!entry) return;
    const cb = entry.costBreakdown;
    el.costSummary.innerHTML = `
      <div class="cs-row"><span class="cs-l">Custo Humano Total</span><span class="cs-v">${fmt(cb.setupTeamCost + cb.opTeamCost)}</span></div>
      <div class="cs-row"><span class="cs-l">Infra + IA + Operacional</span><span class="cs-v">${fmt(cb.capex + cb.opex + cb.infra + cb.ia + cb.apps + cb.admin)}</span></div>
      ${cb.reservesTotal ? `<div class="cs-row"><span class="cs-l">Reservas Robustas</span><span class="cs-v">${fmt(cb.reservesTotal)}</span></div>` : ''}
      <div class="cs-row"><span class="cs-l">Contingência (${Math.round(cb.contingencyRate*100)}%)</span><span class="cs-v">${fmt(cb.contingency)}</span></div>
      <div class="cs-row cs-total"><span class="cs-l">Custo Total (${cb.mode === 'dedicated' ? 'Dedicado' : 'Multi-tenant'})</span><span class="cs-v">${fmt(cb.totalCost)}</span></div>`;
  }

  // ── TAX BREAKDOWN ────────────────────────────────
  function renderTaxBreakdown(results) {
    const entry = results.matrix[state.selectedState]?.[state.selectedCargo];
    if (!entry) return;
    const t = entry.result.taxes;
    el.taxBreakdown.innerHTML = `
      <div class="tb-row"><span class="tb-label">Receita Bruta</span><span class="tb-val">${fmt(entry.finalPrice)}</span></div>
      <div class="tb-row"><span class="tb-label">PIS (${(state.taxes.pis*100).toFixed(2)}%)</span><span class="tb-val">${fmt(t.pis)}</span></div>
      <div class="tb-row"><span class="tb-label">COFINS (${(state.taxes.cofins*100).toFixed(1)}%)</span><span class="tb-val">${fmt(t.cofins)}</span></div>
      <div class="tb-row"><span class="tb-label">ISS (${(state.taxes.iss*100).toFixed(1)}%)</span><span class="tb-val">${fmt(t.iss)}</span></div>
      <div class="tb-row"><span class="tb-label">IRPJ (${(state.taxes.irpjRate*100).toFixed(0)}%)</span><span class="tb-val">${fmt(t.irpj)}</span></div>
      <div class="tb-row"><span class="tb-label">IRPJ Adicional (${(state.taxes.irpjAdditionalRate*100).toFixed(0)}%)</span><span class="tb-val">${fmt(t.irpjAdditional)}</span></div>
      <div class="tb-row"><span class="tb-label">CSLL (${(state.taxes.csllRate*100).toFixed(0)}%)</span><span class="tb-val">${fmt(t.csll)}</span></div>
      ${t.otherWithholdings > 0 ? `<div class="tb-row"><span class="tb-label">Outras Retenções</span><span class="tb-val">${fmt(t.otherWithholdings)}</span></div>` : ''}
      <div class="tb-row tb-total"><span class="tb-label">Total Tributos</span><span class="tb-val">${fmt(t.totalTaxes)}</span></div>
      <div class="tb-row tb-total"><span class="tb-label">Alíquota Efetiva</span><span class="tb-val">${fmtPct(t.effectiveTaxRate)}</span></div>`;
  }

  // ── COMMISSION SUMMARY ────────────────────────────────
  function renderCommSummary() {
    const commRate = (state.commissions.salesDirector||0) + (state.commissions.businessIntroducer||0) + (state.commissions.otherCommissions||0);
    const danger = commRate < 0.15;
    el.commSummary.innerHTML = `
      <div class="summary-row"><span class="sr-l">Diretor Comercial</span><span class="sr-v">${(state.commissions.salesDirector*100).toFixed(1)}%</span></div>
      <div class="summary-row"><span class="sr-l">Introdutor de Negócio</span><span class="sr-v">${(state.commissions.businessIntroducer*100).toFixed(1)}%</span></div>
      <div class="summary-row"><span class="sr-l">Outras</span><span class="sr-v">${(state.commissions.otherCommissions*100).toFixed(1)}%</span></div>
      <div class="summary-row summary-total">
        <span class="sr-l">Total</span>
        <span class="sr-v" style="color:${danger?'var(--red)':'var(--indigo)'}">${(commRate*100).toFixed(1)}%</span>
      </div>
      ${danger ? '<div class="summary-alert danger">⚠ Comissão total abaixo de 15%</div>' : ''}`;
  }

  // ── MARGIN SUMMARY ────────────────────────────────
  function renderMarginSummary() {
    const m = state.margins;
    const markup = E.calculateTargetMarkup(m);
    el.marginSummary.innerHTML = `
      <div class="summary-row"><span class="sr-l">Lucro Operacional</span><span class="sr-v">${(m.operatingProfitRate*100).toFixed(1)}%</span></div>
      <div class="summary-row"><span class="sr-l">P&D</span><span class="sr-v">${(m.rndRate*100).toFixed(1)}%</span></div>
      <div class="summary-row"><span class="sr-l">Reserva de Risco</span><span class="sr-v">${(m.riskReserveRate*100).toFixed(1)}%</span></div>
      <div class="summary-row"><span class="sr-l">Premium</span><span class="sr-v">${(m.premiumRate*100).toFixed(1)}%</span></div>
      <div class="summary-row summary-total">
        <span class="sr-l">Markup Total (${m.useAdditiveMargin?'aditivo':'multiplicativo'})</span>
        <span class="sr-v" style="color:var(--indigo)">${(markup*100).toFixed(1)}%</span>
      </div>`;
  }

  // ── COVERAGE BOX ────────────────────────────────
  function renderCoverageBox(cov) {
    const stCls = cov.status === 'OK' ? 'ok' : cov.status === 'CRITICAL' ? 'critical' : cov.status === 'WARNING' ? 'warning' : 'info';
    el.coverageBox.innerHTML = `
      <div class="cov-row"><span class="cov-label">Status</span><span class="cov-val">${cov.active ? 'Ativo' : 'Desativado'}</span></div>
      <div class="cov-row"><span class="cov-label">Horas semanais</span><span class="cov-val">${cov.weeklyHoursNeeded}h</span></div>
      <div class="cov-row"><span class="cov-label">Mínimo matemático</span><span class="cov-val">${cov.minimumPeopleByHours} pessoas</span></div>
      <div class="cov-row"><span class="cov-label">Configuradas</span><span class="cov-val">${cov.configured} pessoas</span></div>
      <div class="cov-status ${stCls}">${cov.status} — ${cov.message}</div>`;
  }

  function renderProlaboreHint() {
    if (state.costs.includeProLabore && state.costs.proLaboreMonthly > 15000) {
      el.prolaboreHint.textContent = '⚠ Pró-labore alto pode destruir eficiência fiscal.';
    } else {
      el.prolaboreHint.textContent = '';
    }
  }

  function renderMarginModeHint() {
    el.marginModeHint.textContent = state.margins.useAdditiveMargin
      ? 'Aditivo ativo (recomendado)'
      : '⚠ Multiplicativo — markup oculto';
    el.marginModeHint.style.color = state.margins.useAdditiveMargin ? 'var(--text-3)' : 'var(--yellow)';
  }

  // ── TEAM TABLE ────────────────────────────────
  function renderTeamTable(type) {
    const team = type === 'setup' ? state.setupTeam : state.operationTeam;
    const body = type === 'setup' ? el.setupBody : el.opBody;
    const cltB = state.costs.cltBurdenRate;
    const pjB = state.costs.pjBurdenRate;

    body.innerHTML = team.map((l, i) => {
      const burden = l.hiringModel === 'CLT' ? cltB : pjB;
      const total = l.enabled ? l.qty * l.monthlyCost * l.months * (1 + burden) : 0;
      return `<tr>
        <td class="t-chk"><input type="checkbox" class="t-enabled" ${l.enabled ? 'checked' : ''}/></td>
        <td><input type="text" class="t-role" value="${esc(l.role)}"/></td>
        <td><input type="number" class="t-qty" value="${l.qty}" min="0" step="1" style="width:50px"/></td>
        <td><input type="number" class="t-cost" value="${l.monthlyCost}" min="0" step="500" style="width:90px"/></td>
        <td><input type="number" class="t-months" value="${l.months}" min="1" step="1" style="width:55px"/></td>
        <td><select class="t-model"><option value="PJ" ${l.hiringModel==='PJ'?'selected':''}>PJ</option><option value="CLT" ${l.hiringModel==='CLT'?'selected':''}>CLT</option></select></td>
        <td class="t-total">${fmt(total)}</td>
        <td class="t-del"><button class="btn-del" data-idx="${i}">✕</button></td>
      </tr>`;
    }).join('');
  }

  // ── MATRIX ────────────────────────────────
  function renderMatrix(results) {
    el.matrixThead.innerHTML = `<tr><th>Estado</th><th>Tier</th>${E.CARGOS.map(c => `<th colspan="2">${c}</th>`).join('')}</tr>
      <tr><th></th><th></th>${E.CARGOS.map(() => '<th>Preço</th><th>Margem</th>').join('')}</tr>`;

    el.matrixTbody.innerHTML = E.STATES_DATA.map(st => {
      const cols = E.CARGOS.map(cargo => {
        const e = results.matrix[st.uf]?.[cargo];
        if (!e) return '<td>—</td><td>—</td>';
        const mc = e.result.netMargin >= 0.50 ? 'v-margin-good' : e.result.netMargin >= 0.20 ? 'v-margin-med' : 'v-margin-bad';
        return `<td class="v-price">${fmt(e.finalPrice)}</td><td class="${mc}">${fmtPct(e.result.netMargin)}</td>`;
      }).join('');
      return `<tr><td class="mt-state">${st.uf}</td><td class="mt-tier">${st.tier}</td>${cols}</tr>`;
    }).join('');
  }

  // ── AUDIT ────────────────────────────────
  function renderAudit(results) {
    el.auditGrid.innerHTML = results.auditItems.map(item => {
      const cls = item.status === 'OK' ? 'as-ok' : item.status === 'ATENÇÃO' ? 'as-atencao' : 'as-critico';
      return `<div class="audit-item">
        <span class="audit-status ${cls}">${item.status}</span>
        <span class="audit-label">${item.label}</span>
        <span class="audit-detail">${item.detail}</span>
      </div>`;
    }).join('');
  }

  function renderSanity(results) {
    const checks = E.runFinancialSanityChecks(state, results);
    el.sanityGrid.innerHTML = checks.map(c =>
      `<div class="sanity-item"><span class="sanity-icon">${c.pass ? '✅' : '❌'}</span>${c.test}</div>`
    ).join('');
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORT / IMPORT (identical logic)
  // ═══════════════════════════════════════════════════════════
  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortex-pricing-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!imported.costs || !imported.taxes || !imported.commissions) {
          alert('Arquivo JSON inválido: faltam campos obrigatórios.');
          return;
        }
        state = { ...buildDefaultState(), ...imported };
        syncUIFromState();
        renderTeamTable('setup');
        renderTeamTable('operation');
        recalc();
      } catch (err) {
        alert('Erro ao importar JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES (identical)
  // ═══════════════════════════════════════════════════════════
  function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
  function int(v, def) { const n = parseInt(v); return isFinite(n) ? n : (def || 0); }
  function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  // ═══════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', init);
})();

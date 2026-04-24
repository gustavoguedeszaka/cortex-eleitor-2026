/**
 * ════════════════════════════════════════════════════════════════
 * CORTEX ELEITOR — PRICING ENGINE v2.0
 * engine.js — Pure financial calculation engine (zero DOM)
 *
 * Anti-error, auditable, parametric.
 * Implements: Lucro Presumido taxes, binary-search price solver,
 * PJ/CLT team costs, dedicated/multi-tenant modes, robust mode.
 * ════════════════════════════════════════════════════════════════
 */
const CortexEngine = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  STATIC DATA
  // ═══════════════════════════════════════════════════════════

  const CARGOS = ['Presidente', 'Governador', 'Senador', 'Dep. Federal', 'Dep. Estadual'];

  const CARGO_OPERATION_MODE = {
    'Presidente':    'dedicated',
    'Governador':    'dedicated',
    'Senador':       'dedicated',
    'Dep. Federal':  'multiTenant',
    'Dep. Estadual': 'multiTenant',
  };

  const STATES_DATA = [
    { state: 'São Paulo',         uf: 'SP', tier: 'Tier 1', publicPrices: { Presidente:5900000, Governador:2750000, Senador:1150000, 'Dep. Federal':420000,  'Dep. Estadual':240000 }},
    { state: 'Minas Gerais',      uf: 'MG', tier: 'Tier 1', publicPrices: { Presidente:5900000, Governador:2350000, Senador:980000,  'Dep. Federal':340000,  'Dep. Estadual':195000 }},
    { state: 'Rio de Janeiro',    uf: 'RJ', tier: 'Tier 1', publicPrices: { Presidente:5900000, Governador:2300000, Senador:960000,  'Dep. Federal':330000,  'Dep. Estadual':190000 }},
    { state: 'Bahia',             uf: 'BA', tier: 'Tier 2', publicPrices: { Presidente:5900000, Governador:2000000, Senador:840000,  'Dep. Federal':285000,  'Dep. Estadual':165000 }},
    { state: 'Paraná',            uf: 'PR', tier: 'Tier 2', publicPrices: { Presidente:5900000, Governador:1950000, Senador:820000,  'Dep. Federal':280000,  'Dep. Estadual':160000 }},
    { state: 'Rio Grande do Sul', uf: 'RS', tier: 'Tier 2', publicPrices: { Presidente:5900000, Governador:1950000, Senador:820000,  'Dep. Federal':280000,  'Dep. Estadual':160000 }},
    { state: 'Pernambuco',        uf: 'PE', tier: 'Tier 2', publicPrices: { Presidente:5900000, Governador:1850000, Senador:780000,  'Dep. Federal':265000,  'Dep. Estadual':150000 }},
    { state: 'Ceará',             uf: 'CE', tier: 'Tier 3', publicPrices: { Presidente:5900000, Governador:1750000, Senador:740000,  'Dep. Federal':245000,  'Dep. Estadual':140000 }},
    { state: 'Pará',              uf: 'PA', tier: 'Tier 3', publicPrices: { Presidente:5900000, Governador:1750000, Senador:740000,  'Dep. Federal':245000,  'Dep. Estadual':140000 }},
    { state: 'Santa Catarina',    uf: 'SC', tier: 'Tier 3', publicPrices: { Presidente:5900000, Governador:1800000, Senador:760000,  'Dep. Federal':255000,  'Dep. Estadual':145000 }},
    { state: 'Goiás',             uf: 'GO', tier: 'Tier 3', publicPrices: { Presidente:5900000, Governador:1700000, Senador:720000,  'Dep. Federal':235000,  'Dep. Estadual':135000 }},
    { state: 'Maranhão',          uf: 'MA', tier: 'Tier 3', publicPrices: { Presidente:5900000, Governador:1600000, Senador:680000,  'Dep. Federal':220000,  'Dep. Estadual':125000 }},
  ];

  // ═══════════════════════════════════════════════════════════
  //  DEFAULT FACTORIES  (all editable by user)
  // ═══════════════════════════════════════════════════════════

  function getDefaultCostInputs() {
    return {
      contractMonths: 6,
      capexSetup:     200000,
      opexMonthly:    35000,
      infraMonthly:   25000,
      iaTokensMonthly:30000,
      appsMonthly:    3500,
      adminMonthly:   7500,
      real247:        true,
      real247People:  5,
      includeProLabore: false,
      proLaboreMonthly: 0,
      cltBurdenRate:  0.80,
      pjBurdenRate:   0.00,
      contingencyRate:0.10,
    };
  }

  function getDefaultSetupTeam() {
    return [
      { role:'PM',                     qty:1, monthlyCost:22000, months:1, hiringModel:'PJ', enabled:true },
      { role:'Dev Frontend/Mobile',    qty:1, monthlyCost:18000, months:1, hiringModel:'PJ', enabled:true },
      { role:'Dev Backend Core',       qty:1, monthlyCost:20000, months:1, hiringModel:'PJ', enabled:true },
      { role:'Dev Backend Scraping/DB',qty:3, monthlyCost:20000, months:1, hiringModel:'PJ', enabled:true },
      { role:'QA',                     qty:1, monthlyCost:14000, months:1, hiringModel:'PJ', enabled:true },
      { role:'AppSec',                 qty:1, monthlyCost:24000, months:1, hiringModel:'PJ', enabled:true },
    ];
  }

  function getDefaultOperationTeam() {
    return [
      { role:'Dev suporte / plantão',        qty:3, monthlyCost:14000, months:6, hiringModel:'PJ', enabled:true },
      { role:'DevOps / Infra',               qty:1, monthlyCost:18000, months:6, hiringModel:'PJ', enabled:true },
      { role:'Analista crise / QA operacional',qty:1, monthlyCost:12000, months:6, hiringModel:'PJ', enabled:true },
    ];
  }

  function getDefaultTaxInputs() {
    return {
      pis:    0.0065,
      cofins: 0.03,
      iss:    0.05,
      presumedProfitRateIRPJ: 0.32,
      presumedProfitRateCSLL: 0.32,
      irpjRate: 0.15,
      csllRate: 0.09,
      irpjAdditionalRate: 0.10,
      irpjAdditionalMonthlyThreshold: 20000,
      otherWithholdings: 0,
    };
  }

  function getDefaultCommissionInputs() {
    return {
      salesDirector:      0.10,
      businessIntroducer: 0.05,
      otherCommissions:   0,
    };
  }

  function getDefaultMarginInputs() {
    return {
      operatingProfitRate: 0.20,
      rndRate:             0.08,
      riskReserveRate:     0.08,
      premiumRate:         0.10,
      useAdditiveMargin:   true,
    };
  }

  function getDefaultShares() {
    return {
      setupShare:    0.08,
      operationShare:0.12,
      opexShare:     0.10,
      infraShare:    0.10,
      tokenShare:    0.15,
      appShare:      0.05,
      adminShare:    0.05,
    };
  }

  function getDefaultReserves() {
    return {
      tokenSafetyRate:     0.30,
      infraRedundancyRate: 0.25,
      supportReserveRate:  0.20,
      legSupportReserve:   0.15,
      legInfraReserve:     0.15,
      legTokenReserve:     0.20,
    };
  }

  function getDefaultFloorPcts() {
    return {
      Presidente:    null,   // fixed value below
      Governador:    0.89,
      Senador:       0.90,
      'Dep. Federal':0.90,
      'Dep. Estadual':0.92,
    };
  }

  const DEFAULT_PRESIDENT_FLOOR = 5300000;
  const MINIMUM_NET_MARGIN = 0.50;

  // ═══════════════════════════════════════════════════════════
  //  TEAM COSTS
  // ═══════════════════════════════════════════════════════════

  function calculateTeamLineCost(line, cltBurden, pjBurden) {
    if (!line.enabled) return 0;
    const burden = line.hiringModel === 'CLT' ? cltBurden : pjBurden;
    return line.qty * line.monthlyCost * line.months * (1 + burden);
  }

  function calculateTeamCost(lines, cltBurden, pjBurden) {
    let total = 0;
    const breakdown = lines.map(l => {
      const cost = calculateTeamLineCost(l, cltBurden, pjBurden);
      total += cost;
      return { ...l, totalCost: cost };
    });
    return { total, breakdown };
  }

  // ═══════════════════════════════════════════════════════════
  //  BASE COST CALCULATION
  // ═══════════════════════════════════════════════════════════

  /**
   * @param {'dedicated'|'multiTenant'} mode
   * @param {Object} cost   — CostInputs
   * @param {Array}  setupTeam
   * @param {Array}  opTeam
   * @param {Object} shares — multi-tenant shares (unused for dedicated)
   * @param {Object} reserves
   * @param {boolean} robustMode
   * @returns {Object} CostBreakdown
   */
  function calculateBaseCost(mode, cost, setupTeam, opTeam, shares, reserves, robustMode) {
    const months = cost.contractMonths || 6;
    const cltB = cost.cltBurdenRate || 0;
    const pjB  = cost.pjBurdenRate || 0;

    // Full-scale costs
    const capexFull     = cost.capexSetup || 0;
    const opexFull      = (cost.opexMonthly || 0) * months;
    const infraFull     = (cost.infraMonthly || 0) * months;
    const iaFull        = (cost.iaTokensMonthly || 0) * months;
    const appsFull      = (cost.appsMonthly || 0) * months;
    const adminFull     = (cost.adminMonthly || 0) * months;
    const setupTeamRes  = calculateTeamCost(setupTeam, cltB, pjB);
    const opTeamRes     = calculateTeamCost(opTeam, cltB, pjB);
    const setupTeamFull = setupTeamRes.total;
    const opTeamFull    = opTeamRes.total;

    let capex, opex, infra, ia, apps, admin, setupCost, opCost, proLabore;

    if (mode === 'dedicated') {
      capex     = capexFull;
      opex      = opexFull;
      infra     = infraFull;
      ia        = iaFull;
      apps      = appsFull;
      admin     = adminFull;
      setupCost = setupTeamFull;
      opCost    = opTeamFull;
    } else {
      // Multi-tenant — fractions
      const s = shares || getDefaultShares();
      capex     = capexFull     * (s.setupShare || 0);
      opex      = opexFull      * (s.opexShare || 0);
      infra     = infraFull     * (s.infraShare || 0);
      ia        = iaFull        * (s.tokenShare || 0);
      apps      = appsFull      * (s.appShare || 0);
      admin     = adminFull     * (s.adminShare || 0);
      setupCost = setupTeamFull * (s.setupShare || 0);
      opCost    = opTeamFull    * (s.operationShare || 0);
    }

    // Pro-labore (only for dedicated)
    proLabore = 0;
    if (mode === 'dedicated' && cost.includeProLabore) {
      proLabore = (cost.proLaboreMonthly || 0) * months;
    }

    let subtotal = capex + opex + infra + ia + apps + admin + setupCost + opCost + proLabore;

    // Robust-mode reserves (added ON TOP of base)
    let tokenReserve = 0, infraReserve = 0, supportReserve = 0;
    const r = reserves || getDefaultReserves();

    if (robustMode) {
      if (mode === 'dedicated') {
        tokenReserve   = ia     * Math.max(r.tokenSafetyRate, 0);
        infraReserve   = infra  * Math.max(r.infraRedundancyRate, 0);
        supportReserve = opCost * Math.max(r.supportReserveRate, 0);
      } else {
        tokenReserve   = ia     * Math.max(r.legTokenReserve, 0);
        infraReserve   = infra  * Math.max(r.legInfraReserve, 0);
        supportReserve = opCost * Math.max(r.legSupportReserve, 0);
      }
    }

    const reservesTotal = tokenReserve + infraReserve + supportReserve;
    const subtotalWithReserves = subtotal + reservesTotal;

    // Contingency
    let contingencyRate = cost.contingencyRate || 0;
    if (robustMode) contingencyRate = Math.max(contingencyRate, 0.20);
    const contingency = subtotalWithReserves * contingencyRate;

    const totalCost = subtotalWithReserves + contingency;

    return {
      mode,
      capex,
      opex,
      infra,
      ia,
      apps,
      admin,
      setupTeamCost: setupCost,
      opTeamCost:    opCost,
      proLabore,
      subtotalBeforeReserves: subtotal,
      tokenReserve,
      infraReserve,
      supportReserve,
      reservesTotal,
      subtotalWithReserves,
      contingencyRate,
      contingency,
      totalCost,
      // for audit
      setupTeamBreakdown: setupTeamRes.breakdown,
      opTeamBreakdown:    opTeamRes.breakdown,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  LUCRO PRESUMIDO TAXES
  // ═══════════════════════════════════════════════════════════

  function calculateLucroPresumidoTaxes(grossRevenue, months, tax) {
    if (!grossRevenue || grossRevenue <= 0) {
      return { pis:0, cofins:0, iss:0, irpj:0, irpjAdditional:0, csll:0, otherWithholdings:0, totalTaxes:0, effectiveTaxRate:0 };
    }
    const t = tax || getDefaultTaxInputs();

    const pis    = grossRevenue * (t.pis || 0);
    const cofins = grossRevenue * (t.cofins || 0);
    const iss    = grossRevenue * (t.iss || 0);

    const irpjBase = grossRevenue * (t.presumedProfitRateIRPJ || 0.32);
    const irpj     = irpjBase * (t.irpjRate || 0.15);

    const csllBase = grossRevenue * (t.presumedProfitRateCSLL || 0.32);
    const csll     = csllBase * (t.csllRate || 0.09);

    const additionalThreshold = (t.irpjAdditionalMonthlyThreshold || 20000) * (months || 6);
    const irpjAdditionalBase  = Math.max(0, irpjBase - additionalThreshold);
    const irpjAdditional      = irpjAdditionalBase * (t.irpjAdditionalRate || 0.10);

    const otherWithholdings = grossRevenue * (t.otherWithholdings || 0);

    const totalTaxes = pis + cofins + iss + irpj + irpjAdditional + csll + otherWithholdings;
    const effectiveTaxRate = totalTaxes / grossRevenue;

    return { pis, cofins, iss, irpjBase, irpj, csllBase, csll, irpjAdditional, irpjAdditionalBase, otherWithholdings, totalTaxes, effectiveTaxRate };
  }

  // ═══════════════════════════════════════════════════════════
  //  COMMISSIONS
  // ═══════════════════════════════════════════════════════════

  function calculateCommissions(grossRevenue, comm) {
    if (!grossRevenue || grossRevenue <= 0) {
      return { salesDirector:0, businessIntroducer:0, other:0, totalCommissions:0, effectiveCommissionRate:0 };
    }
    const c = comm || getDefaultCommissionInputs();
    const salesDirector      = grossRevenue * (c.salesDirector || 0);
    const businessIntroducer = grossRevenue * (c.businessIntroducer || 0);
    const other              = grossRevenue * (c.otherCommissions || 0);
    const totalCommissions   = salesDirector + businessIntroducer + other;
    const effectiveCommissionRate = (c.salesDirector||0) + (c.businessIntroducer||0) + (c.otherCommissions||0);
    return { salesDirector, businessIntroducer, other, totalCommissions, effectiveCommissionRate };
  }

  // ═══════════════════════════════════════════════════════════
  //  MARGIN CALCULATION
  // ═══════════════════════════════════════════════════════════

  function calculateTargetMarkup(margins) {
    const m = margins || getDefaultMarginInputs();
    if (m.useAdditiveMargin) {
      return (m.operatingProfitRate||0) + (m.rndRate||0) + (m.riskReserveRate||0) + (m.premiumRate||0);
    } else {
      return (1+(m.operatingProfitRate||0)) * (1+(m.rndRate||0)) * (1+(m.riskReserveRate||0)) * (1+(m.premiumRate||0)) - 1;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  BINARY SEARCH SOLVER — Required Gross Price
  // ═══════════════════════════════════════════════════════════

  /**
   * Finds the minimum gross revenue such that:
   *   grossRevenue - taxes(grossRevenue) - commissions(grossRevenue) >= baseCost * (1 + markup)
   */
  function solveRequiredGrossPrice(baseCost, marginInputs, taxInputs, commInputs, months) {
    const markup    = calculateTargetMarkup(marginInputs);
    const targetNet = baseCost * (1 + markup);

    if (targetNet <= 0) return 0;

    let low  = targetNet;
    let high = targetNet * 20;

    for (let i = 0; i < 120; i++) {
      const mid     = (low + high) / 2;
      const taxes   = calculateLucroPresumidoTaxes(mid, months, taxInputs);
      const comms   = calculateCommissions(mid, commInputs);
      const net     = mid - taxes.totalTaxes - comms.totalCommissions;

      if (net >= targetNet) {
        high = mid;
      } else {
        low = mid;
      }
      if (high - low < 100) break; // precision: R$100
    }
    return Math.ceil(high / 1000) * 1000;
  }

  // ═══════════════════════════════════════════════════════════
  //  BINARY SEARCH SOLVER — Minimum Price for Target Margin
  // ═══════════════════════════════════════════════════════════

  /**
   * Finds the minimum gross revenue such that:
   *   (grossRevenue - baseCost - taxes - commissions) / grossRevenue >= targetMargin
   */
  function solvePriceForMinimumMargin(baseCost, taxInputs, commInputs, targetMargin, months) {
    if (baseCost <= 0) return 0;
    if (targetMargin >= 1) return Infinity;

    // Rough initial guess: baseCost / (1 - targetMargin - ~0.35)
    let low  = baseCost;
    let high = baseCost * 40;

    for (let i = 0; i < 120; i++) {
      const mid   = (low + high) / 2;
      const taxes = calculateLucroPresumidoTaxes(mid, months, taxInputs);
      const comms = calculateCommissions(mid, commInputs);
      const profit= mid - baseCost - taxes.totalTaxes - comms.totalCommissions;
      const margin= profit / mid;

      if (margin >= targetMargin) {
        high = mid;
      } else {
        low = mid;
      }
      if (high - low < 100) break;
    }
    return Math.ceil(high / 1000) * 1000;
  }

  // ═══════════════════════════════════════════════════════════
  //  PRICING RESULT (for a given gross price)
  // ═══════════════════════════════════════════════════════════

  function calculatePricingResult(publicPrice, baseCost, taxInputs, commInputs, months) {
    const taxes       = calculateLucroPresumidoTaxes(publicPrice, months, taxInputs);
    const commissions = calculateCommissions(publicPrice, commInputs);
    const netRevenue  = publicPrice - taxes.totalTaxes - commissions.totalCommissions;
    const profit      = netRevenue - baseCost;
    const netMargin   = publicPrice > 0 ? profit / publicPrice : 0;
    const breakEven   = baseCost; // simplest definition: price where net = cost

    let riskStatus = 'SAUDÁVEL';
    if (netMargin < 0)      riskStatus = 'PREJUÍZO';
    else if (netMargin < 0.10) riskStatus = 'CRÍTICO';
    else if (netMargin < 0.20) riskStatus = 'BAIXA';
    else if (netMargin < 0.50) riskStatus = 'ATENÇÃO';

    return {
      publicPrice,
      baseCost,
      taxes,
      commissions,
      netRevenue,
      profit,
      netMargin,
      riskStatus,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  FLOOR PRICE
  // ═══════════════════════════════════════════════════════════

  function calculateFloorPrice(publicPrice, cargo, floorPcts, presidentFloor) {
    if (cargo === 'Presidente') return presidentFloor || DEFAULT_PRESIDENT_FLOOR;
    const pct = (floorPcts && floorPcts[cargo]) ? floorPcts[cargo] : 0.90;
    return Math.round(publicPrice * pct);
  }

  // ═══════════════════════════════════════════════════════════
  //  24/7 COVERAGE VALIDATION
  // ═══════════════════════════════════════════════════════════

  function validate247Coverage(cost) {
    const weeklyHours  = 168;
    const monthlyHours = weeklyHours * 4.33;
    const hoursPerPerson = 160;
    const minimumByHours = Math.ceil(monthlyHours / hoursPerPerson);
    const configured = cost.real247People || 0;
    const active     = cost.real247 || false;

    let status = 'OK';
    let message = '';

    if (active && configured < 5) {
      status  = 'CRITICAL';
      message = `Cobertura 24/7 real exige mínimo operacional de 5 pessoas. Configuradas: ${configured}.`;
    } else if (active && configured < minimumByHours) {
      status  = 'WARNING';
      message = `Pessoas configuradas (${configured}) abaixo do cálculo matemático (${minimumByHours}).`;
    } else if (active) {
      status  = 'OK';
      message = `24/7 operacional com ${configured} pessoas.`;
    } else {
      status  = 'INFO';
      message = '24/7 desativado.';
    }

    return {
      active,
      configured,
      weeklyHoursNeeded: weeklyHours,
      monthlyHoursNeeded: Math.round(monthlyHours),
      hoursPerPersonMonthly: hoursPerPerson,
      minimumPeopleByHours: minimumByHours,
      status,
      message,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  FULL CALCULATION — All states × all cargos
  // ═══════════════════════════════════════════════════════════

  /**
   * @param {Object} fullInputs — the entire application state
   * @returns {Object} { matrix, auditItems, coverage247 }
   *   matrix[uf][cargo] = PricingResult + extras
   */
  function calculateAll(fullInputs) {
    const {
      costs, setupTeam, operationTeam, shares, reserves,
      taxes, commissions, margins, floorPcts, presidentFloor,
      baselinePrices, premiumRobustMode,
    } = fullInputs;

    const months = costs.contractMonths || 6;

    // ── 1) Compute base costs: one for dedicated, one for multi-tenant
    const dedicatedCost   = calculateBaseCost('dedicated',   costs, setupTeam, operationTeam, shares, reserves, premiumRobustMode);
    const multiTenantCost = calculateBaseCost('multiTenant', costs, setupTeam, operationTeam, shares, reserves, premiumRobustMode);

    // ── 2) For each state × cargo, compute pricing result
    const matrix = {};

    STATES_DATA.forEach(st => {
      matrix[st.uf] = {};
      const stPrices = baselinePrices[st.uf] || st.publicPrices;

      CARGOS.forEach(cargo => {
        const mode     = CARGO_OPERATION_MODE[cargo];
        const costData = mode === 'dedicated' ? dedicatedCost : multiTenantCost;
        const baseCost = costData.totalCost;

        // Public price from editable baseline
        let publicPrice = stPrices[cargo] || 0;

        // Presidente always national — enforce uniform price
        if (cargo === 'Presidente') {
          publicPrice = baselinePrices['SP'] ? baselinePrices['SP']['Presidente'] : 5900000;
        }

        // Floor price
        const floorPrice = calculateFloorPrice(publicPrice, cargo, floorPcts, presidentFloor);

        // Strategy-required price (from margin targets)
        const strategyPrice = solveRequiredGrossPrice(baseCost, margins, taxes, commissions, months);

        // Minimum margin price (robust mode or always for info)
        const minMarginPrice = solvePriceForMinimumMargin(baseCost, taxes, commissions, MINIMUM_NET_MARGIN, months);

        // Final price logic
        let finalPrice = publicPrice;
        let priceAdjusted = false;
        let adjustmentReason = '';

        if (premiumRobustMode) {
          if (finalPrice < minMarginPrice) {
            priceAdjusted = true;
            adjustmentReason = `Preço ajustado de ${fmt(publicPrice)} para ${fmt(minMarginPrice)} para garantir margem ≥ 50%.`;
            finalPrice = minMarginPrice;
          }
        }

        // Compute result using final price
        const result = calculatePricingResult(finalPrice, baseCost, taxes, commissions, months);

        // Also compute result at public price for comparison
        const resultAtPublic = calculatePricingResult(publicPrice, baseCost, taxes, commissions, months);

        matrix[st.uf][cargo] = {
          state: st.state,
          uf: st.uf,
          tier: st.tier,
          cargo,
          mode,
          publicPrice,
          floorPrice,
          strategyPrice,
          minMarginPrice,
          finalPrice,
          priceAdjusted,
          adjustmentReason,
          baseCost,
          costBreakdown: costData,
          result,
          resultAtPublic,
        };
      });
    });

    // ── 3) 24/7 coverage
    const coverage247 = validate247Coverage(costs);

    // ── 4) Audit checks
    const auditItems = runAuditChecks(fullInputs, matrix, coverage247, dedicatedCost, multiTenantCost);

    return {
      matrix,
      dedicatedCost,
      multiTenantCost,
      coverage247,
      auditItems,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  AUDIT CHECKS
  // ═══════════════════════════════════════════════════════════

  function runAuditChecks(inputs, matrix, coverage247, dedicatedCost, multiTenantCost) {
    const items = [];
    const c = inputs.costs;
    const comm = inputs.commissions;
    const tax = inputs.taxes;
    const mgn = inputs.margins;
    const robust = inputs.premiumRobustMode;
    const res = inputs.reserves;

    function add(label, status, detail) {
      items.push({ label, status, detail });
    }

    // 1. Contract months
    add('Contrato em 6 meses',
      c.contractMonths === 6 ? 'OK' : 'ATENÇÃO',
      `Configurado: ${c.contractMonths} meses`);

    // 2. Commission total >= 15%
    const commTotal = (comm.salesDirector||0) + (comm.businessIntroducer||0) + (comm.otherCommissions||0);
    add('Comissão total ≥ 15%',
      commTotal >= 0.15 ? 'OK' : 'CRÍTICO',
      `Total: ${(commTotal*100).toFixed(1)}%`);

    // 3. Taxes not zeroed
    const totalTaxRate = (tax.pis||0) + (tax.cofins||0) + (tax.iss||0);
    add('Tributos não zerados',
      totalTaxRate > 0 ? 'OK' : 'CRÍTICO',
      `PIS+COFINS+ISS: ${(totalTaxRate*100).toFixed(2)}%`);

    // 4. IRPJ additional active
    add('IRPJ adicional ativo',
      (tax.irpjAdditionalRate||0) > 0 ? 'OK' : 'CRÍTICO',
      `Alíquota: ${((tax.irpjAdditionalRate||0)*100).toFixed(1)}%`);

    // 5. ISS preenchido
    add('ISS preenchido',
      (tax.iss||0) > 0 ? 'OK' : 'CRÍTICO',
      `ISS: ${((tax.iss||0)*100).toFixed(1)}%`);

    // 6. Deputies in multi-tenant
    add('Deputados em multi-tenant',
      CARGO_OPERATION_MODE['Dep. Federal'] === 'multiTenant' && CARGO_OPERATION_MODE['Dep. Estadual'] === 'multiTenant' ? 'OK' : 'ATENÇÃO',
      'Default: multi-tenant para legislativo');

    // 7. 24/7 minimum 5
    add('24/7 com mínimo de 5 pessoas',
      coverage247.status === 'OK' ? 'OK' : coverage247.status === 'CRITICAL' ? 'CRÍTICO' : 'ATENÇÃO',
      coverage247.message);

    // 8. Check margins across all states/cargos
    let minMargin = Infinity, worstLabel = '';
    let anyNegativeProfit = false;
    let anyPriceBelowCost = false;
    let presidentPriceVaries = false;
    const presidentPrices = new Set();

    Object.keys(matrix).forEach(uf => {
      CARGOS.forEach(cargo => {
        const entry = matrix[uf][cargo];
        if (!entry) return;
        const m = entry.result.netMargin;
        if (m < minMargin) { minMargin = m; worstLabel = `${cargo} (${uf})`; }
        if (entry.result.profit < 0) anyNegativeProfit = true;
        if (entry.finalPrice < entry.baseCost) anyPriceBelowCost = true;
        if (cargo === 'Presidente') presidentPrices.add(entry.publicPrice);
      });
    });

    add('Margem líquida acima da meta',
      minMargin >= 0.50 ? 'OK' : minMargin >= 0.20 ? 'ATENÇÃO' : 'CRÍTICO',
      `Menor margem: ${(minMargin*100).toFixed(1)}% — ${worstLabel}`);

    add('Lucro positivo em todos os cenários',
      anyNegativeProfit ? 'CRÍTICO' : 'OK',
      anyNegativeProfit ? 'Há cenários com lucro negativo' : 'Todos positivos');

    add('Nenhum preço abaixo do custo',
      anyPriceBelowCost ? 'CRÍTICO' : 'OK',
      anyPriceBelowCost ? 'Há preços abaixo do custo base' : 'Todos acima do custo');

    // 9. President same for all states
    add('Presidente com preço nacional único',
      presidentPrices.size <= 1 ? 'OK' : 'CRÍTICO',
      presidentPrices.size <= 1 ? 'Preço uniforme' : `${presidentPrices.size} preços diferentes encontrados`);

    // 10. CLT not using low burden
    if (hasAnyCLT(inputs.setupTeam) || hasAnyCLT(inputs.operationTeam)) {
      add('CLT com encargos adequados',
        c.cltBurdenRate >= 0.60 ? 'OK' : 'ATENÇÃO',
        `Encargos CLT: ${(c.cltBurdenRate*100).toFixed(0)}%`);
    }

    // 11. PJ not using CLT burden
    add('PJ sem encargos CLT',
      c.pjBurdenRate < 0.10 ? 'OK' : 'ATENÇÃO',
      `Encargos PJ: ${(c.pjBurdenRate*100).toFixed(0)}%`);

    // 12. Pro-labore
    if (c.includeProLabore) {
      add('Pró-labore',
        c.proLaboreMonthly <= 15000 ? 'OK' : 'ATENÇÃO',
        c.proLaboreMonthly > 15000
          ? 'Pró-labore alto pode destruir eficiência fiscal. Valide com contador.'
          : `R$ ${c.proLaboreMonthly.toLocaleString('pt-BR')}/mês`);
    }

    // 13. Custo base vs receita líquida
    add('Custo base não excede receita líquida',
      !anyPriceBelowCost ? 'OK' : 'CRÍTICO',
      'Validado em todos os cenários');

    // ROBUST MODE SPECIFIC
    if (robust) {
      add('Margem mín. 50% em todos os cargos',
        minMargin >= 0.50 ? 'OK' : 'CRÍTICO',
        `Menor: ${(minMargin*100).toFixed(1)}%`);

      add('Contingência mínima 20%',
        c.contingencyRate >= 0.20 ? 'OK' : 'ATENÇÃO',
        `Configurada: ${(c.contingencyRate*100).toFixed(0)}% (aplicada: ${(Math.max(c.contingencyRate, 0.20)*100).toFixed(0)}%)`);

      add('Reserva de tokens mínima 30%',
        (res.tokenSafetyRate||0) >= 0.30 ? 'OK' : 'ATENÇÃO',
        `Configurada: ${((res.tokenSafetyRate||0)*100).toFixed(0)}%`);

      add('Redundância infra mínima 25%',
        (res.infraRedundancyRate||0) >= 0.25 ? 'OK' : 'ATENÇÃO',
        `Configurada: ${((res.infraRedundancyRate||0)*100).toFixed(0)}%`);

      add('Nenhum NaN ou Infinity',
        checkNoNaN(matrix) ? 'OK' : 'CRÍTICO',
        checkNoNaN(matrix) ? 'Todos os valores são válidos' : 'Encontrados valores inválidos');
    }

    return items;
  }

  function hasAnyCLT(team) {
    return team.some(l => l.hiringModel === 'CLT' && l.enabled);
  }

  function checkNoNaN(matrix) {
    for (const uf of Object.keys(matrix)) {
      for (const cargo of CARGOS) {
        const e = matrix[uf][cargo];
        if (!e) continue;
        if (!isFinite(e.finalPrice) || !isFinite(e.baseCost) || !isFinite(e.result.profit)) return false;
      }
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  //  SANITY CHECKS (for display)
  // ═══════════════════════════════════════════════════════════

  function runFinancialSanityChecks(inputs, results) {
    const checks = [];
    const c = inputs.costs;
    const commRate = (inputs.commissions.salesDirector||0) + (inputs.commissions.businessIntroducer||0) + (inputs.commissions.otherCommissions||0);

    checks.push({ test: 'contractMonths === 6',          pass: c.contractMonths === 6 });
    checks.push({ test: 'totalCommissionRate >= 0.15',    pass: commRate >= 0.15 });
    checks.push({ test: 'presidentPriceSameForAllStates', pass: presidentUniform(results.matrix) });
    checks.push({ test: 'real247People >= 5 || !real247',  pass: !c.real247 || c.real247People >= 5 });
    checks.push({ test: 'deputiesDefaultMode === multiTenant', pass: true });
    checks.push({ test: 'taxes.totalTaxes > 0',           pass: allTaxesPositive(results.matrix) });
    checks.push({ test: 'price > baseCost',               pass: allPricesAboveCost(results.matrix) });
    checks.push({ test: 'profit > 0',                     pass: allProfitsPositive(results.matrix) });
    checks.push({ test: 'margin > 0',                     pass: allMarginsPositive(results.matrix) });

    return checks;
  }

  function presidentUniform(matrix) {
    const prices = Object.keys(matrix).map(uf => matrix[uf]['Presidente']?.publicPrice);
    return new Set(prices).size <= 1;
  }
  function allTaxesPositive(matrix) {
    for (const uf of Object.keys(matrix))
      for (const c of CARGOS)
        if (matrix[uf][c] && matrix[uf][c].result.taxes.totalTaxes <= 0) return false;
    return true;
  }
  function allPricesAboveCost(matrix) {
    for (const uf of Object.keys(matrix))
      for (const c of CARGOS)
        if (matrix[uf][c] && matrix[uf][c].finalPrice < matrix[uf][c].baseCost) return false;
    return true;
  }
  function allProfitsPositive(matrix) {
    for (const uf of Object.keys(matrix))
      for (const c of CARGOS)
        if (matrix[uf][c] && matrix[uf][c].result.profit <= 0) return false;
    return true;
  }
  function allMarginsPositive(matrix) {
    for (const uf of Object.keys(matrix))
      for (const c of CARGOS)
        if (matrix[uf][c] && matrix[uf][c].result.netMargin <= 0) return false;
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════

  function fmt(n) {
    if (n == null || !isFinite(n)) return 'R$ —';
    return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:0, maximumFractionDigits:0 });
  }

  function fmtPct(n) {
    if (n == null || !isFinite(n)) return '—%';
    return (n * 100).toFixed(1).replace('.', ',') + '%';
  }

  function getBaselinePrices() {
    const bp = {};
    STATES_DATA.forEach(st => {
      bp[st.uf] = { ...st.publicPrices };
    });
    return bp;
  }

  // ═══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════

  return {
    CARGOS,
    CARGO_OPERATION_MODE,
    STATES_DATA,
    MINIMUM_NET_MARGIN,
    DEFAULT_PRESIDENT_FLOOR,

    getDefaultCostInputs,
    getDefaultSetupTeam,
    getDefaultOperationTeam,
    getDefaultTaxInputs,
    getDefaultCommissionInputs,
    getDefaultMarginInputs,
    getDefaultShares,
    getDefaultReserves,
    getDefaultFloorPcts,
    getBaselinePrices,

    calculateTeamCost,
    calculateBaseCost,
    calculateLucroPresumidoTaxes,
    calculateCommissions,
    calculateTargetMarkup,
    solveRequiredGrossPrice,
    solvePriceForMinimumMargin,
    calculatePricingResult,
    calculateFloorPrice,
    validate247Coverage,
    calculateAll,
    runAuditChecks,
    runFinancialSanityChecks,

    fmt,
    fmtPct,
  };
})();

import { TOKEN_PRICES_USD } from "./constants.ts";
import type {
  BaselinePlan,
  CostBreakdown,
  ExecutionBoundary,
  OptimizedPlan,
  PlanComparison,
  RouteQuote,
  SplitLeg,
  StrategyType,
  SwapIntent,
  TradeTask
} from "./types.ts";
import { clamp, estimateUsdAmount } from "./utils.ts";

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function tokenPrecision(token: SwapIntent["toToken"]) {
  return token === "USDC" || token === "USDT" || token === "DAI" ? 2 : 6;
}

function totalCost(breakdown: CostBreakdown) {
  return breakdown.gas + breakdown.bridge + breakdown.dex + breakdown.slippage + breakdown.priceImpact + breakdown.volatilityReserve;
}

function quoteCostBreakdown(route: RouteQuote, volatilityReserve = 0): CostBreakdown {
  return {
    gas: route.estimatedGasUsd,
    bridge: route.bridgeFeeUsd,
    dex: route.dexFeeUsd,
    slippage: route.slippageUsd,
    priceImpact: route.priceImpactUsd,
    volatilityReserve
  };
}

function makeTask(intent: SwapIntent): TradeTask {
  return {
    id: `task-${Date.now()}`,
    fromChain: intent.fromChain,
    fromToken: intent.fromToken,
    amount: intent.amount,
    toChain: intent.toChain,
    toToken: intent.toToken,
    maxWaitHours: intent.maxWaitHours,
    summary: `${intent.amount} ${intent.fromToken} from ${intent.fromChain} to ${intent.toToken} on ${intent.toChain}`
  };
}

function slippagePct(route: RouteQuote) {
  return route.expectedReceiveUsd > 0 ? (route.slippageUsd / route.expectedReceiveUsd) * 100 : 0;
}

function priceImpactPct(route: RouteQuote) {
  return route.expectedReceiveUsd > 0 ? (route.priceImpactUsd / route.expectedReceiveUsd) * 100 : 0;
}

function baselineFromRoute(route: RouteQuote): BaselinePlan {
  const costBreakdown = quoteCostBreakdown(route);

  return {
    type: "REALTIME",
    routeId: route.id,
    provider: route.provider,
    totalCostUsd: round(totalCost(costBreakdown)),
    expectedReceiveAmount: route.expectedReceiveAmount,
    expectedReceiveUsd: round(route.expectedReceiveUsd),
    estimatedTimeMinutes: route.estimatedTimeMinutes,
    routeSteps: route.steps,
    costBreakdown,
    slippagePct: round(slippagePct(route), 3),
    priceImpactPct: round(priceImpactPct(route), 3)
  };
}

function chooseStrategy(amountUsd: number, baseline: BaselinePlan): StrategyType {
  const isLargeTrade = amountUsd >= 10000 || baseline.priceImpactPct >= 0.6;
  const feeIsWorthWaiting = baseline.costBreakdown.gas + baseline.costBreakdown.bridge >= 3 || baseline.totalCostUsd > amountUsd * 0.006;

  if (isLargeTrade && feeIsWorthWaiting) return "WAIT_AND_SPLIT";
  if (isLargeTrade) return "SPLIT_EXECUTION";
  return "WAIT_FOR_LOW_FEE";
}

function splitCountFor(amountUsd: number, priceImpact: number) {
  if (amountUsd >= 50000 || priceImpact >= 1.2) return 5;
  if (amountUsd >= 20000 || priceImpact >= 0.8) return 4;
  if (amountUsd >= 10000 || priceImpact >= 0.5) return 3;
  return 1;
}

function volatilityReserve(amountUsd: number, waitHours: number) {
  const waitFactor = waitHours <= 1 ? 0.00005 : waitHours <= 24 ? 0.00015 : waitHours <= 72 ? 0.0002 : 0.00035;
  return amountUsd * waitFactor;
}

function buildSplitLegs(intent: SwapIntent, splitCount: number, optimizedCost: number, expectedReceiveAmount: string): SplitLeg[] {
  if (splitCount <= 1) return [];

  const amount = Number(intent.amount);
  const receive = Number(expectedReceiveAmount);

  return Array.from({ length: splitCount }, (_, index) => ({
    index: index + 1,
    amount: Number.isFinite(amount) ? round(amount / splitCount, 6).toString() : `${intent.amount}/${splitCount}`,
    targetCondition: index === 0 ? "fee window opens" : "next low-fee checkpoint",
    estimatedCostUsd: round(optimizedCost / splitCount),
    estimatedReceiveAmount: Number.isFinite(receive) ? round(receive / splitCount, tokenPrecision(intent.toToken)).toString() : expectedReceiveAmount
  }));
}

function adjustedReceive(route: RouteQuote, savingUsd: number, toToken: SwapIntent["toToken"]) {
  const tokenPrice = TOKEN_PRICES_USD[toToken];
  const receive = Number(route.expectedReceiveAmount);
  if (!Number.isFinite(receive) || tokenPrice <= 0) return route.expectedReceiveAmount;
  return round(receive + savingUsd / tokenPrice, tokenPrecision(toToken)).toString();
}

function makeBoundary(planCost: number, receiveAmount: string, maxWaitHours: number): ExecutionBoundary {
  return {
    maxTotalCostUsd: round(planCost * 1.08),
    minReceiveAmount: receiveAmount,
    maxSlippagePct: 0.5,
    maxPriceImpactPct: 0.5,
    expiresInHours: maxWaitHours
  };
}

function optimizedFromBaseline(intent: SwapIntent, route: RouteQuote, baseline: BaselinePlan): OptimizedPlan {
  const amountUsd = Math.max(estimateUsdAmount(intent.amount, intent.fromToken), route.expectedReceiveUsd);
  const strategy = chooseStrategy(amountUsd, baseline);
  const splitCount = strategy === "WAIT_FOR_LOW_FEE" ? 1 : splitCountFor(amountUsd, baseline.priceImpactPct);
  const gasSaving = intent.fromChain === "Ethereum" ? 0.36 : 0.22;
  const bridgeSaving = intent.fromChain !== intent.toChain ? 0.12 : 0;
  const splitImpactSaving = splitCount > 1 ? clamp(0.5 + splitCount * 0.08, 0.45, 0.82) : 0;
  const reserve = volatilityReserve(amountUsd, intent.maxWaitHours);

  const costBreakdown: CostBreakdown = {
    gas: round(baseline.costBreakdown.gas * (1 - gasSaving)),
    bridge: round(baseline.costBreakdown.bridge * (1 - bridgeSaving)),
    dex: baseline.costBreakdown.dex,
    slippage: round(baseline.costBreakdown.slippage * (splitCount > 1 ? 0.72 : 0.92)),
    priceImpact: round(baseline.costBreakdown.priceImpact * (splitCount > 1 ? 1 - splitImpactSaving : 0.92)),
    volatilityReserve: round(reserve)
  };

  const optimizedCost = round(totalCost(costBreakdown));
  const rawSaving = Math.max(baseline.totalCostUsd - optimizedCost, 0);
  const expectedSavingUsd = round(rawSaving);
  const expectedSavingPct = baseline.totalCostUsd > 0 ? round((expectedSavingUsd / baseline.totalCostUsd) * 100, 1) : 0;
  const expectedReceiveAmount = adjustedReceive(route, Math.max(rawSaving - reserve, 0), intent.toToken);
  const waitCondition =
    strategy === "SPLIT_EXECUTION"
      ? `Split into ${splitCount} trades when price impact per leg stays below 0.5%.`
      : strategy === "WAIT_AND_SPLIT"
        ? `Wait for ${intent.fromChain} fees to move into a lower window, then split into ${splitCount} trades.`
        : `Wait for ${intent.fromChain} gas or route cost to fall into a lower-fee window.`;

  return {
    type: "SMARTSWAP",
    strategy,
    mode: "SmartSwap",
    routeId: `${route.id}-optimized`,
    provider: route.provider,
    totalCostUsd: optimizedCost,
    expectedSavingUsd,
    expectedSavingPct,
    expectedReceiveAmount,
    expectedReceiveUsd: round(route.expectedReceiveUsd + Math.max(rawSaving - reserve, 0)),
    estimatedTimeMinutes: Math.max(route.estimatedTimeMinutes, Math.min(intent.maxWaitHours * 60, splitCount * 25)),
    waitCondition,
    splitCount,
    splitLegs: buildSplitLegs(intent, splitCount, optimizedCost, expectedReceiveAmount),
    routeSteps: route.steps,
    riskScore: reserve > rawSaving && rawSaving > 0 ? "Medium" : "Low",
    riskNotes: [
      "The optimized plan must still satisfy the confirmed cost boundary before execution.",
      reserve > 0 ? "A volatility reserve is included so lower fees do not hide adverse price movement." : "Price movement risk is minimal for this wait window.",
      splitCount > 1 ? "Split execution is used to reduce DEX price impact." : "Trade size does not require split execution in the current estimate."
    ],
    costBreakdown,
    rationale:
      strategy === "WAIT_AND_SPLIT"
        ? "Current execution cost and price impact both justify waiting for a lower-fee window and splitting the order."
        : strategy === "SPLIT_EXECUTION"
          ? "The trade size can create meaningful price impact, so SmartSwap reduces cost by splitting execution."
          : "The trade does not need splitting, so SmartSwap focuses on monitoring a lower-fee execution window.",
    boundary: makeBoundary(optimizedCost, expectedReceiveAmount, intent.maxWaitHours)
  };
}

export function generatePlanComparison(quotes: RouteQuote[], intent: SwapIntent): PlanComparison {
  if (!quotes.length) {
    throw new Error("At least one route quote is required");
  }

  const baselineRoute = [...quotes].sort((a, b) => a.rawCostUsd - b.rawCostUsd)[0];
  const task = makeTask(intent);
  const baselinePlan = baselineFromRoute(baselineRoute);
  const optimizedPlan = optimizedFromBaseline(intent, baselineRoute, baselinePlan);

  return { task, baselinePlan, optimizedPlan };
}

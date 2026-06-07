import type { RiskScore, RouteQuote, SwapIntent } from "./types.ts";

export function scoreRisk(route: RouteQuote, intent: SwapIntent): { score: RiskScore; penalty: number; notes: string[] } {
  let points = 0;
  const notes: string[] = [];
  const bridgeSteps = route.steps.filter((step) => step.action === "bridge").length;
  const swapSteps = route.steps.filter((step) => step.action === "swap").length;

  if (route.steps.length > 2) {
    points += 2;
    notes.push("Multi-step routing increases failure and approval surface.");
  }

  if (bridgeSteps > 0) {
    points += 2;
    notes.push("Cross-chain bridge route introduces settlement and bridge contract risk.");
  }

  if (swapSteps > 1) {
    points += 1;
    notes.push("Multiple swaps may add slippage and route execution risk.");
  }

  if (route.slippageUsd + route.priceImpactUsd > route.expectedReceiveUsd * 0.01) {
    points += 2;
    notes.push("Estimated slippage or price impact is above 1% of received value.");
  }

  if (route.estimatedTimeMinutes > 45) {
    points += 1;
    notes.push("Longer arrival time makes final execution conditions less predictable.");
  }

  if (route.needsApproval) {
    points += 1;
    notes.push("Route requires token approval before execution.");
  }

  if (intent.riskPreference === "low" && points >= 3) {
    points += 1;
    notes.push("User selected low risk preference, so risk penalty is stricter.");
  }

  const score: RiskScore = points >= 5 ? "High" : points >= 3 ? "Medium" : "Low";
  const penalty = score === "High" ? 5 : score === "Medium" ? 2 : 0.5;

  if (!notes.length) notes.push("Route uses a simple path with limited execution surface.");

  return { score, penalty, notes };
}

import { CHAINS, TOKENS } from "./constants.ts";
import { buildMockQuotes } from "./mock.ts";
import type { ChainName, RouteQuote, RouteStep, SwapIntent, TokenSymbol } from "./types.ts";
import { fromTokenUnits, toTokenUnits } from "./utils.ts";

type LifiStep = {
  type?: string;
  tool?: string;
  action?: {
    fromChainId?: number;
    toChainId?: number;
    fromToken?: { symbol?: string; decimals?: number };
    toToken?: { symbol?: string; decimals?: number };
  };
  estimate?: {
    executionDuration?: number;
    gasCosts?: Array<{ amountUSD?: string }>;
    feeCosts?: Array<{ amountUSD?: string; name?: string }>;
    toAmount?: string;
    toAmountUSD?: string;
  };
};

type LifiRoute = {
  id?: string;
  steps?: LifiStep[];
  gasCostUSD?: string;
  fromAmountUSD?: string;
  toAmountUSD?: string;
  toAmount?: string;
};

type LifiResponse = {
  routes?: LifiRoute[];
};

const chainById = Object.values(CHAINS).reduce<Record<number, ChainName>>((acc, chain) => {
  acc[chain.id] = chain.name;
  return acc;
}, {});

function asToken(symbol?: string): TokenSymbol {
  const upper = symbol?.toUpperCase();
  if (upper === "ETH" || upper === "USDC" || upper === "USDT" || upper === "WBTC" || upper === "DAI" || upper === "BNB" || upper === "AVAX") {
    return upper;
  }
  return "USDC";
}

function sumUsd(costs?: Array<{ amountUSD?: string }>) {
  return (costs ?? []).reduce((total, cost) => total + Number(cost.amountUSD ?? 0), 0);
}

function mapStep(step: LifiStep, intent: SwapIntent): RouteStep {
  const fromChain = chainById[step.action?.fromChainId ?? 0] ?? intent.fromChain;
  const toChain = chainById[step.action?.toChainId ?? 0] ?? intent.toChain;
  const fromToken = asToken(step.action?.fromToken?.symbol) ?? intent.fromToken;
  const toToken = asToken(step.action?.toToken?.symbol) ?? intent.toToken;
  const action = fromChain !== toChain ? "bridge" : fromToken !== toToken ? "swap" : "transfer";
  const provider = step.tool ?? "LI.FI";

  return {
    action,
    fromChain,
    toChain,
    fromToken,
    toToken,
    provider,
    description:
      action === "bridge"
        ? `Bridge ${fromToken} from ${fromChain} to ${toChain} via ${provider}.`
        : action === "swap"
          ? `Swap ${fromToken} to ${toToken} on ${fromChain} via ${provider}.`
          : `Transfer ${fromToken} on ${fromChain} via ${provider}.`
  };
}

export function normalizeLifiRoutes(data: LifiResponse, intent: SwapIntent): RouteQuote[] {
  return (data.routes ?? []).slice(0, 6).map((route, index) => {
    const steps = route.steps?.length ? route.steps.map((step) => mapStep(step, intent)) : buildMockQuotes(intent)[0].steps;
    const gas = (route.steps ?? []).reduce((total, step) => total + sumUsd(step.estimate?.gasCosts), 0);
    const fees = (route.steps ?? []).reduce((total, step) => total + sumUsd(step.estimate?.feeCosts), 0);
    const bridgeFee = steps.some((step) => step.action === "bridge") ? fees * 0.75 : 0;
    const dexFee = Math.max(fees - bridgeFee, 0);
    const toDecimals = TOKENS[intent.toChain][intent.toToken].decimals;
    const lastStep = route.steps?.[route.steps.length - 1];
    const toAmount = lastStep?.estimate?.toAmount ?? route.toAmount ?? "0";
    const toAmountUsd = Number(lastStep?.estimate?.toAmountUSD ?? route.toAmountUSD ?? 0);
    const fromAmountUsd = Number(route.fromAmountUSD ?? 0);
    const spread = Math.max(fromAmountUsd - toAmountUsd - gas - fees, 0);

    return {
      id: route.id ?? `lifi-${index}`,
      provider: steps.map((step) => step.provider).join(" + ") || "LI.FI",
      source: "lifi",
      steps,
      estimatedGasUsd: gas || Number(route.gasCostUSD ?? 0),
      bridgeFeeUsd: bridgeFee,
      dexFeeUsd: dexFee,
      slippageUsd: spread * 0.7,
      priceImpactUsd: spread * 0.3,
      expectedReceiveAmount: fromTokenUnits(toAmount, toDecimals, intent.toToken === "USDC" || intent.toToken === "USDT" || intent.toToken === "DAI" ? 2 : 6),
      expectedReceiveUsd: toAmountUsd,
      estimatedTimeMinutes: Math.ceil(
        (route.steps ?? []).reduce((total, step) => total + (step.estimate?.executionDuration ?? 120), 0) / 60
      ),
      needsApproval: TOKENS[intent.fromChain][intent.fromToken].address !== "0x0000000000000000000000000000000000000000",
      rawCostUsd: gas + fees + spread
    };
  });
}

export async function fetchLifiQuotes(intent: SwapIntent): Promise<RouteQuote[]> {
  const from = TOKENS[intent.fromChain][intent.fromToken];
  const to = TOKENS[intent.toChain][intent.toToken];
  const url = new URL("https://li.quest/v1/advanced/routes");
  const body = {
    fromChainId: CHAINS[intent.fromChain].id,
    fromAmount: toTokenUnits(intent.amount, from.decimals),
    fromTokenAddress: from.address,
    toChainId: CHAINS[intent.toChain].id,
    toTokenAddress: to.address,
    options: {
      order: intent.priority === "fastest" ? "FASTEST" : "RECOMMENDED",
      maxPriceImpact: 0.15,
      allowSwitchChain: false
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.LIFI_API_KEY ? { "x-lifi-api-key": process.env.LIFI_API_KEY } : {})
    },
    body: JSON.stringify(body),
    next: { revalidate: 30 },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`LI.FI returned ${response.status}`);
  }

  const data = (await response.json()) as LifiResponse;
  const quotes = normalizeLifiRoutes(data, intent);
  if (!quotes.length) {
    throw new Error("LI.FI did not return a supported route");
  }
  return quotes;
}

import type { ChainName, Priority, RiskPreference, SwapIntent, TokenSymbol } from "./types.ts";

const chainAliases: Record<string, ChainName> = {
  ethereum: "Ethereum",
  eth: "Ethereum",
  mainnet: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  arb: "Arbitrum",
  optimism: "Optimism",
  polygon: "Polygon",
  matic: "Polygon",
  bsc: "BNB Chain",
  bnb: "BNB Chain",
  avalanche: "Avalanche",
  avax: "Avalanche"
};

const tokenAliases: Record<string, TokenSymbol> = {
  eth: "ETH",
  weth: "ETH",
  usdc: "USDC",
  usdt: "USDT",
  wbtc: "WBTC",
  dai: "DAI",
  bnb: "BNB",
  avax: "AVAX"
};

function findChains(input: string) {
  const lowered = input.toLowerCase();
  return Object.entries(chainAliases)
    .filter(([alias]) => lowered.includes(alias))
    .map(([, chain]) => chain)
    .filter((chain, index, arr) => arr.indexOf(chain) === index);
}

function findTokens(input: string) {
  return Array.from(input.matchAll(/\b(ETH|WETH|USDC|USDT|WBTC|DAI|BNB|AVAX)\b/gi)).map((match) => tokenAliases[match[1].toLowerCase()]);
}

function parsePriority(input: string): Priority {
  const lowered = input.toLowerCase();
  if (lowered.includes("fast") || input.includes("快")) return "fastest";
  if (lowered.includes("balanced") || input.includes("平衡")) return "balanced";
  return "lowest_cost";
}

function parseRisk(input: string): RiskPreference {
  const lowered = input.toLowerCase();
  if (lowered.includes("low risk") || input.includes("低风险")) return "low";
  if (lowered.includes("high risk") || input.includes("高风险")) return "high";
  return "medium";
}

export function parseIntentText(input: string): Partial<SwapIntent> {
  const chains = findChains(input);
  const tokens = findTokens(input);
  const amountMatch = input.match(/(\d+(?:\.\d+)?)(?=\s*(ETH|USDC|USDT|WBTC|DAI|BNB|AVAX|eth|usdc|usdt|wbtc|dai|bnb|avax)?)/);
  const hourMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|小时|h)\b/i);

  return {
    fromChain: chains[0],
    toChain: chains[1],
    fromToken: tokens[0],
    toToken: tokens[1],
    amount: amountMatch?.[1],
    maxWaitHours: hourMatch ? Number(hourMatch[1]) : undefined,
    priority: parsePriority(input),
    riskPreference: parseRisk(input)
  };
}

export function normalizeIntent(input: Partial<SwapIntent>): SwapIntent {
  const intent: SwapIntent = {
    fromChain: input.fromChain ?? "Ethereum",
    fromToken: input.fromToken ?? "USDC",
    amount: input.amount && Number(input.amount) > 0 ? input.amount : "100",
    toChain: input.toChain ?? "Base",
    toToken: input.toToken ?? "ETH",
    maxWaitHours: input.maxWaitHours && input.maxWaitHours > 0 ? input.maxWaitHours : 24,
    priority: input.priority ?? "lowest_cost",
    riskPreference: input.riskPreference ?? "medium"
  };

  return intent;
}

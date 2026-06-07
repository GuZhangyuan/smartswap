import type { ChainName, SwapIntent, TokenSymbol } from "./types.ts";

export type AgentDraft = Partial<SwapIntent>;

export type AgentParsedInput = AgentDraft & {
  confirmed?: boolean;
  mentionedChains: ChainName[];
};

const defaultBalances: Record<TokenSymbol, string> = {
  ETH: "2.86",
  USDC: "1240.50",
  USDT: "890.20",
  WBTC: "0.08",
  DAI: "760.00",
  BNB: "4.20",
  AVAX: "38.00"
};

export const AVAILABLE_BALANCES: Record<ChainName, Record<TokenSymbol, string>> = {
  Ethereum: defaultBalances,
  Base: { ...defaultBalances, ETH: "0.42", USDC: "630.00", USDT: "310.40" },
  Arbitrum: { ...defaultBalances, ETH: "0.78", USDC: "980.00", USDT: "420.10" },
  Optimism: { ...defaultBalances, ETH: "0.36", USDC: "520.00" },
  Polygon: { ...defaultBalances, USDC: "430.00", DAI: "610.00" },
  "BNB Chain": { ...defaultBalances, BNB: "7.40", USDT: "1180.00" },
  Avalanche: { ...defaultBalances, AVAX: "52.00", USDC: "740.00" }
};

function hasSourceChainCue(text: string) {
  return /from|source|源|来自|主网的|上的|上面|on\s+(ethereum|base|arbitrum|optimism|polygon|bnb|avalanche)/i.test(text);
}

function hasTargetChainCue(text: string) {
  return /to|target|目标|转到|转去|换到|到\s*(ethereum|base|arbitrum|optimism|polygon|bnb|avalanche)|网络/i.test(text);
}

export function parseAgentInput(text: string): AgentParsedInput {
  const normalized = text.toLowerCase();
  const tokenMatches = Array.from(text.matchAll(/\b(ETH|WETH|USDC|USDT|WBTC|DAI|BNB|AVAX)\b/gi)).map((match) =>
    match[1].toUpperCase() === "WETH" ? "ETH" : (match[1].toUpperCase() as TokenSymbol)
  );
  const mentionedChains: ChainName[] = [];

  if (/ethereum|mainnet|主网|以太坊/i.test(text)) mentionedChains.push("Ethereum");
  if (/base/i.test(text)) mentionedChains.push("Base");
  if (/arbitrum|arb/i.test(text)) mentionedChains.push("Arbitrum");
  if (/optimism|op mainnet|op\b/i.test(text)) mentionedChains.push("Optimism");
  if (/polygon|matic/i.test(text)) mentionedChains.push("Polygon");
  if (/bnb chain|bsc|binance/i.test(text)) mentionedChains.push("BNB Chain");
  if (/avalanche|avax/i.test(text)) mentionedChains.push("Avalanche");

  const amountCandidates = Array.from(text.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*(枚|个|颗|eth|usdc|usdt|wbtc|dai|bnb|avax|小时|小時|h|hour|hours|天|day|days)?/gi));
  const amountMatch =
    amountCandidates.find((match) => {
      const unit = match[2]?.toLowerCase();
      return unit !== "小时" && unit !== "小時" && unit !== "h" && unit !== "hour" && unit !== "hours" && unit !== "天" && unit !== "day" && unit !== "days";
    }) ?? text.match(/(?:convert|swap|exchange)\s+(\d+(?:\.\d+)?)/i);
  const waitMatch = text.match(/(\d+(?:\.\d+)?)\s*(小时|小時|h|hour|hours|天|day|days)/i);
  const waitValue = waitMatch ? Number(waitMatch[1]) : undefined;
  const waitUnit = waitMatch?.[2].toLowerCase();
  const maxWaitHours =
    waitValue === undefined || !Number.isFinite(waitValue)
      ? undefined
      : Math.min(Math.max(Math.round(waitUnit === "天" || waitUnit === "day" || waitUnit === "days" ? waitValue * 24 : waitValue), 1), 168);

  return {
    confirmed: /确认|确定|没问题|可以|confirm|yes|ok\b/i.test(normalized),
    fromToken: tokenMatches[0],
    toToken: tokenMatches[1],
    amount: amountMatch?.[1],
    maxWaitHours,
    mentionedChains
  };
}

export function mergeAgentDraft(current: AgentDraft, parsed: AgentParsedInput, originalText: string): AgentDraft {
  const next: AgentDraft = {
    ...current,
    fromToken: parsed.fromToken ?? current.fromToken,
    toToken: parsed.toToken ?? current.toToken,
    amount: parsed.amount ?? current.amount,
    maxWaitHours: parsed.maxWaitHours ?? current.maxWaitHours
  };

  if (parsed.mentionedChains.length >= 2) {
    next.fromChain = parsed.mentionedChains[0];
    next.toChain = parsed.mentionedChains[1];
    return next;
  }

  const [singleChain] = parsed.mentionedChains;
  if (!singleChain) return next;

  const sourceCue = hasSourceChainCue(originalText);
  const targetCue = hasTargetChainCue(originalText);

  if (targetCue && !sourceCue) {
    next.toChain = singleChain;
    return next;
  }

  if (sourceCue && !targetCue) {
    next.fromChain = singleChain;
    return next;
  }

  if (current.fromToken && current.toToken) {
    next.toChain = singleChain;
  } else {
    next.fromChain = singleChain;
  }

  return next;
}

export function completeIntent(draft: AgentDraft): SwapIntent | null {
  if (!draft.fromToken || !draft.toToken || !draft.amount || !draft.toChain) return null;

  return {
    fromChain: draft.fromChain ?? "Ethereum",
    fromToken: draft.fromToken,
    amount: draft.amount,
    toChain: draft.toChain,
    toToken: draft.toToken,
    maxWaitHours: draft.maxWaitHours ?? 24,
    priority: draft.priority ?? "lowest_cost",
    riskPreference: draft.riskPreference ?? "medium"
  };
}

export function summarizeIntent(intent: SwapIntent, language: "en" | "zh") {
  if (language === "zh") {
    return `${intent.amount} 枚 ${intent.fromChain} 主网的 ${intent.fromToken} 交换为 ${intent.toChain} 网络的 ${intent.toToken}`;
  }

  return `${intent.amount} ${intent.fromToken} on ${intent.fromChain} to ${intent.toToken} on ${intent.toChain}`;
}

export function nextAgentPrompt(draft: AgentDraft, language: "en" | "zh") {
  const fromChain = draft.fromChain ?? "Ethereum";
  const balance = draft.fromToken ? AVAILABLE_BALANCES[fromChain][draft.fromToken] : undefined;

  if (!draft.fromToken || !draft.toToken) {
    return language === "zh"
      ? "请告诉我你想从哪种币换到哪种币，例如：我要把 ETH 换成 USDT。"
      : "Tell me which token you want to swap from and to, for example: swap ETH to USDT.";
  }

  if (!draft.amount || !draft.toChain) {
    if (language === "zh") {
      return `您的可用 ${draft.fromToken} 为 ${balance ?? "--"}。请告诉我需要将多少 ${fromChain} 主网的 ${draft.fromToken} 交换为哪个网络的 ${draft.toToken}。`;
    }
    return `Your available ${draft.fromToken} is ${balance ?? "--"}. Tell me how much ${draft.fromToken} on ${fromChain} you want to swap and the target network for ${draft.toToken}.`;
  }

  const finalIntent = completeIntent(draft);
  if (!finalIntent) return "";

  return language === "zh"
    ? `好的，您需要将 ${summarizeIntent(finalIntent, language)}。参数已完整，可以输入“确认”完成任务确认，或直接生成方案。`
    : `Got it. You want to swap ${summarizeIntent(finalIntent, language)}. The task is complete; type "confirm" to confirm it, or generate a plan directly.`;
}

import type { RouteQuote, SwapIntent } from "./types.ts";
import { TOKEN_PRICES_USD, TOKENS } from "./constants.ts";
import { estimateUsdAmount } from "./utils.ts";

function gasCost(chain: SwapIntent["fromChain"]) {
  if (chain === "Ethereum") return 8.6;
  if (chain === "Arbitrum" || chain === "Base" || chain === "Optimism") return 0.34;
  if (chain === "Polygon" || chain === "BNB Chain") return 0.18;
  return 0.42;
}

function bridgeCost(chain: SwapIntent["fromChain"]) {
  if (chain === "Ethereum") return 4.8;
  if (chain === "Avalanche") return 1.8;
  return 1.25;
}

function receiveAmount(receiveUsd: number, token: SwapIntent["toToken"], boost = 1) {
  const price = TOKEN_PRICES_USD[token] || 1;
  const amount = (receiveUsd * boost) / price;
  return amount.toFixed(token === "USDC" || token === "USDT" || token === "DAI" ? 2 : 6).replace(/\.?0+$/, "");
}

export function buildMockQuotes(intent: SwapIntent): RouteQuote[] {
  const amountUsd = Math.max(estimateUsdAmount(intent.amount, intent.fromToken), 20);
  const crossChain = intent.fromChain !== intent.toChain;
  const sameToken = intent.fromToken === intent.toToken;
  const bridgeBase = crossChain ? bridgeCost(intent.fromChain) : 0;
  const gasBase = gasCost(intent.fromChain);
  const receiveUsd = amountUsd * (intent.toToken === "USDC" || intent.toToken === "USDT" || intent.toToken === "DAI" ? 0.995 : 0.985);
  const fromIsNative = TOKENS[intent.fromChain][intent.fromToken].address === "0x0000000000000000000000000000000000000000";

  return [
    {
      id: "mock-fast",
      provider: "LI.FI Fast Route",
      source: "mock",
      steps: [
        {
          action: crossChain ? "bridge" : "swap",
          fromChain: intent.fromChain,
          toChain: crossChain ? intent.toChain : intent.fromChain,
          fromToken: intent.fromToken,
          toToken: sameToken ? intent.toToken : intent.fromToken,
          provider: crossChain ? "Across" : "Uniswap",
          description: crossChain
            ? `Bridge ${intent.fromToken} from ${intent.fromChain} to ${intent.toChain}.`
            : `Swap ${intent.fromToken} to ${intent.toToken} on ${intent.fromChain}.`
        },
        ...(sameToken
          ? []
          : [
              {
                action: "swap" as const,
                fromChain: intent.toChain,
                toChain: intent.toChain,
                fromToken: intent.fromToken,
                toToken: intent.toToken,
                provider: intent.toChain === "Base" ? "Aerodrome" : "Uniswap",
                description: `Swap ${intent.fromToken} to ${intent.toToken} on ${intent.toChain}.`
              }
            ])
      ],
      estimatedGasUsd: gasBase,
      bridgeFeeUsd: bridgeBase,
      dexFeeUsd: sameToken ? 0 : amountUsd * 0.003,
      slippageUsd: amountUsd * 0.0045,
      priceImpactUsd: amountUsd * 0.001,
      expectedReceiveAmount: receiveAmount(receiveUsd, intent.toToken),
      expectedReceiveUsd: receiveUsd,
      estimatedTimeMinutes: crossChain ? 8 : 2,
      needsApproval: !fromIsNative,
      rawCostUsd: gasBase + bridgeBase + amountUsd * 0.0085
    },
    {
      id: "mock-balanced",
      provider: "LI.FI Balanced Route",
      source: "mock",
      steps: [
        {
          action: sameToken ? "bridge" : "swap",
          fromChain: intent.fromChain,
          toChain: sameToken ? intent.toChain : intent.fromChain,
          fromToken: intent.fromToken,
          toToken: sameToken ? intent.toToken : intent.toToken,
          provider: sameToken ? "Stargate" : "Uniswap",
          description: sameToken
            ? `Bridge ${intent.fromToken} directly to ${intent.toChain}.`
            : `Swap ${intent.fromToken} to ${intent.toToken} before bridging.`
        },
        ...(crossChain && !sameToken
          ? [
              {
                action: "bridge" as const,
                fromChain: intent.fromChain,
                toChain: intent.toChain,
                fromToken: intent.toToken,
                toToken: intent.toToken,
                provider: "Stargate",
                description: `Bridge ${intent.toToken} from ${intent.fromChain} to ${intent.toChain}.`
              }
            ]
          : [])
      ],
      estimatedGasUsd: gasBase * 0.76,
      bridgeFeeUsd: bridgeBase * 0.82,
      dexFeeUsd: sameToken ? 0 : amountUsd * 0.0022,
      slippageUsd: amountUsd * 0.0025,
      priceImpactUsd: amountUsd * 0.0008,
      expectedReceiveAmount: receiveAmount(receiveUsd, intent.toToken, 1.004),
      expectedReceiveUsd: receiveUsd * 1.004,
      estimatedTimeMinutes: crossChain ? 24 : 5,
      needsApproval: !fromIsNative,
      rawCostUsd: gasBase * 0.76 + bridgeBase * 0.82 + amountUsd * 0.0055
    }
  ];
}

import type { ChainName, TokenSymbol } from "@/lib/types";

type TokenMeta = { symbol: TokenSymbol; address: string; decimals: number };

const NATIVE = "0x0000000000000000000000000000000000000000";

export const CHAINS: Record<ChainName, { id: number; name: ChainName }> = {
  Ethereum: { id: 1, name: "Ethereum" },
  Base: { id: 8453, name: "Base" },
  Arbitrum: { id: 42161, name: "Arbitrum" },
  Optimism: { id: 10, name: "Optimism" },
  Polygon: { id: 137, name: "Polygon" },
  "BNB Chain": { id: 56, name: "BNB Chain" },
  Avalanche: { id: 43114, name: "Avalanche" }
};

export const TOKEN_SYMBOLS: TokenSymbol[] = ["ETH", "USDC", "USDT", "WBTC", "DAI", "BNB", "AVAX"];

function token(symbol: TokenSymbol, address: string, decimals: number): TokenMeta {
  return { symbol, address, decimals };
}

function tokenSet(overrides: Partial<Record<TokenSymbol, TokenMeta>>): Record<TokenSymbol, TokenMeta> {
  return {
    ETH: token("ETH", NATIVE, 18),
    USDC: token("USDC", NATIVE, 6),
    USDT: token("USDT", NATIVE, 6),
    WBTC: token("WBTC", NATIVE, 8),
    DAI: token("DAI", NATIVE, 18),
    BNB: token("BNB", NATIVE, 18),
    AVAX: token("AVAX", NATIVE, 18),
    ...overrides
  };
}

export const TOKENS: Record<ChainName, Record<TokenSymbol, TokenMeta>> = {
  Ethereum: tokenSet({
    ETH: token("ETH", NATIVE, 18),
    USDC: token("USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6),
    USDT: token("USDT", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6),
    WBTC: token("WBTC", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 8),
    DAI: token("DAI", "0x6B175474E89094C44Da98b954EedeAC495271d0F", 18),
    BNB: token("BNB", "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", 18),
    AVAX: token("AVAX", "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3", 18)
  }),
  Base: tokenSet({
    ETH: token("ETH", NATIVE, 18),
    USDC: token("USDC", "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", 6),
    USDT: token("USDT", "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", 6),
    WBTC: token("WBTC", "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c", 8),
    DAI: token("DAI", "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", 18)
  }),
  Arbitrum: tokenSet({
    ETH: token("ETH", NATIVE, 18),
    USDC: token("USDC", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 6),
    USDT: token("USDT", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 6),
    WBTC: token("WBTC", "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", 8),
    DAI: token("DAI", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", 18)
  }),
  Optimism: tokenSet({
    ETH: token("ETH", NATIVE, 18),
    USDC: token("USDC", "0x0b2C639c533813f4Aa9D7837CAF62653d097Ff85", 6),
    USDT: token("USDT", "0x94b008aD8eA3B5F39CcF73aE99E7E2AbE0008C9", 6),
    WBTC: token("WBTC", "0x68f180fcCe6836688e9084f035309E29Bf0A2095", 8),
    DAI: token("DAI", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", 18)
  }),
  Polygon: tokenSet({
    ETH: token("ETH", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", 18),
    USDC: token("USDC", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", 6),
    USDT: token("USDT", "0xc2132D05D31c914a87C6611C10748AaCbA5dE8F", 6),
    WBTC: token("WBTC", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", 8),
    DAI: token("DAI", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", 18)
  }),
  "BNB Chain": tokenSet({
    ETH: token("ETH", "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", 18),
    USDC: token("USDC", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 18),
    USDT: token("USDT", "0x55d398326f99059fF775485246999027B3197955", 18),
    WBTC: token("WBTC", "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", 18),
    DAI: token("DAI", "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", 18),
    BNB: token("BNB", NATIVE, 18),
    AVAX: token("AVAX", "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", 18)
  }),
  Avalanche: tokenSet({
    ETH: token("ETH", "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", 18),
    USDC: token("USDC", "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", 6),
    USDT: token("USDT", "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", 6),
    WBTC: token("WBTC", "0x50b7545627a5162F82A992c33b87aDc75187B218", 8),
    DAI: token("DAI", "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", 18),
    AVAX: token("AVAX", NATIVE, 18)
  })
};

export const TOKEN_PRICES_USD: Record<TokenSymbol, number> = {
  ETH: 3800,
  USDC: 1,
  USDT: 1,
  WBTC: 68000,
  DAI: 1,
  BNB: 620,
  AVAX: 34
};

export const EXAMPLE_INTENTS = [
  {
    label: "USDC to ETH on Base",
    prompt: "把 Ethereum 上的 100 USDC 换成 Base 上的 ETH，24 小时内完成，手续费越低越好。",
    intent: {
      fromChain: "Ethereum",
      fromToken: "USDC",
      amount: "100",
      toChain: "Base",
      toToken: "ETH",
      maxWaitHours: 24,
      priority: "lowest_cost",
      riskPreference: "medium"
    }
  },
  {
    label: "Arbitrum stablecoin move",
    prompt: "Move 500 USDT from Ethereum to Arbitrum USDC in 12 hours with balanced risk.",
    intent: {
      fromChain: "Ethereum",
      fromToken: "USDT",
      amount: "500",
      toChain: "Arbitrum",
      toToken: "USDC",
      maxWaitHours: 12,
      priority: "balanced",
      riskPreference: "low"
    }
  },
  {
    label: "Base ETH to mainnet",
    prompt: "Swap 0.05 ETH on Base to Ethereum USDC within 8 hours, cheapest route preferred.",
    intent: {
      fromChain: "Base",
      fromToken: "ETH",
      amount: "0.05",
      toChain: "Ethereum",
      toToken: "USDC",
      maxWaitHours: 8,
      priority: "lowest_cost",
      riskPreference: "medium"
    }
  }
] as const;

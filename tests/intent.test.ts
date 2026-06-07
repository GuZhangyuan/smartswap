import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIntent, parseIntentText } from "../lib/intent.ts";

test("intent parser parses a Chinese cross-chain swap request", () => {
    const parsed = normalizeIntent(parseIntentText("把 Ethereum 上的 100 USDC 换成 Base 上的 ETH，24 小时内完成，手续费越低越好。"));

    assert.deepEqual(
      {
        fromChain: parsed.fromChain,
        fromToken: parsed.fromToken,
        amount: parsed.amount,
        toChain: parsed.toChain,
        toToken: parsed.toToken,
        maxWaitHours: parsed.maxWaitHours,
        priority: parsed.priority
      },
      {
      fromChain: "Ethereum",
      fromToken: "USDC",
      amount: "100",
      toChain: "Base",
      toToken: "ETH",
      maxWaitHours: 24,
      priority: "lowest_cost"
      }
    );
  });

test("intent parser parses an English stablecoin route request", () => {
    const parsed = normalizeIntent(parseIntentText("Move 500 USDT from Ethereum to Arbitrum USDC in 12 hours with balanced risk."));

    assert.equal(parsed.fromChain, "Ethereum");
    assert.equal(parsed.toChain, "Arbitrum");
    assert.equal(parsed.fromToken, "USDT");
    assert.equal(parsed.toToken, "USDC");
    assert.equal(parsed.maxWaitHours, 12);
    assert.equal(parsed.priority, "balanced");
  });

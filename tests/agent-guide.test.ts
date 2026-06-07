import test from "node:test";
import assert from "node:assert/strict";
import { completeIntent, mergeAgentDraft, nextAgentPrompt, parseAgentInput } from "../lib/agent-guide.ts";

test("agent guide keeps Ethereum as source when user later chooses Base target network", () => {
  let draft = mergeAgentDraft({}, parseAgentInput("我要把我的ETH换成USDT"), "我要把我的ETH换成USDT");

  assert.equal(draft.fromToken, "ETH");
  assert.equal(draft.toToken, "USDT");
  assert.match(nextAgentPrompt(draft, "zh"), /可用 ETH/);

  draft = mergeAgentDraft(draft, parseAgentInput("我需要转化1.4枚，我需要转到Base网络"), "我需要转化1.4枚，我需要转到Base网络");
  const intent = completeIntent(draft);

  assert.deepEqual(intent, {
    fromChain: "Ethereum",
    fromToken: "ETH",
    amount: "1.4",
    toChain: "Base",
    toToken: "USDT",
    maxWaitHours: 24,
    priority: "lowest_cost",
    riskPreference: "medium"
  });
  assert.match(nextAgentPrompt(draft, "zh"), /输入“确认”完成任务确认/);
  assert.match(nextAgentPrompt(draft, "zh"), /直接生成方案/);
});

test("agent guide can parse explicit source and target chains in one message", () => {
  const draft = mergeAgentDraft({}, parseAgentInput("Swap 100 USDC from Ethereum to Arbitrum USDT"), "Swap 100 USDC from Ethereum to Arbitrum USDT");
  const intent = completeIntent(draft);

  assert.equal(intent?.fromChain, "Ethereum");
  assert.equal(intent?.toChain, "Arbitrum");
  assert.equal(intent?.fromToken, "USDC");
  assert.equal(intent?.toToken, "USDT");
  assert.equal(intent?.amount, "100");
});

test("agent guide parses wait window and supports chat confirmation", () => {
  const draft = mergeAgentDraft(
    {},
    parseAgentInput("把 1.4 ETH 从 Ethereum 换成 Base 的 USDT，48 小时内完成"),
    "把 1.4 ETH 从 Ethereum 换成 Base 的 USDT，48 小时内完成"
  );
  const intent = completeIntent(draft);

  assert.equal(intent?.maxWaitHours, 48);
  assert.match(nextAgentPrompt(draft, "zh"), /输入“确认”完成任务确认/);
  assert.equal(parseAgentInput("确认").confirmed, true);
});

test("agent guide does not treat wait window as trade amount", () => {
  const draft = mergeAgentDraft(
    {},
    parseAgentInput("48小时内把 1.4 ETH 从 Ethereum 换成 Base 的 USDT"),
    "48小时内把 1.4 ETH 从 Ethereum 换成 Base 的 USDT"
  );
  const intent = completeIntent(draft);

  assert.equal(intent?.amount, "1.4");
  assert.equal(intent?.maxWaitHours, 48);
});

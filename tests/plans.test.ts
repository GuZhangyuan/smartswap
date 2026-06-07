import test from "node:test";
import assert from "node:assert/strict";
import { delegateTask, simulateExecution } from "../lib/execution.ts";
import { buildMockQuotes } from "../lib/mock.ts";
import { generatePlanComparison } from "../lib/plans.ts";
import type { SwapIntent } from "../lib/types.ts";

const smallIntent: SwapIntent = {
  fromChain: "Ethereum",
  fromToken: "USDC",
  amount: "100",
  toChain: "Base",
  toToken: "ETH",
  maxWaitHours: 24,
  priority: "lowest_cost",
  riskPreference: "medium"
};

const largeIntent: SwapIntent = {
  fromChain: "Ethereum",
  fromToken: "ETH",
  amount: "12",
  toChain: "Base",
  toToken: "USDT",
  maxWaitHours: 48,
  priority: "lowest_cost",
  riskPreference: "medium"
};

test("plan generator creates realtime baseline and SmartSwap optimized plan", () => {
  const comparison = generatePlanComparison(buildMockQuotes(smallIntent), smallIntent);

  assert.equal(comparison.baselinePlan.type, "REALTIME");
  assert.equal(comparison.optimizedPlan.type, "SMARTSWAP");
  assert.equal(comparison.optimizedPlan.strategy, "WAIT_FOR_LOW_FEE");
  assert.ok(comparison.optimizedPlan.boundary.maxTotalCostUsd > 0);
  assert.ok(comparison.optimizedPlan.expectedSavingUsd > 0);
});

test("large trade triggers split-aware SmartSwap plan", () => {
  const comparison = generatePlanComparison(buildMockQuotes(largeIntent), largeIntent);

  assert.ok(["SPLIT_EXECUTION", "WAIT_AND_SPLIT"].includes(comparison.optimizedPlan.strategy));
  assert.ok(comparison.optimizedPlan.splitCount > 1);
  assert.equal(comparison.optimizedPlan.splitLegs.length, comparison.optimizedPlan.splitCount);
  assert.ok(comparison.optimizedPlan.expectedSavingUsd > 0);
});

test("delegated execution can move to simulated execution report", () => {
  const comparison = generatePlanComparison(buildMockQuotes(largeIntent), largeIntent);
  const delegatedTask = delegateTask(comparison);
  const report = simulateExecution(delegatedTask);

  assert.equal(delegatedTask.status, "Monitoring");
  assert.equal(report.status, "Executed");
  assert.ok(report.savingVsBaselineUsd >= 0);
  assert.ok(report.splitRecords.length >= 1);
});

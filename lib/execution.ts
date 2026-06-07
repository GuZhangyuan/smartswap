import type { DelegatedTask, ExecutionReport, PlanComparison, SplitLeg } from "./types.ts";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function delegateTask(comparison: PlanComparison): DelegatedTask {
  return {
    id: id("delegated"),
    task: comparison.task,
    baselinePlan: comparison.baselinePlan,
    optimizedPlan: comparison.optimizedPlan,
    status: "Monitoring",
    createdAt: new Date().toISOString()
  };
}

export function simulateExecution(delegatedTask: DelegatedTask): ExecutionReport {
  const plan = delegatedTask.optimizedPlan;
  const splitRecords: SplitLeg[] =
    plan.splitLegs.length > 0
      ? plan.splitLegs
      : [
          {
            index: 1,
            amount: delegatedTask.task.amount,
            targetCondition: plan.waitCondition,
            estimatedCostUsd: plan.totalCostUsd,
            estimatedReceiveAmount: plan.expectedReceiveAmount
          }
        ];

  const actualCost = Number((plan.totalCostUsd * 0.96).toFixed(2));
  const saving = Math.max(Number((delegatedTask.baselinePlan.totalCostUsd - actualCost).toFixed(2)), 0);

  return {
    delegatedTaskId: delegatedTask.id,
    status: "Executed",
    executedAt: new Date().toISOString(),
    strategy: plan.strategy,
    actualReceiveAmount: plan.expectedReceiveAmount,
    actualTotalCostUsd: actualCost,
    savingVsBaselineUsd: saving,
    splitRecords,
    summary: `Executed with ${plan.strategy}. Saved $${saving.toFixed(2)} versus realtime baseline.`
  };
}

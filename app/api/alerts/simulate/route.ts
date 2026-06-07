import { NextResponse } from "next/server";
import type { AlertSimulation, ExecutionPlan } from "@/lib/types";
import { formatUsd } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { plan?: ExecutionPlan };
    const plan = body.plan;
    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    const triggered = plan.mode === "SmartSwap";
    const simulation: AlertSimulation = {
      status: triggered ? "triggered" : "monitoring",
      currentCondition: `Current route cost is ${formatUsd(plan.totalCostUsd)} with ${plan.riskScore.toLowerCase()} risk.`,
      targetCondition: plan.waitCondition,
      message: triggered
        ? `Monitoring found a lower-cost window. Estimated saving: ${formatUsd(plan.expectedSavingUsd)}.`
        : "Monitoring started. This route is ready now, but no slow-window trigger is attached.",
      reviewSteps: [
        "Review the quoted route and risk notes.",
        "Open the selected bridge or DEX route.",
        "Confirm token approval scope in your wallet.",
        "Sign only after the displayed route still matches the plan."
      ]
    };

    return NextResponse.json({ simulation });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to simulate alert", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

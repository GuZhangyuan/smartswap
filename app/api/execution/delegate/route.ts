import { NextResponse } from "next/server";
import { delegateTask } from "@/lib/execution";
import type { PlanComparison } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const comparison = (await request.json()) as PlanComparison;
    const delegatedTask = delegateTask(comparison);
    return NextResponse.json({ delegatedTask });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to delegate task", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

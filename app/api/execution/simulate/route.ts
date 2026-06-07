import { NextResponse } from "next/server";
import { simulateExecution } from "@/lib/execution";
import type { DelegatedTask } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { delegatedTask?: DelegatedTask };
    if (!body.delegatedTask) {
      return NextResponse.json({ error: "delegatedTask is required" }, { status: 400 });
    }

    const report = simulateExecution(body.delegatedTask);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to simulate execution", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

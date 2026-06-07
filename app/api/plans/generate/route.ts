import { NextResponse } from "next/server";
import { normalizeIntent } from "@/lib/intent";
import { buildMockQuotes } from "@/lib/mock";
import { generatePlanComparison } from "@/lib/plans";
import type { RouteQuote } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const intent = normalizeIntent(body.intent ?? {});
    const quotes = (body.quotes as RouteQuote[] | undefined) ?? buildMockQuotes(intent);
    const comparison = generatePlanComparison(quotes, intent);
    return NextResponse.json({ intent, quotes, ...comparison });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to generate plans", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

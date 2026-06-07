import { NextResponse } from "next/server";
import { normalizeIntent } from "@/lib/intent";
import { buildMockQuotes } from "@/lib/mock";
import { fetchLifiQuotes } from "@/lib/lifi";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const intent = normalizeIntent(body.intent ?? body);
    try {
      const quotes = await fetchLifiQuotes(intent);
      return NextResponse.json({ intent, quotes, source: "lifi" });
    } catch (error) {
      return NextResponse.json({
        intent,
        quotes: buildMockQuotes(intent),
        source: "mock",
        warning: error instanceof Error ? error.message : "LI.FI unavailable"
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to fetch routes", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

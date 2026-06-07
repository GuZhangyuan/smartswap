import { NextResponse } from "next/server";
import { normalizeIntent, parseIntentText } from "@/lib/intent";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; intent?: object };
    const parsed = body.text ? parseIntentText(body.text) : {};
    const intent = normalizeIntent({ ...parsed, ...(body.intent ?? {}) });
    return NextResponse.json({ intent, parsed });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to parse intent", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}

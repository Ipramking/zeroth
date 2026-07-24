import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import { normalizePurse } from "@/lib/money/state";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = body?.message;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const { messages, state } = await runAgent(message, normalizePurse(body?.state));
  return NextResponse.json({ messages, state });
}

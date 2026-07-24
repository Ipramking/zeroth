import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import { getState } from "@/lib/money/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { message } = await request.json().catch(() => ({ message: "" }));
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const result = await runAgent(message);
  return NextResponse.json({ result, state: await getState() });
}

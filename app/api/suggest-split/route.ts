import { NextResponse } from "next/server";
import { suggestSplit } from "@/lib/agent/suggest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { total, goals } = await request.json().catch(() => ({}));
  const t = Number(total);
  if (!t || t <= 0) {
    return NextResponse.json({ error: "total required" }, { status: 400 });
  }
  const wallets = await suggestSplit(t, typeof goals === "string" ? goals : undefined);
  return NextResponse.json({ wallets });
}

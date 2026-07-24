import { NextResponse } from "next/server";
import { getState, resetData } from "@/lib/money/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getState());
}

// Reset balances to onboarding amounts and clear activity.
export async function POST() {
  await resetData();
  return NextResponse.json(await getState());
}

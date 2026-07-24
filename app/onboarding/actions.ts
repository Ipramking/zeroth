"use server";

import { redirect } from "next/navigation";
import { seedWallets } from "@/lib/money/store";

export async function completeOnboarding(input: {
  displayName: string;
  total: number;
}) {
  await seedWallets(input.total, input.displayName);
  redirect("/home");
}

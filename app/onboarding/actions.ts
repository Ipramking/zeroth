"use server";

import { redirect } from "next/navigation";
import { seedWallets } from "@/lib/money/store";
import type { WalletInput } from "@/lib/money/seed";

export async function completeOnboarding(input: {
  displayName: string;
  wallets: WalletInput[];
}) {
  await seedWallets(input.wallets, input.displayName);
  redirect("/home");
}

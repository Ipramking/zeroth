"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction, Wallet } from "@/lib/money/types";

export interface MoneyState {
  wallets: Wallet[];
  transactions: Transaction[];
  savings: number;
  displayName?: string | null;
}

export function useMoney() {
  const [state, setState] = useState<MoneyState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/state");
    if (r.ok) setState(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, setState, refresh, loading };
}

export function naira(n: number) {
  return "₦" + Number(n || 0).toLocaleString();
}

// A wallet funds everyday spending if its rules allow at least one spend
// category. Vaults (savings/emergency/investments, and the rent goal) fund no
// spending — they hold locked money toward a goal.
export function isSpendWallet(w: Wallet) {
  return w.rules.categories.length > 0 && w.category !== "rent";
}
export function spendable(wallets: Wallet[]) {
  return wallets.filter(isSpendWallet).reduce((s, w) => s + w.balance, 0);
}
export function lockedForGoals(wallets: Wallet[]) {
  return wallets.filter((w) => !isSpendWallet(w)).reduce((s, w) => s + w.balance, 0);
}

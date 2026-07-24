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

// Wallets that fund everyday spending (everything except the rent goal vault).
export function spendable(wallets: Wallet[]) {
  return wallets
    .filter((w) => w.category !== "rent")
    .reduce((s, w) => s + w.balance, 0);
}
export function lockedForGoals(wallets: Wallet[]) {
  return wallets
    .filter((w) => w.category === "rent")
    .reduce((s, w) => s + w.balance, 0);
}

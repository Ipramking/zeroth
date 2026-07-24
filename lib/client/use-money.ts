"use client";

import { useCallback, useEffect, useState } from "react";
import type { Wallet } from "@/lib/money/types";
import type { PurseState } from "@/lib/money/state";
import { loadPurse } from "./purse";

// Reads the purse from the browser (localStorage) and re-reads it whenever it
// changes — after the agent acts, after onboarding, or in another tab.
export function useMoney() {
  const [state, setState] = useState<PurseState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setState(loadPurse());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("purse:changed", on);
    window.addEventListener("storage", on);
    window.addEventListener("focus", on);
    return () => {
      window.removeEventListener("purse:changed", on);
      window.removeEventListener("storage", on);
      window.removeEventListener("focus", on);
    };
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

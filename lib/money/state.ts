import type { PaymentIntent, Transaction, Wallet } from "./types";
import { allocate, type WalletInput } from "./seed";

// The whole purse as a plain, serialisable object. This is the single source of
// truth and it lives in the browser (localStorage) — the server is stateless
// and simply takes a purse in and returns the updated purse out. That's what
// makes choices persist across navigation and refreshes on serverless hosting.

export interface PurseState {
  wallets: Wallet[];
  transactions: Transaction[];
  savings: number;
  displayName: string | null;
  total: number;
  pending: PaymentIntent[]; // transfers awaiting a purpose ("for what?")
  initial: Wallet[]; // snapshot of the onboarded wallets, for Reset
}

export const DEFAULT_TOTAL = 150000;

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "wallet"
  );
}

export function walletsFromTotal(total: number): Wallet[] {
  return allocate(total).map((a) => ({
    id: `w_${a.slug}`,
    name: a.name,
    category: a.slug,
    balance: a.balance,
    locked: true,
    rules: {
      categories: a.categories,
      perTxnLimit: a.perTxnLimit,
      allowCashout: a.allowCashout,
    },
  }));
}

export function walletsFromInputs(inputs: WalletInput[]): Wallet[] {
  return inputs
    .filter((w) => w.amount > 0)
    .map((w, i) => ({
      id: `w_${slug(w.name)}_${i}`,
      name: w.name,
      category: w.category,
      balance: w.amount,
      locked: true,
      rules: {
        categories: w.categories,
        perTxnLimit: w.perTxnLimit > 0 ? w.perTxnLimit : w.amount,
        allowCashout: w.allowCashout,
      },
    }));
}

function cloneWallets(ws: Wallet[]): Wallet[] {
  return ws.map((w) => ({ ...w, rules: { ...w.rules, categories: [...w.rules.categories] } }));
}

function purse(wallets: Wallet[], displayName: string | null): PurseState {
  return {
    wallets,
    transactions: [],
    savings: 0,
    displayName,
    total: wallets.reduce((s, w) => s + w.balance, 0),
    pending: [],
    initial: cloneWallets(wallets),
  };
}

export function defaultPurse(total = DEFAULT_TOTAL): PurseState {
  return purse(walletsFromTotal(total), null);
}

export function purseFromInputs(inputs: WalletInput[], displayName?: string): PurseState {
  const wallets = walletsFromInputs(inputs);
  return purse(
    wallets.length ? wallets : walletsFromTotal(DEFAULT_TOTAL),
    (displayName ?? "").trim() || null
  );
}

// Reset restores the onboarded wallets at full balance and clears activity.
export function resetPurse(prev: PurseState): PurseState {
  const initial = prev.initial?.length ? prev.initial : prev.wallets;
  return {
    wallets: cloneWallets(initial),
    transactions: [],
    savings: 0,
    displayName: prev.displayName,
    total: initial.reduce((s, w) => s + w.balance, 0),
    pending: [],
    initial: cloneWallets(initial),
  };
}

// Validate/repair a purse coming from the client before the server acts on it.
export function normalizePurse(s: unknown): PurseState {
  const o = s as Partial<PurseState> | null | undefined;
  if (!o || !Array.isArray(o.wallets) || o.wallets.length === 0) {
    return defaultPurse();
  }
  const wallets = o.wallets as Wallet[];
  return {
    wallets,
    transactions: Array.isArray(o.transactions) ? o.transactions : [],
    savings: Number(o.savings) || 0,
    displayName: o.displayName ?? null,
    total: Number(o.total) || wallets.reduce((a, w) => a + (Number(w.balance) || 0), 0),
    pending: Array.isArray(o.pending) ? o.pending : [],
    initial: Array.isArray(o.initial) && o.initial.length ? o.initial : cloneWallets(wallets),
  };
}

// Apply a committed transaction to a purse (debits the wallet, skims savings).
export function applyTransaction(s: PurseState, txn: Transaction) {
  if (txn.status === "success" && txn.walletId) {
    const w = s.wallets.find((x) => x.id === txn.walletId);
    if (w) w.balance -= txn.amount;
    if (txn.savings) s.savings += txn.savings;
  }
  s.transactions.unshift(txn);
  if (s.transactions.length > 60) s.transactions.length = 60;
}

export function clonePurse(s: PurseState): PurseState {
  return { ...s, wallets: cloneWallets(s.wallets), transactions: [...s.transactions] };
}

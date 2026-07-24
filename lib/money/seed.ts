import type { Category } from "./types";

export interface WalletSeed {
  slug: Category; // primary/display category
  name: string;
  categories: Category[]; // spend categories this wallet funds
  proportion: number; // % of the total lock that goes here
  perTxnLimit: number;
  allowCashout: boolean;
}

// The default wallet layout. Onboarding splits the user's chosen lock amount
// across these by proportion. Pure function — safe to import on the client for
// live previews.
export const WALLET_SEEDS: WalletSeed[] = [
  { slug: "airtime", name: "Airtime", categories: ["airtime"], proportion: 5, perTxnLimit: 2000, allowCashout: false },
  { slug: "data", name: "Data", categories: ["data"], proportion: 10, perTxnLimit: 5000, allowCashout: false },
  { slug: "food", name: "Food & Transport", categories: ["food", "transport"], proportion: 35, perTxnLimit: 10000, allowCashout: false },
  { slug: "bills", name: "Bills", categories: ["bills"], proportion: 25, perTxnLimit: 200000, allowCashout: false },
  { slug: "rent", name: "Rent Vault", categories: ["rent"], proportion: 25, perTxnLimit: 500000, allowCashout: false },
];

export interface WalletAllocation extends WalletSeed {
  balance: number;
}

// Split a total lock amount across the wallets, rounding to whole naira and
// giving any rounding remainder to the largest pool.
export function allocate(total: number): WalletAllocation[] {
  const rows = WALLET_SEEDS.map((s) => ({
    ...s,
    balance: Math.round((total * s.proportion) / 100),
  }));
  const diff = total - rows.reduce((sum, r) => sum + r.balance, 0);
  if (diff !== 0) {
    const biggest = rows.reduce((a, b) => (b.balance > a.balance ? b : a));
    biggest.balance += diff;
  }
  return rows;
}

// --- Flexible purpose wallets (onboarding split editor + AI suggestion) ------

// A wallet the user is about to create during onboarding.
export interface WalletInput {
  name: string;
  category: Category; // for icon + policy routing
  categories: Category[]; // spend categories this wallet funds ([] = locked vault)
  amount: number; // naira allocated
  perTxnLimit: number;
  allowCashout: boolean;
}

// A named purpose the user can pick (or the AI can suggest). Vaults
// (savings/emergency/investment) fund no spending — they just hold locked money.
export interface Purpose {
  key: string;
  name: string;
  category: Category;
  categories: Category[];
  perTxnLimit: number;
  allowCashout: boolean;
  pct: number; // default share when suggesting
}

export const PURPOSES: Purpose[] = [
  { key: "savings",    name: "Savings",          category: "general", categories: [],                    perTxnLimit: 0,      allowCashout: false, pct: 20 },
  { key: "emergency",  name: "Emergency Fund",   category: "general", categories: [],                    perTxnLimit: 0,      allowCashout: false, pct: 10 },
  { key: "investment", name: "Investments",      category: "general", categories: [],                    perTxnLimit: 0,      allowCashout: false, pct: 10 },
  { key: "rent",       name: "Rent",             category: "rent",    categories: ["rent"],              perTxnLimit: 500000, allowCashout: false, pct: 25 },
  { key: "bills",      name: "Bills",            category: "bills",   categories: ["bills"],             perTxnLimit: 200000, allowCashout: false, pct: 15 },
  { key: "food",       name: "Food & Transport", category: "food",    categories: ["food", "transport"], perTxnLimit: 10000,  allowCashout: false, pct: 20 },
  { key: "airtime",    name: "Airtime",          category: "airtime", categories: ["airtime"],           perTxnLimit: 2000,   allowCashout: false, pct: 3 },
  { key: "data",       name: "Data",             category: "data",    categories: ["data"],              perTxnLimit: 5000,   allowCashout: false, pct: 7 },
];

export function purposeToInput(p: Purpose, amount: number): WalletInput {
  return {
    name: p.name,
    category: p.category,
    categories: p.categories,
    amount,
    perTxnLimit: p.perTxnLimit,
    allowCashout: p.allowCashout,
  };
}

// A user-typed purpose we don't have a template for = a locked savings vault.
export function customWallet(name: string, amount: number): WalletInput {
  return {
    name: name.trim() || "Custom",
    category: "general",
    categories: [],
    amount,
    perTxnLimit: 0,
    allowCashout: false,
  };
}

// Turn a list of {key or custom name, pct} into wallets that sum to `total`.
export function inputsFromPicks(
  total: number,
  picks: Array<{ key?: string; name?: string; pct: number }>
): WalletInput[] {
  const rows = picks
    .filter((p) => p.pct > 0)
    .map((p) => {
      const preset = p.key ? PURPOSES.find((x) => x.key === p.key) : undefined;
      const amount = Math.max(0, Math.round((total * p.pct) / 100));
      return preset
        ? purposeToInput(preset, amount)
        : customWallet(p.name || p.key || "Custom", amount);
    });
  const diff = total - rows.reduce((s, r) => s + r.amount, 0);
  if (diff !== 0 && rows.length) {
    const big = rows.reduce((a, b) => (b.amount > a.amount ? b : a));
    big.amount += diff;
  }
  return rows;
}

// A sensible balanced starting split (also the offline fallback for AI).
export function defaultSuggestion(total: number): WalletInput[] {
  return inputsFromPicks(total, [
    { key: "savings", pct: 20 },
    { key: "rent", pct: 25 },
    { key: "bills", pct: 20 },
    { key: "food", pct: 25 },
    { key: "data", pct: 10 },
  ]);
}

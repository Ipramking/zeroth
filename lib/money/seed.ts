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

import type { Transaction, Wallet } from "./types";
import { allocate } from "./seed";

// In-memory demo store. One shared "purse" for the whole app — no auth, no
// database. State lives for the life of the server process (it resets on a
// cold start / redeploy), which is exactly what we want for a live demo: any
// judge can open the hosted link and start playing immediately, and a redeploy
// gives a clean slate. Swap this file for a Supabase-backed one to go
// multi-user (the earlier per-user version lives in git history).

interface DemoState {
  wallets: Wallet[];
  transactions: Transaction[];
  savings: number;
  displayName: string | null;
  total: number; // the locked amount, so Reset can restore a full purse
}

const DEFAULT_TOTAL = 150000;

function seed(total: number): Wallet[] {
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

// Hang state off globalThis so it survives Next.js hot-reloads in dev and is
// shared across route handlers within the same server instance.
const g = globalThis as unknown as { __zeroth?: DemoState };

function state(): DemoState {
  if (!g.__zeroth) {
    g.__zeroth = {
      wallets: seed(DEFAULT_TOTAL),
      transactions: [],
      savings: 0,
      displayName: null,
      total: DEFAULT_TOTAL,
    };
  }
  return g.__zeroth;
}

export async function getWallets(): Promise<Wallet[]> {
  return state().wallets;
}

export async function getTransactions(): Promise<Transaction[]> {
  return state().transactions.slice(0, 50);
}

export async function getSavings(): Promise<number> {
  return state().savings;
}

export async function getState() {
  const s = state();
  return {
    wallets: s.wallets,
    transactions: s.transactions.slice(0, 50),
    savings: s.savings,
    displayName: s.displayName,
  };
}

export async function commitTransaction(txn: Transaction) {
  const s = state();
  if (txn.status === "success" && txn.walletId) {
    const w = s.wallets.find((w) => w.id === txn.walletId);
    if (w) w.balance -= txn.amount;
    if (txn.savings) s.savings += txn.savings;
  }
  s.transactions.unshift(txn);
}

// Create the purse from a total lock amount (used by onboarding).
export async function seedWallets(total: number, displayName?: string) {
  const s = state();
  s.wallets = seed(total);
  s.transactions = [];
  s.savings = 0;
  s.total = total;
  if (displayName !== undefined) s.displayName = displayName.trim() || null;
}

// Reset balances to their onboarding amounts and clear activity (demo Reset).
export async function resetData() {
  const s = state();
  s.wallets = seed(s.total);
  s.transactions = [];
  s.savings = 0;
}

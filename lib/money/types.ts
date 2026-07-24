// Core domain types for the programmable-money agent.

export type Category =
  | "airtime"
  | "data"
  | "food"
  | "transport"
  | "bills"
  | "rent"
  | "general";

// What actions a wallet permits. Cash-out is deliberately its own flag so a
// "locked" wallet can allow spending but forbid withdrawal.
export interface WalletRules {
  categories: Category[]; // spend categories this wallet funds
  perTxnLimit: number; // max naira per single transaction
  allowCashout: boolean; // can money leave as cash / bank transfer?
}

export interface Wallet {
  id: string;
  name: string;
  category: Category; // primary purpose (for display)
  balance: number; // naira
  locked: boolean; // committed funds the user won't withdraw
  rules: WalletRules;
}

export type TxnStatus = "success" | "blocked" | "failed" | "pending";

export interface Transaction {
  id: string;
  createdAt: string;
  category: Category;
  amount: number;
  recipient?: string; // phone number, meter, account, merchant
  walletId?: string;
  status: TxnStatus;
  reason?: string; // why blocked/failed
  providerRef?: string; // reference from the payment rail
  savings?: number; // round-up moved to savings on this txn
}

// The structured request the AI produces from natural language.
// The AI ONLY fills this in — it never executes anything.
export interface PaymentIntent {
  action:
    | "buy_airtime"
    | "buy_data"
    | "pay_bill"
    | "pay_merchant"
    | "pay_rent"
    | "cash_out"
    | "unknown";
  category: Category;
  amount: number | null;
  recipient: string | null; // phone / meter / account / merchant name
  network?: string | null; // MTN, Glo, Airtel, 9mobile (airtime/data)
  note?: string | null; // anything the user said we couldn't map
}

export interface AgentResult {
  intent: PaymentIntent;
  transaction: Transaction;
  message: string; // human-readable reply to show in chat
}

// A single chat bubble the agent sends back. "info" = a conversational reply
// (no money moved); the rest mirror a transaction outcome.
export type MessageKind = "success" | "blocked" | "failed" | "pending" | "info";
export interface AgentMessage {
  text: string;
  status: MessageKind;
}

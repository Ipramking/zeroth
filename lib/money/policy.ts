import type { Category, PaymentIntent, Wallet } from "./types";

// The account holder's own line. Airtime/data with no stated recipient tops up
// this number — buying credit for yourself is the natural default.
export const OWN_LINE = "08031234097";

export interface PolicyDecision {
  allowed: boolean;
  wallet?: Wallet;
  category: Category;
  reason?: string; // set when blocked — shown to the user
}

// Maps an intent's action to the spend category it draws from.
function categoryForIntent(intent: PaymentIntent): Category {
  switch (intent.action) {
    case "buy_airtime":
      return "airtime";
    case "buy_data":
      return "data";
    case "pay_rent":
      return "rent";
    case "pay_bill":
      return "bills";
    case "pay_merchant":
      return intent.category === "transport" ? "transport" : "food";
    default:
      return intent.category ?? "general";
  }
}

// The rule engine. The AI never runs this — it decides nothing about money.
// Given a parsed intent, we pick the funding wallet and check every rule.
export function evaluatePolicy(
  intent: PaymentIntent,
  wallets: Wallet[]
): PolicyDecision {
  const category = categoryForIntent(intent);

  // 1. Cash-out / bank transfer is refused on locked purpose money. This is
  //    the whole point of the product — enforce it first and loudly.
  if (intent.action === "cash_out") {
    return {
      allowed: false,
      category,
      reason:
        "Cash withdrawal isn't permitted — you locked these funds to their purpose. That's by design.",
    };
  }

  // 2. Did we understand the request at all?
  if (intent.action === "unknown") {
    return {
      allowed: false,
      category,
      reason:
        "I couldn't tell what payment you wanted. Try e.g. “buy ₦500 airtime for 080…”.",
    };
  }

  // 3. Valid amount?
  if (!intent.amount || intent.amount <= 0) {
    return {
      allowed: false,
      category,
      reason: "I need a valid amount to proceed.",
    };
  }

  // 4. Find a wallet whose rules allow this category.
  const wallet = wallets.find((w) => w.rules.categories.includes(category));
  if (!wallet) {
    return {
      allowed: false,
      category,
      reason: `No wallet is set up to fund ${category}.`,
    };
  }

  // 5. Per-transaction limit.
  if (intent.amount > wallet.rules.perTxnLimit) {
    return {
      allowed: false,
      wallet,
      category,
      reason: `That's above the ₦${wallet.rules.perTxnLimit.toLocaleString()} per-payment limit on your ${wallet.name} wallet.`,
    };
  }

  // 6. Sufficient balance (leave room for the round-up savings skim).
  if (intent.amount > wallet.balance) {
    return {
      allowed: false,
      wallet,
      category,
      reason: `Not enough in your ${wallet.name} wallet (₦${wallet.balance.toLocaleString()} left).`,
    };
  }

  // 7. Recipient sanity for airtime/data.
  if (
    (intent.action === "buy_airtime" || intent.action === "buy_data") &&
    !isValidPhone(intent.recipient)
  ) {
    return {
      allowed: false,
      wallet,
      category,
      reason: "That doesn't look like a valid Nigerian phone number.",
    };
  }

  return { allowed: true, wallet, category };
}

function isValidPhone(v: string | null): boolean {
  if (!v) return false;
  const digits = v.replace(/\D/g, "");
  // 080xxxxxxxx (11) or 23480xxxxxxxx (13)
  return digits.length === 11 || digits.length === 13;
}

// Round-up savings: skim the change up to the next ₦100.
export function roundUpSavings(amount: number): number {
  const up = Math.ceil(amount / 100) * 100 - amount;
  return up;
}

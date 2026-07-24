import type { AgentMessage, Category, PaymentIntent, Transaction } from "@/lib/money/types";
import { evaluatePolicy, roundUpSavings, OWN_LINE } from "@/lib/money/policy";
import { execute } from "@/lib/money/provider";
import { applyTransaction, clonePurse, type PurseState } from "@/lib/money/state";
import { understand } from "./gemini";

function id() {
  return "txn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}
const money = (n?: number | null) => "₦" + (n ?? 0).toLocaleString();

function inferCategory(text: string): Category | null {
  const m = text.toLowerCase();
  if (/(feed|food|lunch|dinner|breakfast|eat|suya|chop|market|grocer|restaurant)/.test(m)) return "food";
  if (/(transport|fare|fuel|ride|bus|uber|bolt|keke|okada|taxi)/.test(m)) return "transport";
  if (/\bdata\b|internet|\bmb\b|\bgb\b/.test(m)) return "data";
  if (/(airtime|recharge|\bcredit\b|call)/.test(m)) return "airtime";
  if (/(rent|landlord|accommodation)/.test(m)) return "rent";
  if (/(bill|electric|light|nepa|dstv|gotv|water|utility)/.test(m)) return "bills";
  return null;
}

function actionForCategory(cat: Category): PaymentIntent["action"] {
  switch (cat) {
    case "airtime": return "buy_airtime";
    case "data": return "buy_data";
    case "bills": return "pay_bill";
    case "rent": return "pay_rent";
    default: return "pay_merchant";
  }
}
function withCategory(i: PaymentIntent, cat: Category): PaymentIntent {
  return { ...i, category: cat, action: actionForCategory(cat) };
}

function needsPurpose(i: PaymentIntent): boolean {
  if (!i.amount || i.amount <= 0) return false;
  if (i.action === "cash_out") return false;
  if (["buy_airtime", "buy_data", "pay_bill", "pay_rent"].includes(i.action)) return false;
  return i.category === "general" || i.action === "unknown";
}

// Give the AI a picture of the user's money so it can converse and explain.
function buildContext(s: PurseState): string {
  const wallets = s.wallets
    .map((w) => `- ${w.name}: ${money(w.balance)} (funds ${w.rules.categories.join(", ") || "a locked vault"}, limit ${money(w.rules.perTxnLimit)}/txn)`)
    .join("\n");
  const recent = s.transactions
    .slice(0, 6)
    .map((t) => `- ${t.status} ${money(t.amount)} ${t.category}${t.recipient ? " to " + t.recipient : ""}`)
    .join("\n");
  return `The user${s.displayName ? " (" + s.displayName + ")" : ""} has these wallets:\n${wallets}\nAuto-savings: ${money(s.savings)}\nRecent activity:\n${recent || "- none yet"}`;
}

// Stateless agent: purse in -> chat bubbles + updated purse out.
export async function runAgent(
  message: string,
  inState: PurseState
): Promise<{ messages: AgentMessage[]; state: PurseState }> {
  const s = clonePurse(inState);

  // Finishing transfers that were waiting on a purpose?
  if (s.pending.length) {
    const cat = inferCategory(message);
    if (cat) {
      const batch = s.pending;
      s.pending = [];
      const messages: AgentMessage[] = [];
      for (const it of batch) messages.push(await executeIntent(s, withCategory(it, cat)));
      return { messages, state: s };
    }
    // The user moved on without answering — don't be rigid; drop it and
    // handle the new message normally.
    s.pending = [];
  }

  const { reply, payments } = await understand(message, buildContext(s));

  // Pure conversation — answer and move on, no money touched.
  if (payments.length === 0) {
    return {
      messages: [{ text: reply || "I'm here — tell me a payment or ask about your money.", status: "info" }],
      state: s,
    };
  }

  const messages: AgentMessage[] = [];
  const ambiguous: PaymentIntent[] = [];

  for (let it of payments) {
    if ((it.action === "buy_airtime" || it.action === "buy_data") && !it.recipient) {
      it.recipient = OWN_LINE;
    }
    if (needsPurpose(it)) {
      const c = inferCategory(message);
      if (c) it = withCategory(it, c);
    }
    if (needsPurpose(it)) {
      ambiguous.push(it);
      continue;
    }
    messages.push(await executeIntent(s, it));
  }

  if (ambiguous.length) {
    s.pending = ambiguous;
    const list = ambiguous
      .map((a) => `${money(a.amount)}${a.recipient ? " to " + a.recipient : ""}`)
      .join(" and ");
    messages.push({
      text: `One more thing — what's the ${list} for? (e.g. feeding, data, transport, rent)`,
      status: "pending",
    });
  }

  return { messages, state: s };
}

// Policy check -> execute -> ledger. Mutates the (cloned) purse; returns a
// chat bubble describing the outcome.
async function executeIntent(s: PurseState, intent: PaymentIntent): Promise<AgentMessage> {
  const decision = evaluatePolicy(intent, s.wallets);

  if (!decision.allowed) {
    applyTransaction(s, {
      id: id(),
      createdAt: new Date().toISOString(),
      category: decision.category,
      amount: intent.amount ?? 0,
      recipient: intent.recipient ?? undefined,
      walletId: decision.wallet?.id,
      status: "blocked",
      reason: decision.reason,
    });
    return { text: `🔒 ${decision.reason}`, status: "blocked" };
  }

  const amount = intent.amount as number;
  const result = await execute(intent);

  if (!result.ok) {
    applyTransaction(s, {
      id: id(),
      createdAt: new Date().toISOString(),
      category: decision.category,
      amount,
      recipient: intent.recipient ?? undefined,
      walletId: decision.wallet!.id,
      status: "failed",
      reason: result.detail,
    });
    return { text: `⚠️ Payment failed: ${result.detail}`, status: "failed" };
  }

  const savings = roundUpSavings(amount);
  const txn: Transaction = {
    id: id(),
    createdAt: new Date().toISOString(),
    category: decision.category,
    amount,
    recipient: intent.recipient ?? undefined,
    walletId: decision.wallet!.id,
    status: "success",
    providerRef: result.reference,
    savings,
  };
  applyTransaction(s, txn);

  const savingsLine = savings > 0 ? ` (${money(savings)} rounded into savings)` : "";
  return { text: `✅ ${result.detail}. Ref ${result.reference}.${savingsLine}`, status: "success" };
}

import type { AgentResult, Category, PaymentIntent, Transaction } from "@/lib/money/types";
import { evaluatePolicy, roundUpSavings, OWN_LINE } from "@/lib/money/policy";
import { execute } from "@/lib/money/provider";
import {
  commitTransaction,
  getWallets,
  getPending,
  setPending,
} from "@/lib/money/store";
import { parseIntent } from "./gemini";

function id() {
  return "txn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}

// Read a spend category out of free text ("...for feeding" -> food).
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
    default: return "pay_merchant"; // food, transport, general
  }
}

function withCategory(intent: PaymentIntent, cat: Category): PaymentIntent {
  return { ...intent, category: cat, action: actionForCategory(cat) };
}

// A payment we understood except for WHICH purpose funds it — so we can't yet
// pick a wallet. Anything with money but no concrete category needs a purpose.
function needsPurpose(i: PaymentIntent): boolean {
  if (!i.amount || i.amount <= 0) return false;
  if (i.action === "cash_out") return false;
  if (["buy_airtime", "buy_data", "pay_bill", "pay_rent"].includes(i.action)) {
    return false;
  }
  return i.category === "general" || i.action === "unknown";
}

function pendingTxn(intent: PaymentIntent): Transaction {
  return {
    id: id(),
    createdAt: new Date().toISOString(),
    category: intent.category,
    amount: intent.amount ?? 0,
    recipient: intent.recipient ?? undefined,
    status: "pending",
  };
}

// The full agentic flow, in order:
// message -> AI parses intent -> (ask for purpose if needed) -> policy engine
// decides -> provider executes -> ledger + savings. The AI only parses language.
export async function runAgent(message: string): Promise<AgentResult> {
  // 1. Are we finishing a transfer that was waiting on its purpose?
  const pending = await getPending();
  if (pending) {
    const cat = inferCategory(message);
    if (cat) {
      await setPending(null);
      return executeIntent(withCategory(pending, cat));
    }
    // Still couldn't read a purpose — keep waiting, nudge with examples.
    return {
      intent: pending,
      transaction: pendingTxn(pending),
      message:
        "I didn't catch the purpose. What's it for? e.g. feeding, data, transport, rent, bills.",
    };
  }

  // 2. Parse the fresh message.
  let intent = await parseIntent(message);

  // Airtime/data with no number = top up your own line.
  if (
    (intent.action === "buy_airtime" || intent.action === "buy_data") &&
    !intent.recipient
  ) {
    intent.recipient = OWN_LINE;
  }

  // If it's a payment with no clear purpose, try to read one from the same
  // message ("send ₦5k to 0814… for feeding").
  if (needsPurpose(intent)) {
    const cat = inferCategory(message);
    if (cat) intent = withCategory(intent, cat);
  }

  // 3. Still ambiguous → ask what it's for and remember the transfer.
  if (needsPurpose(intent)) {
    await setPending(intent);
    const amt = intent.amount ? `₦${intent.amount.toLocaleString()}` : "that";
    const who = intent.recipient ? ` to ${intent.recipient}` : "";
    return {
      intent,
      transaction: pendingTxn(intent),
      message: `Got it — sending ${amt}${who}. What's it for? (e.g. feeding, data, transport, rent, bills)`,
    };
  }

  // 4. Fully specified → run it.
  return executeIntent(intent);
}

// Policy check -> execute -> ledger. Every money decision lives here, not in
// the AI. This is the product's core guarantee.
async function executeIntent(intent: PaymentIntent): Promise<AgentResult> {
  const wallets = await getWallets();
  const decision = evaluatePolicy(intent, wallets);

  // Blocked by rules — no money moves. This is the product's core moment.
  if (!decision.allowed) {
    const txn: Transaction = {
      id: id(),
      createdAt: new Date().toISOString(),
      category: decision.category,
      amount: intent.amount ?? 0,
      recipient: intent.recipient ?? undefined,
      walletId: decision.wallet?.id,
      status: "blocked",
      reason: decision.reason,
    };
    await commitTransaction(txn);
    return { intent, transaction: txn, message: `🔒 ${decision.reason}` };
  }

  // Allowed — execute against the payment rail.
  const amount = intent.amount as number;
  const result = await execute(intent);

  if (!result.ok) {
    const txn: Transaction = {
      id: id(),
      createdAt: new Date().toISOString(),
      category: decision.category,
      amount,
      recipient: intent.recipient ?? undefined,
      walletId: decision.wallet!.id,
      status: "failed",
      reason: result.detail,
    };
    await commitTransaction(txn);
    return { intent, transaction: txn, message: `⚠️ Payment failed: ${result.detail}` };
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
  await commitTransaction(txn);

  const savingsLine = savings > 0 ? ` (₦${savings} rounded into savings)` : "";
  return {
    intent,
    transaction: txn,
    message: `✅ ${result.detail}. Ref ${result.reference}.${savingsLine}`,
  };
}

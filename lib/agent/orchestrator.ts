import type { AgentResult, Transaction } from "@/lib/money/types";
import { evaluatePolicy, roundUpSavings, OWN_LINE } from "@/lib/money/policy";
import { execute } from "@/lib/money/provider";
import { commitTransaction, getWallets } from "@/lib/money/store";
import { parseIntent } from "./gemini";

function id() {
  return "txn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}

// The full agentic flow, in order:
// message -> AI parses intent -> policy engine decides -> provider executes
// -> ledger updates -> savings skim -> reply. The AI only does step 1.
export async function runAgent(message: string): Promise<AgentResult> {
  const intent = await parseIntent(message);

  // Airtime/data with no stated number = top up your own line (the default a
  // user means when they just say "buy ₦500 airtime").
  if (
    (intent.action === "buy_airtime" || intent.action === "buy_data") &&
    !intent.recipient
  ) {
    intent.recipient = OWN_LINE;
  }

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

import type { PaymentIntent } from "./types";
import { OWN_LINE } from "./policy";

// Render the recipient for display — the user's own line reads as "your line".
function who(recipient: string | null): string {
  return !recipient || recipient === OWN_LINE ? "your line" : recipient;
}

// Payment rail abstraction. The demo uses a realistic MOCK that returns a
// provider reference and success, so the whole agent → policy → execution loop
// is real end-to-end. To go live, implement `execute` against a real biller
// sandbox (VTpass / Reloadly / Flutterwave Bills) — nothing else changes.

export interface ProviderResult {
  ok: boolean;
  reference: string;
  detail: string;
}

function ref() {
  return "REF-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function execute(intent: PaymentIntent): Promise<ProviderResult> {
  // Simulate network latency so the demo feels real.
  await new Promise((r) => setTimeout(r, 500));

  const reference = ref();
  const amount = intent.amount ?? 0;

  switch (intent.action) {
    case "buy_airtime":
      return {
        ok: true,
        reference,
        detail: `₦${amount.toLocaleString()} ${
          intent.network ?? ""
        } airtime sent to ${who(intent.recipient)}`.replace(/\s+/g, " "),
      };
    case "buy_data":
      return {
        ok: true,
        reference,
        detail: `₦${amount.toLocaleString()} ${
          intent.network ?? ""
        } data sent to ${who(intent.recipient)}`.replace(/\s+/g, " "),
      };
    case "pay_bill":
      return {
        ok: true,
        reference,
        detail: `₦${amount.toLocaleString()} bill paid${
          intent.recipient ? ` for ${intent.recipient}` : ""
        }`,
      };
    case "pay_merchant":
      return {
        ok: true,
        reference,
        detail: `₦${amount.toLocaleString()} paid${
          intent.recipient ? ` to ${intent.recipient}` : ""
        }`,
      };
    case "pay_rent":
      return {
        ok: true,
        reference,
        detail: `₦${amount.toLocaleString()} rent paid${
          intent.recipient ? ` to ${intent.recipient}` : ""
        }`,
      };
    default:
      return { ok: false, reference, detail: "Unsupported action" };
  }
}

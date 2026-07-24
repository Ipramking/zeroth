import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { PaymentIntent } from "@/lib/money/types";

// The AI's ONLY job: turn natural language into a structured PaymentIntent.
// It never touches money, picks wallets, or checks rules — the policy engine
// does that deterministically. This keeps the money logic auditable and the
// demo reliable on stage.

const SYSTEM = `You are the intent parser for a programmable-money wallet in Nigeria.
Convert the user's message into a single payment intent as JSON.
Rules:
- amount is in Naira (₦). "5k" = 5000, "500" = 500. Null if none given.
- action is one of: buy_airtime, buy_data, pay_bill, pay_merchant, pay_rent, cash_out, unknown.
- "withdraw", "send to my account", "cash out", "transfer to my bank" => cash_out.
- food/lunch/suya/restaurant => pay_merchant with category food.
- bus/uber/bolt/transport => pay_merchant with category transport.
- electricity/nepa/light/dstv/water => pay_bill with category bills.
- rent/landlord => pay_rent with category rent.
- network is MTN, Glo, Airtel, or 9mobile if stated, else null.
- recipient is the phone number, meter, account, or merchant/person named, else null.
- If you cannot tell, use action "unknown".`;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    action: {
      type: SchemaType.STRING,
      enum: [
        "buy_airtime",
        "buy_data",
        "pay_bill",
        "pay_merchant",
        "pay_rent",
        "cash_out",
        "unknown",
      ],
    },
    category: {
      type: SchemaType.STRING,
      enum: [
        "airtime",
        "data",
        "food",
        "transport",
        "bills",
        "rent",
        "general",
      ],
    },
    amount: { type: SchemaType.NUMBER, nullable: true },
    recipient: { type: SchemaType.STRING, nullable: true },
    network: { type: SchemaType.STRING, nullable: true },
    note: { type: SchemaType.STRING, nullable: true },
  },
  required: ["action", "category"],
} as const;

export async function parseIntent(message: string): Promise<PaymentIntent> {
  const key = process.env.GEMINI_API_KEY;

  // Offline / no-key fallback keeps the demo alive on bad wifi.
  if (!key) return heuristicParse(message);

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      systemInstruction: SYSTEM,
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-expect-error SDK schema typing is loose across versions
        responseSchema,
        temperature: 0,
      },
    });
    const res = await model.generateContent(message);
    const parsed = JSON.parse(res.response.text());
    return normalize(parsed);
  } catch {
    // Any API/parse failure => fall back rather than crash the demo.
    return heuristicParse(message);
  }
}

function normalize(p: Partial<PaymentIntent>): PaymentIntent {
  return {
    action: (p.action as PaymentIntent["action"]) ?? "unknown",
    category: (p.category as PaymentIntent["category"]) ?? "general",
    amount: typeof p.amount === "number" ? p.amount : null,
    recipient: p.recipient ?? null,
    network: p.network ?? null,
    note: p.note ?? null,
  };
}

// --- Deterministic fallback parser -----------------------------------------

function parseAmount(msg: string): number | null {
  const k = msg.match(/₦?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const n = msg.match(/₦?\s*(\d{2,7})\b/);
  return n ? parseInt(n[1], 10) : null;
}

function parsePhone(msg: string): string | null {
  const m = msg.match(/\b(?:\+?234|0)\d{9,10}\b/);
  return m ? m[0] : null;
}

function parseNetwork(msg: string): string | null {
  const m = msg.match(/\b(mtn|glo|airtel|9mobile|etisalat)\b/i);
  return m ? m[1].toUpperCase() : null;
}

export function heuristicParse(message: string): PaymentIntent {
  const m = message.toLowerCase();
  const amount = parseAmount(message);
  const phone = parsePhone(message);
  const network = parseNetwork(message);

  if (/(withdraw|cash ?out|to my (bank|account)|transfer to)/.test(m)) {
    return {
      action: "cash_out",
      category: "general",
      amount,
      recipient: null,
      network: null,
      note: null,
    };
  }
  if (/\bdata\b/.test(m)) {
    return { action: "buy_data", category: "data", amount, recipient: phone, network, note: null };
  }
  if (/(airtime|recharge|credit|top ?up)/.test(m)) {
    return { action: "buy_airtime", category: "airtime", amount, recipient: phone, network, note: null };
  }
  if (/(nepa|electric|light|dstv|gotv|water|bill)/.test(m)) {
    return { action: "pay_bill", category: "bills", amount, recipient: phone, network: null, note: null };
  }
  if (/(rent|landlord)/.test(m)) {
    return { action: "pay_rent", category: "rent", amount, recipient: null, network: null, note: null };
  }
  if (/(food|lunch|suya|eat|restaurant|dinner|breakfast)/.test(m)) {
    return { action: "pay_merchant", category: "food", amount, recipient: null, network: null, note: null };
  }
  if (/(bus|uber|bolt|transport|keke|okada|fare)/.test(m)) {
    return { action: "pay_merchant", category: "transport", amount, recipient: null, network: null, note: null };
  }
  return { action: "unknown", category: "general", amount, recipient: null, network: null, note: null };
}

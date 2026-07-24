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
- Sending/transferring money to another PERSON or phone number (e.g. "send ₦5k to
  08145997956 palmpay Samuel", "transfer 2k to Ada") is a PAYMENT, not a cash_out.
  Put the person's name and/or number in recipient.
- cash_out is ONLY when the user withdraws to THEIR OWN bank/account or says
  "withdraw"/"cash out" for themselves, with no third-party recipient.
- Determine category from the stated purpose ("for X"):
  - feeding/food/lunch/suya/restaurant/market => pay_merchant, category food.
  - transport/bus/uber/bolt/fare/fuel => pay_merchant, category transport.
  - data/internet => buy_data, category data.
  - airtime/recharge/credit => buy_airtime, category airtime.
  - electricity/nepa/light/dstv/water/bill => pay_bill, category bills.
  - rent/landlord => pay_rent, category rent.
- If the user is sending money to a person but states NO purpose, use action
  pay_merchant with category "general" (the app will ask what it's for). Still
  fill amount and recipient.
- network is MTN, Glo, Airtel, or 9mobile if stated, else null.
- recipient is the phone number, meter, account, or merchant/person named, else null.
- If you truly cannot tell what they want, use action "unknown".`;

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

  // Self cash-out only (withdrawing to your OWN account, no third party).
  if (/(withdraw|cash ?out|to my (own )?(bank|account)|send to my)/.test(m)) {
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
  if (/(feed|food|lunch|suya|eat|chop|restaurant|dinner|breakfast|market)/.test(m)) {
    return { action: "pay_merchant", category: "food", amount, recipient: phone, network: null, note: null };
  }
  if (/(bus|uber|bolt|transport|keke|okada|fare|fuel)/.test(m)) {
    return { action: "pay_merchant", category: "transport", amount, recipient: phone, network: null, note: null };
  }
  // Transfer to a person/number with no stated purpose — the orchestrator will
  // ask what it's for. Detect a phone, a bank/wallet name, or send/transfer/pay.
  if (
    phone ||
    /(palmpay|opay|moniepoint|kuda|gtb|access|zenith|uba|wema|first ?bank)/.test(m) ||
    (/(send|transfer|pay)\b/.test(m) && amount)
  ) {
    return { action: "pay_merchant", category: "general", amount, recipient: phone, network: null, note: null };
  }
  return { action: "unknown", category: "general", amount, recipient: null, network: null, note: null };
}

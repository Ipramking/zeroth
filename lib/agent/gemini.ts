import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { PaymentIntent } from "@/lib/money/types";

// The AI turns a message into (a) a friendly reply AND (b) zero or more payment
// intents. It can hold a conversation and answer questions using the wallet
// context we pass in — but it never moves money. The policy engine executes.

export interface Understanding {
  reply: string; // natural-language message to show the user
  payments: PaymentIntent[]; // every payment the user asked for (may be many)
}

const SYSTEM = `You are Zeroth, a warm, concise financial agent for an average Nigerian.
The user might (a) ask you to make ONE OR MORE payments, (b) ask a question about
their money, or (c) just chat. Reply in JSON with two fields:

- "reply": a short, friendly, human message. Answer questions, explain what you
  did or why something was blocked, greet, or confirm. Speak naturally (Nigerian-
  friendly, plain English). Never invent transaction references or balances —
  the app fills those in when it executes payments.
- "payments": an array with EVERY payment the user requested. If they aren't
  asking to pay, use an empty array.

Extract ALL payments in one message. "buy ₦450 airtime to 0801 and ₦700 airtime
to 0802" is TWO payments. "send 2k to Ada and 3k to Musa for food" is two.

For each payment:
- amount is Naira. "5k"=5000, "#450"/"₦450"=450.
- action ∈ buy_airtime, buy_data, pay_bill, pay_merchant, pay_rent, cash_out, unknown.
- Sending money to a PERSON/phone is a payment (pay_merchant), NOT cash_out.
  cash_out is only withdrawing to the user's OWN bank, no third party.
- category from purpose: feeding/food→food; transport/fare→transport; data→data;
  airtime→airtime; light/nepa/bill→bills; rent→rent. If a transfer has no stated
  purpose, set category "general" (the app will ask what it's for).
- recipient = phone/name/meter; network = MTN/Glo/Airtel/9mobile if stated.

You are given the user's wallets, savings and recent activity as context. Use it
to answer things like "what happened?", "how much do I have for transport?", or
"can I afford X?".`;

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING },
    payments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          action: {
            type: SchemaType.STRING,
            enum: ["buy_airtime", "buy_data", "pay_bill", "pay_merchant", "pay_rent", "cash_out", "unknown"],
          },
          category: {
            type: SchemaType.STRING,
            enum: ["airtime", "data", "food", "transport", "bills", "rent", "general"],
          },
          amount: { type: SchemaType.NUMBER, nullable: true },
          recipient: { type: SchemaType.STRING, nullable: true },
          network: { type: SchemaType.STRING, nullable: true },
        },
        required: ["action", "category"],
      },
    },
  },
  required: ["reply", "payments"],
} as const;

export async function understand(
  message: string,
  context: string
): Promise<Understanding> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return heuristicUnderstand(message);

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      systemInstruction: SYSTEM,
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-expect-error loose SDK schema typing across versions
        responseSchema: schema,
        temperature: 0.25,
      },
    });
    const res = await model.generateContent(`${context}\n\nUser: ${message}`);
    const data = JSON.parse(res.response.text()) as {
      reply?: string;
      payments?: Array<Partial<PaymentIntent>>;
    };
    return {
      reply: typeof data.reply === "string" ? data.reply : "",
      payments: (data.payments ?? []).map(normalize),
    };
  } catch {
    return heuristicUnderstand(message);
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

// --- Deterministic fallback (no key / API down) ----------------------------

function parseAmount(msg: string): number | null {
  const k = msg.match(/[₦#]?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const n = msg.match(/[₦#]?\s*(\d{2,7})\b/);
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

  if (/(withdraw|cash ?out|to my (own )?(bank|account)|send to my)/.test(m)) {
    return { action: "cash_out", category: "general", amount, recipient: null, network: null, note: null };
  }
  if (/\bdata\b/.test(m)) return { action: "buy_data", category: "data", amount, recipient: phone, network, note: null };
  if (/(airtime|recharge|credit|top ?up)/.test(m)) return { action: "buy_airtime", category: "airtime", amount, recipient: phone, network, note: null };
  if (/(nepa|electric|light|dstv|gotv|water|bill)/.test(m)) return { action: "pay_bill", category: "bills", amount, recipient: phone, network: null, note: null };
  if (/(rent|landlord)/.test(m)) return { action: "pay_rent", category: "rent", amount, recipient: null, network: null, note: null };
  if (/(feed|food|lunch|suya|eat|chop|restaurant|dinner|breakfast|market)/.test(m)) return { action: "pay_merchant", category: "food", amount, recipient: phone, network: null, note: null };
  if (/(bus|uber|bolt|transport|keke|okada|fare|fuel)/.test(m)) return { action: "pay_merchant", category: "transport", amount, recipient: phone, network: null, note: null };
  if (phone || /(palmpay|opay|moniepoint|kuda|gtb|access|zenith|uba|wema|first ?bank)/.test(m) || (/(send|transfer|pay)\b/.test(m) && amount)) {
    return { action: "pay_merchant", category: "general", amount, recipient: phone, network: null, note: null };
  }
  return { action: "unknown", category: "general", amount, recipient: null, network: null, note: null };
}

function heuristicUnderstand(message: string): Understanding {
  // Split on "and" / commas so multiple payments in one message are caught.
  const parts = message.split(/\band\b|,|;|\bthen\b/i).map((s) => s.trim()).filter(Boolean);
  const payments = parts
    .map(heuristicParse)
    .filter((p) => p.action !== "unknown" && p.amount);
  if (payments.length) return { reply: "", payments };

  const m = message.toLowerCase();
  let reply =
    "I can buy airtime or data, pay bills, or send money to someone — just tell me the amount and who it's for. You can also ask me how much you have.";
  if (/\b(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(m))
    reply = "Hey! I'm Zeroth, your money agent. Tell me what to pay for, or ask how your wallets are doing.";
  else if (/(how much|balance|left|afford|what.?s? in)/.test(m))
    reply = "Open your Money tab to see each wallet, or tell me a payment and I'll check the limit and balance before sending.";
  else if (/(what happened|why|explain)/.test(m))
    reply = "Each message I execute shows its own result above — a green tick means it went through, a lock means a rule blocked it. Want me to try a payment again?";
  return { reply, payments: [] };
}

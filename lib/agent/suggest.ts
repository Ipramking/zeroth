import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  PURPOSES,
  inputsFromPicks,
  defaultSuggestion,
  type WalletInput,
} from "@/lib/money/seed";

// AI-suggested money split. Given a total and (optionally) the user's stated
// priorities, Gemini proposes purpose wallets with percentages. We map its
// output onto our purpose templates so the policy metadata stays trustworthy —
// the AI only decides *structure*, never the rules. Falls back to a sensible
// balanced split offline / on any error, so onboarding never stalls.

const KINDS = [...PURPOSES.map((p) => p.key), "custom"];

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    wallets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          kind: { type: SchemaType.STRING, enum: KINDS },
          percent: { type: SchemaType.NUMBER },
        },
        required: ["name", "kind", "percent"],
      },
    },
  },
  required: ["wallets"],
} as const;

export async function suggestSplit(
  total: number,
  goals?: string
): Promise<WalletInput[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return defaultSuggestion(total);

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      systemInstruction:
        "You help an average Nigerian split their locked money into purpose " +
        "wallets. Return 4-7 wallets whose percents sum to about 100. " +
        "Prioritise savings and essentials. Use 'kind' from the allowed list; " +
        "use 'custom' for anything else and give it a short, clear name " +
        "(e.g. 'School Fees', 'Business', 'Black Tax').",
      generationConfig: {
        responseMimeType: "application/json",
        // @ts-expect-error loose SDK schema typing across versions
        responseSchema: schema,
        temperature: 0.4,
      },
    });

    const prompt = `Total to split: ₦${total}. Priorities: ${
      goals?.trim() || "general balanced money management for an average Nigerian"
    }.`;
    const res = await model.generateContent(prompt);
    const data = JSON.parse(res.response.text()) as {
      wallets?: Array<{ name: string; kind: string; percent: number }>;
    };

    const picks = (data.wallets ?? [])
      .filter((w) => w && typeof w.percent === "number" && w.percent > 0)
      .map((w) =>
        w.kind && w.kind !== "custom"
          ? { key: w.kind, pct: w.percent }
          : { name: w.name, pct: w.percent }
      );

    const wallets = inputsFromPicks(total, picks);
    return wallets.length ? wallets : defaultSuggestion(total);
  } catch {
    return defaultSuggestion(total);
  }
}

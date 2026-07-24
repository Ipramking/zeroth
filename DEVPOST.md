# Zeroth — Devpost submission

**Elevator pitch:** Zeroth locks your money to its purpose and lets an AI agent
spend it in plain language — it can pay your bills, but by design it can never
cash out.

**Try it out**
- Live demo: https://zeroth-six.vercel.app
- Code: https://github.com/Ipramking/zeroth

---

## About the project

### Inspiration
The average Nigerian doesn't struggle to *earn* small money — they struggle to
*keep* it. Money meant for rent or data quietly leaks into impulse spends, and
the only "savings locks" available are blunt: either you can't touch the money
at all, or you can withdraw it the moment you're tempted. There was no middle
ground where money stays *useful* (you can still spend it on what it's for) but
can't be impulsively cashed out.

The name comes from the **Zeroth Law of Thermodynamics**: if two bodies are each
in equilibrium with a third body, they're in equilibrium with each other. We put
an **AI agent as that third body** between you and your money — every
transaction passes through it, so your rules always hold.

### What it does
You lock an amount you commit not to withdraw, and split it across purpose
wallets (Savings, Rent, Bills, Food, Airtime, Data — or your own custom ones).
Then you just *talk* to your agent:
- "Buy ₦500 airtime" → it tops up your line.
- "Abeg buy me 1k data" → it understands Pidgin.
- "Send ₦5k to 08145997956 PalmPay Samuel" → it asks **"what's it for?"**, then
  executes from the right wallet once you say "for feeding".
- "Cash out ₦40k to my bank" → 🔒 **blocked, by design** — locked money can't
  leak.

### How we built it
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui,
  Phosphor icons, a monochrome design system with smart light/dark theming.
- **AI:** Google **Gemini** (`gemini-flash-latest`) does two jobs, both with
  strict structured (JSON-schema) output:
  1. **Intent parsing** — turns messy natural language (Pidgin, slang, "5k",
     worded amounts) into a structured `PaymentIntent`.
  2. **AI money split** — from your stated priorities ("school fees, business,
     black tax") it proposes purpose wallets that sum exactly to your total.
- **The key idea:** the AI only ever produces *language → structure*. Every
  decision about money — which wallet funds it, per-transaction limits, balance
  checks, and the absolute refusal to cash out — is made by a **deterministic
  policy engine**. That's what makes it safe to let an AI move money: the model
  never decides anything about the money.
- **Multi-turn agent:** transfers with no stated purpose are held as a pending
  intent while the agent asks "what's it for?", then completed on your reply.
- **Deploy:** Vercel, self-contained demo mode (no login) so anyone can try it
  instantly; Gemini has an offline fallback so the demo survives bad wifi.

### What we learned
- The cleanest way to make an LLM trustworthy with money is to give it *no
  authority over money at all* — separate "understanding language" (AI) from
  "moving money" (deterministic rules).
- Gemini's structured-output + schema makes it reliable enough to sit in a real
  product loop, not just a chat box.
- Multi-turn state (ask → remember → complete) turns a rigid command parser into
  something that feels like an assistant.

### Challenges we faced
- **Distinguishing a peer transfer from a cash-out** — "send ₦5k to a person for
  feeding" must be allowed (spend), while "withdraw to my bank" must be blocked.
  We solved it by requiring a *purpose* to pick a funding wallet and asking for
  it when missing.
- **Making the AI split always sum to the total** — the model returns
  percentages; we normalise and fix rounding so wallets add up exactly.
- **Flaky venue wifi + Gemini quotas** — we added an offline regex fallback and
  pinned the working model, so the demo can't die on stage.
- **A cohesive monochrome redesign** — light + dark themes with no flash, driven
  entirely by design tokens.

### What's next
- Real payment rails (VTpass / Reloadly / Flutterwave Bills) behind the same
  interface.
- Persistent multi-user accounts and per-category autonomy budgets.
- Bank-statement onboarding to infer your starting split automatically.

---

## Built with (tags)
next.js · react · typescript · tailwind-css · shadcn-ui · google-gemini ·
gemini-api · generative-ai · ai-agent · fintech · programmable-money ·
policy-engine · vercel · web-speech-api · phosphor-icons · node.js · nigeria ·
pidgin · natural-language-processing · structured-output

---

## Team
- _<Member 1 name>_ — _<role, e.g. Full-stack / product / AI>_
- _<Member 2 name>_ — _<role>_

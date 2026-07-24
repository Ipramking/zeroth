# Zeroth — the third body between you and your money

**Your money. Your rules. Your AI agent.**

🔗 **Live demo:** https://zeroth-six.vercel.app
💻 **Code:** https://github.com/Ipramking/zeroth

## Why "Zeroth"

The **Zeroth Law of Thermodynamics**: if two bodies are each in equilibrium
with a third body, they are in equilibrium with each other. Zeroth puts an **AI
agent as that third body** between *you* and *your money*. Every transaction
passes through it, so your rules always hold — you and your money stay in
equilibrium no matter how tempted you are in the moment.

You lock your own money into purpose wallets (Airtime, Data, Food & Transport,
Bills, Rent) and delegate spending to the agent. You just *talk* to it —
_"buy ₦500 airtime"_, _"abeg pay my light bill"_ — and it executes real
payments. But the agent is **architecturally incapable of cashing out or
breaking your rules.** Tell it to send money to your bank and it refuses — by
design. The AI never touches money; it only *requests* actions.

## The problem

Nigerians don't struggle to *earn* small money — they struggle to *keep* it.
Money meant for rent or data leaks into impulse spends. Existing "savings locks"
are dumb: you either can't touch the money at all, or you can withdraw it the
moment you're tempted. There's no middle ground where money stays productive
(you can still spend it on what it's *for*) but can't be impulsively cashed out.

## How Zeroth works

You commit an amount you promise not to withdraw. Zeroth splits it into
purpose-locked wallets. From then on, you delegate spending to the agent in
plain language (English, Pidgin, slang, voice). Every request runs through a
deterministic policy engine before a single naira moves.

```
message → Gemini parses intent → POLICY ENGINE decides → payment rail executes → ledger + round-up savings
          (lib/agent/gemini.ts)   (lib/money/policy.ts)   (lib/money/provider.ts)  (lib/money/store.ts)
```

**The AI's only job is to fill a structured `PaymentIntent`.** Every decision
about money — which wallet funds it, per-transaction limits, balance checks, and
the absolute refusal to cash out — is made by the deterministic policy engine
(the third body's rules). That's the whole thesis: *an LLM can safely move money
because it never decides anything about the money — it only interprets language.*
Auditable, and reliable on stage.

## How AI is used (Gemini)

- **Model:** Google **Gemini** (`gemini-flash-latest`) via the Generative
  Language API, called with `temperature 0` and a strict JSON schema so it
  returns only a structured intent — never free-form actions.
- **What it does:** turns messy natural language into `{action, category,
  amount, recipient, network}`. It handles **Nigerian Pidgin and slang**
  (_"abeg send me 1k data"_), **worded amounts** (_"one thousand naira"_),
  shorthand (_"40k"_), and detects cash-out phrasing regardless of how it's
  worded.
- **Resilience:** if the API is unreachable (dead venue wifi), an offline regex
  parser takes over so the demo never dies. The policy engine and payment rail
  are 100% deterministic and never depend on the model.

## Try it (30 seconds)

Open the live link and tap into `/home` or `/agent`. Try, in order:

1. `buy ₦500 airtime` → ✅ executes, tops up your line, wallet debits.
2. `abeg buy me 1k data` (Pidgin) → ✅ executes from the Data wallet.
3. `buy ₦450 airtime` → ✅ executes **and rounds ₦50 into savings**.
4. `buy ₦9,000 airtime` → 🔒 blocked — above the wallet's per-payment limit.
5. **`cash out ₦40,000 to my bank` → 🔒 BLOCKED — "that's by design."** ← the point.

Reset restores the wallets between runs.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Runs in **demo mode** out of the box: no login, no database — an in-memory purse
shared for the session, so anyone can open the link and play immediately. For
real Gemini language understanding, add a key (free at
<https://aistudio.google.com/apikey>) to `.env.local`:

```
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-flash-latest
```

Without a key it still works — the offline parser handles common phrasings.

## What we'd build next

- **Real payment rails:** swap the mock `provider.ts` for a biller sandbox
  (VTpass / Reloadly / Flutterwave Bills) — the interface is already isolated.
- **Persistent multi-user accounts:** durable, private purses per user with
  proper auth, so balances survive across sessions and devices.
- **Autonomy budgets:** let the agent run recurring/standing payments within
  per-category caps you set, with a trust dashboard.
- **Bank-statement onboarding:** infer a starting wallet split from a real
  statement instead of manual entry.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Web Speech API
(voice) · Google Gemini · deployed on Vercel.

## Team

- _<add name>_ — _<role / what you built>_
- _<add name>_ — _<role / what you built>_

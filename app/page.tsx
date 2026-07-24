import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Lock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand";

const FEATURES = [
  {
    icon: Lock,
    title: "Purpose-locked money",
    body: "Split your funds into wallets that can only be spent on what you chose. No impulse cash-outs.",
  },
  {
    icon: Sparkles,
    title: "Just talk to it",
    body: "“Buy ₦500 airtime”, “pay my light bill”. The AI understands Pidgin, slang, and voice.",
  },
  {
    icon: ShieldCheck,
    title: "The AI can't break your rules",
    body: "A policy engine checks every action. The AI never touches money — it only requests.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5">
      <header className="flex items-center justify-between py-6">
        <BrandLockup />
        <Button asChild variant="ghost" size="sm">
          <Link href="/home">Open app</Link>
        </Button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="brand-text font-semibold">Zeroth</span>
          <span className="text-white/20">·</span>
          the third body between you and your money
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Give your money a purpose.
          <br />
          <span className="brand-text">Let your AI handle the rest.</span>
        </h1>

        <p className="animate-fade-up mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          Lock your funds to what they&apos;re for, then just tell your agent
          what to pay for. It executes real payments — but only what your rules
          allow. No cash-out. No leakage. No impulse spending.
        </p>

        <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="brand-bg h-12 px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95">
            <Link href="/onboarding">
              Get started free <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 border-white/10 bg-white/[0.02] px-7 text-base backdrop-blur hover:bg-white/[0.05]">
            <Link href="/home">
              <Mic className="mr-1" /> Try it now
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass animate-fade-up rounded-2xl p-5 text-left"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        Your money. Your rules. Your AI agent.
      </footer>
    </main>
  );
}

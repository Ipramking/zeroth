"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Mic } from "@/components/icons";
import { useMoney, naira, spendable, lockedForGoals } from "@/lib/client/use-money";
import { WalletIcon } from "@/components/wallet-icon";
import { ThemeToggle } from "@/components/theme-toggle";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { state, loading } = useMoney();
  const router = useRouter();
  const [cmd, setCmd] = useState("");

  const wallets = state?.wallets ?? [];
  const avail = spendable(wallets);
  const goals = lockedForGoals(wallets);
  const total = avail + goals + (state?.savings ?? 0);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!cmd.trim()) return;
    router.push(`/agent?send=${encodeURIComponent(cmd)}`);
  }

  return (
    <main className="px-5 pb-28 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">
            {greeting()}
            {state?.displayName ? `, ${state.displayName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Your money is working quietly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card font-display text-sm font-bold text-foreground">
            {state?.displayName ? state.displayName[0].toUpperCase() : "Z"}
          </span>
        </div>
      </header>

      {/* Balance */}
      <section className="surface mt-6 p-5">
        <p className="text-sm text-muted-foreground">Available to spend</p>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums">
          {loading ? "—" : naira(avail)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Across {wallets.length} active wallets
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          <Stat label="Locked for goals" value={naira(goals)} />
          <Stat label="Auto savings" value={naira(state?.savings ?? 0)} accent />
          <Stat label="Total managed" value={naira(total)} />
        </div>
      </section>

      {/* Wallets at a glance */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your money at a glance
          </h2>
          <Link href="/money" className="text-xs text-primary">
            See all
          </Link>
        </div>
        <div className="space-y-2">
          {wallets.slice(0, 4).map((w) => (
            <Link
              key={w.id}
              href="/money"
              className="surface flex items-center gap-3 p-3"
            >
              <WalletIcon category={w.category} />
              <span className="flex-1 text-sm font-medium">{w.name}</span>
              <span className="font-display font-semibold tabular-nums">
                {naira(w.balance)}
              </span>
            </Link>
          ))}
          {!loading && wallets.length === 0 && (
            <p className="surface p-4 text-sm text-muted-foreground">
              No wallets yet.
            </p>
          )}
        </div>
      </section>

      {/* AI command field */}
      <form
        onSubmit={ask}
        className="fixed inset-x-0 bottom-24 mx-auto flex max-w-md items-center gap-2 px-5"
      >
        <div className="surface-2 flex flex-1 items-center gap-2 px-4 py-2 shadow-lg shadow-black/40">
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            placeholder="What do you want your agent to do?"
            className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Ask agent"
            className="flex size-9 items-center justify-center rounded-full brand-bg"
          >
            <Mic className="size-4" strokeWidth={2} />
          </button>
        </div>
      </form>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

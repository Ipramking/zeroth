"use client";

import { Home, PiggyBank, Plus } from "@/components/icons";
import { useMoney, naira } from "@/lib/client/use-money";

export default function GoalsPage() {
  const { state, loading } = useMoney();
  const rent = state?.wallets.find((w) => w.category === "rent");
  const savings = state?.savings ?? 0;

  return (
    <main className="px-5 pb-28 pt-8">
      <h1 className="font-display text-xl font-bold">Goals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What your money is building toward.
      </p>

      <section className="mt-6 space-y-3">
        {rent && (
          <div className="surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Home className="size-5" strokeWidth={1.75} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">Rent</p>
                <p className="text-[11px] text-muted-foreground">
                  Locked vault · AI allocation on
                </p>
              </div>
            </div>
            <p className="mt-4 font-display text-2xl font-bold tabular-nums">
              {naira(rent.balance)}
            </p>
            <p className="text-xs text-muted-foreground">
              set an annual target to track your pace
            </p>
          </div>
        )}

        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PiggyBank className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Savings Vault</p>
              <p className="text-[11px] text-muted-foreground">
                Built from your everyday spending
              </p>
            </div>
          </div>
          <p className="mt-4 font-display text-2xl font-bold tabular-nums text-primary">
            {loading ? "—" : naira(savings)}
          </p>
        </div>

        <button className="surface flex w-full items-center justify-center gap-2 p-4 text-sm text-muted-foreground transition hover:text-foreground">
          <Plus className="size-4" /> New goal
        </button>
      </section>
    </main>
  );
}

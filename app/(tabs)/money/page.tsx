"use client";

import { useMoney, naira } from "@/lib/client/use-money";
import { WalletIcon } from "@/components/wallet-icon";

export default function MoneyPage() {
  const { state, loading } = useMoney();
  const wallets = state?.wallets ?? [];
  const total =
    wallets.reduce((s, w) => s + w.balance, 0) + (state?.savings ?? 0);

  return (
    <main className="px-5 pb-28 pt-8">
      <header>
        <h1 className="font-display text-xl font-bold">Your Money</h1>
        <p className="mt-3 text-sm text-muted-foreground">Total managed</p>
        <p className="font-display text-3xl font-bold tabular-nums">
          {loading ? "—" : naira(total)}
        </p>
      </header>

      <section className="mt-6 space-y-2.5">
        {wallets.map((w) => {
          const pct = w.rules.perTxnLimit
            ? Math.min(100, Math.round((w.balance / (w.balance + 1)) * 100))
            : 0;
          return (
            <div key={w.id} className="surface p-4">
              <div className="flex items-center gap-3">
                <WalletIcon category={w.category} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {w.locked ? "Locked" : "Open"} · limit{" "}
                    {naira(w.rules.perTxnLimit)}/txn
                  </p>
                </div>
                <p className="font-display font-semibold tabular-nums">
                  {naira(w.balance)}
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--elevated))]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(6, pct)}%` }}
                />
              </div>
            </div>
          );
        })}

        {!loading && wallets.length === 0 && (
          <p className="surface p-4 text-sm text-muted-foreground">
            No wallets yet — finish onboarding to set them up.
          </p>
        )}
      </section>
    </main>
  );
}

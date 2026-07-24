"use client";

import { useState } from "react";
import { Check, Lock, AlertTriangle } from "lucide-react";
import { useMoney, naira } from "@/lib/client/use-money";
import type { Transaction } from "@/lib/money/types";

type Filter = "all" | "payments" | "savings";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const { state, loading } = useMoney();
  const [filter, setFilter] = useState<Filter>("all");

  let txns = state?.transactions ?? [];
  if (filter === "payments") txns = txns.filter((t) => t.status === "success");
  if (filter === "savings") txns = txns.filter((t) => (t.savings ?? 0) > 0);

  const groups: Record<string, Transaction[]> = {};
  for (const t of txns) {
    const k = dayLabel(t.createdAt);
    (groups[k] ??= []).push(t);
  }

  return (
    <main className="px-5 pb-28 pt-8">
      <h1 className="font-display text-xl font-bold">Activity</h1>

      <div className="mt-4 flex gap-2">
        {(["all", "payments", "savings"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize transition ${
              filter === f
                ? "brand-bg"
                : "surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!loading && txns.length === 0 && (
        <div className="surface mt-6 p-6 text-center text-sm text-muted-foreground">
          Nothing yet. Ask your agent to make a payment and it&apos;ll show up
          here.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {Object.entries(groups).map(([day, items]) => (
          <section key={day}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {day}
            </p>
            <div className="space-y-2">
              {items.map((t) => (
                <div key={t.id} className="surface flex items-center gap-3 p-3">
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${
                      t.status === "success"
                        ? "bg-primary/10 text-primary"
                        : t.status === "blocked"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-amber-500"
                    }`}
                  >
                    {t.status === "success" ? (
                      <Check className="size-4" />
                    ) : t.status === "blocked" ? (
                      <Lock className="size-4" />
                    ) : (
                      <AlertTriangle className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize">
                      {t.category}
                      {t.status === "blocked" ? " — blocked" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {time(t.createdAt)} · by your agent
                      {t.savings ? ` · saved ${naira(t.savings)}` : ""}
                    </p>
                  </div>
                  <p
                    className={`font-display font-semibold tabular-nums ${
                      t.status === "blocked" ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {naira(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

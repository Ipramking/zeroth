"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { ArrowRight, ArrowLeft, Check, Sparkles, Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLockup } from "@/components/brand";
import { WalletIcon } from "@/components/wallet-icon";
import { SplitDonut } from "@/components/split-donut";
import {
  PURPOSES,
  defaultSuggestion,
  purposeToInput,
  customWallet,
  type WalletInput,
  type Purpose,
} from "@/lib/money/seed";
import { completeOnboarding } from "./actions";

const PRESETS = [50000, 100000, 150000, 250000];
// Monochrome ash ramp — tones of the ink colour, so it adapts to light/dark.
const PALETTE = [
  "hsl(var(--foreground) / 0.92)",
  "hsl(var(--foreground) / 0.70)",
  "hsl(var(--foreground) / 0.52)",
  "hsl(var(--foreground) / 0.38)",
  "hsl(var(--foreground) / 0.26)",
  "hsl(var(--foreground) / 0.82)",
  "hsl(var(--foreground) / 0.62)",
  "hsl(var(--foreground) / 0.46)",
  "hsl(var(--foreground) / 0.32)",
  "hsl(var(--foreground) / 0.20)",
];

type Row = WalletInput & { uid: string };

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
const withUid = (w: WalletInput): Row => ({ ...w, uid: uid() });
const naira = (n: number) => "₦" + Math.round(n).toLocaleString();

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [total, setTotal] = useState(150000);
  const [rows, setRows] = useState<Row[]>([]);
  const [goals, setGoals] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customName, setCustomName] = useState("");
  const [pending, startTransition] = useTransition();
  const autoRan = useRef(false);

  const allocated = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const remaining = total - allocated;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const color = (i: number) => PALETTE[i % PALETTE.length];
  const canFinish = rows.length > 0 && remaining === 0;
  const availablePresets = PURPOSES.filter(
    (p) => !rows.some((r) => r.name.toLowerCase() === p.name.toLowerCase())
  );

  const runAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const r = await fetch("/api/suggest-split", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ total, goals }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.wallets) && d.wallets.length) {
          setRows(d.wallets.map(withUid));
        }
      }
    } catch {
      /* keep whatever split is on screen */
    }
    setAiLoading(false);
  }, [total, goals]);

  // On first entering the split step: show an instant balanced split, then let
  // AI personalise it in the background.
  useEffect(() => {
    if (step === 2 && !autoRan.current) {
      autoRan.current = true;
      setRows(defaultSuggestion(total).map(withUid));
      runAI();
    }
  }, [step, total, runAI]);

  function setAmount(id: string, raw: string) {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    setRows((prev) =>
      prev.map((r) => (r.uid === id ? { ...r, amount: isNaN(n) ? 0 : n } : r))
    );
  }
  function setRowName(id: string, val: string) {
    setRows((prev) => prev.map((r) => (r.uid === id ? { ...r, name: val } : r)));
  }
  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.uid !== id));
  }
  function addPreset(p: Purpose) {
    setRows((prev) => [
      ...prev,
      withUid(purposeToInput(p, Math.max(0, remaining))),
    ]);
  }
  function addCustom() {
    if (!customName.trim()) return;
    setRows((prev) => [
      ...prev,
      withUid(customWallet(customName, Math.max(0, remaining))),
    ]);
    setCustomName("");
  }
  // Scale every amount proportionally so the split sums exactly to the total.
  function autoFit() {
    setRows((prev) => {
      if (!prev.length) return prev;
      const sum = prev.reduce((s, r) => s + (r.amount || 0), 0);
      const scaled =
        sum <= 0
          ? prev.map((r) => ({ ...r, amount: Math.floor(total / prev.length) }))
          : prev.map((r) => ({
              ...r,
              amount: Math.max(0, Math.round(((r.amount || 0) * total) / sum)),
            }));
      const diff = total - scaled.reduce((s, r) => s + r.amount, 0);
      if (diff !== 0) {
        let bi = 0;
        scaled.forEach((r, i) => (r.amount > scaled[bi].amount ? (bi = i) : null));
        scaled[bi] = { ...scaled[bi], amount: scaled[bi].amount + diff };
      }
      return scaled;
    });
  }

  function finish() {
    const wallets: WalletInput[] = rows.map((r) => ({
      name: r.name,
      category: r.category,
      categories: r.categories,
      amount: r.amount,
      perTxnLimit: r.perTxnLimit,
      allowCashout: r.allowCashout,
    }));
    startTransition(async () => {
      await completeOnboarding({ displayName: name, wallets });
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <BrandLockup />
        <span className="text-xs text-muted-foreground">Step {step + 1} of 3</span>
      </div>

      <div className="mb-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "brand-bg" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="animate-fade-up flex flex-1 flex-col">
          <h1 className="font-display text-2xl font-bold">
            What should your agent call you?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Just a first name is fine.
          </p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ada"
            className="mt-6 h-12 rounded-xl border-border bg-muted/50 text-base"
          />
          <div className="mt-auto pt-8">
            <Button
              onClick={() => setStep(1)}
              disabled={!name.trim()}
              className="brand-bg h-12 w-full rounded-xl text-base text-primary-foreground"
            >
              Continue <ArrowRight className="ml-1" />
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="animate-fade-up flex flex-1 flex-col">
          <h1 className="font-display text-2xl font-bold">
            How much do you want to lock?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Money you commit not to withdraw. Your agent spends it — you can&apos;t
            impulse-cash-out.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-1 text-3xl font-bold">
              <span className="text-muted-foreground">₦</span>
              <input
                inputMode="numeric"
                value={total ? total.toLocaleString() : ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setTotal(isNaN(n) ? 0 : n);
                }}
                className="w-full bg-transparent font-display outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setTotal(p)}
                className={`rounded-xl border py-2 text-xs transition ${
                  total === p
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {naira(p)}
              </button>
            ))}
          </div>

          <div className="mt-auto flex gap-3 pt-8">
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="h-12 rounded-xl border-border bg-muted/50"
            >
              <ArrowLeft />
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={total < 1000}
              className="brand-bg h-12 flex-1 rounded-xl text-base text-primary-foreground"
            >
              Continue <ArrowRight className="ml-1" />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="animate-fade-up flex flex-1 flex-col">
          <h1 className="font-display text-2xl font-bold">Here&apos;s your split</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Zeroth suggested a split for your {naira(total)}. Tweak any amount,
            rename, add your own purposes — or let AI redo it. Your money, your
            structure.
          </p>

          {/* AI control */}
          <div className="mt-4 rounded-2xl border border-border bg-muted/50 p-2.5">
            <div className="flex items-center gap-2">
              <input
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Your priorities (e.g. saving for school, black tax)"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                onClick={runAI}
                disabled={aiLoading}
                size="sm"
                className="brand-bg h-9 shrink-0 rounded-lg px-3 text-xs text-primary-foreground"
              >
                {aiLoading ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 size-4" />
                )}
                {aiLoading ? "Thinking…" : "Suggest with AI"}
              </Button>
            </div>
          </div>

          {/* Donut */}
          <div className="mt-5">
            <SplitDonut
              total={total}
              segments={rows.map((r, i) => ({
                label: r.name,
                value: r.amount || 0,
                color: color(i),
              }))}
            />
          </div>

          {/* Wallet rows */}
          <div className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.uid}
                className="glass flex items-center gap-2.5 rounded-2xl p-2.5"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: color(i) }}
                />
                <WalletIcon
                  category={r.category}
                  name={r.name}
                  className="size-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <input
                    value={r.name}
                    onChange={(e) => setRowName(r.uid, e.target.value)}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {pct(r.amount || 0)}%
                    {r.categories.length === 0 ? " · locked vault" : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="text-sm text-muted-foreground">₦</span>
                  <input
                    inputMode="numeric"
                    value={r.amount ? r.amount.toLocaleString() : ""}
                    onChange={(e) => setAmount(r.uid, e.target.value)}
                    placeholder="0"
                    className="w-[68px] bg-transparent text-right text-sm font-semibold tabular-nums outline-none"
                  />
                </div>
                <button
                  onClick={() => remove(r.uid)}
                  aria-label={`Remove ${r.name}`}
                  className="shrink-0 text-muted-foreground transition hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add wallet */}
          {adding ? (
            <div className="mt-2 rounded-2xl border border-border bg-muted/50 p-3">
              {availablePresets.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {availablePresets.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => addPreset(p)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder="Or type your own purpose…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  onClick={addCustom}
                  disabled={!customName.trim()}
                  size="sm"
                  className="brand-bg h-9 rounded-lg px-3 text-xs text-primary-foreground"
                >
                  Add
                </Button>
              </div>
              <button
                onClick={() => setAdding(false)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="size-4" /> Add wallet
            </button>
          )}

          {/* Allocation status */}
          <div
            className={`mt-4 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
              remaining === 0
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-muted"
            }`}
          >
            <span className="text-muted-foreground">
              Allocated{" "}
              <span className="font-semibold text-foreground">
                {naira(allocated)}
              </span>{" "}
              of {naira(total)}
            </span>
            {remaining === 0 ? (
              <span className="font-medium text-primary">Balanced ✓</span>
            ) : (
              <button
                onClick={autoFit}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {remaining > 0 ? `${naira(remaining)} left` : `${naira(-remaining)} over`}{" "}
                · Auto-fit
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={pending}
              className="h-12 rounded-xl border-border bg-muted/50"
            >
              <ArrowLeft />
            </Button>
            <Button
              onClick={finish}
              disabled={pending || !canFinish}
              className="brand-bg h-12 flex-1 rounded-xl text-base text-primary-foreground"
            >
              {pending ? (
                "Setting up…"
              ) : (
                <>
                  <Check className="mr-1" /> Lock it in
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

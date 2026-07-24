"use client";

import { useState, useTransition } from "react";
import { ArrowRight, ArrowLeft, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLockup } from "@/components/brand";
import { allocate } from "@/lib/money/seed";
import { completeOnboarding } from "./actions";

const PRESETS = [50000, 100000, 150000, 250000];

function naira(n: number) {
  return "₦" + n.toLocaleString();
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [total, setTotal] = useState(150000);
  const [pending, startTransition] = useTransition();

  const allocations = allocate(total || 0);

  function finish() {
    startTransition(async () => {
      await completeOnboarding({ displayName: name, total });
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <BrandLockup />
        <span className="text-xs text-muted-foreground">Step {step + 1} of 3</span>
      </div>

      {/* progress */}
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
            className="mt-6 h-12 rounded-xl border-white/10 bg-white/[0.03] text-base"
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

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
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
              className="h-12 rounded-xl border-white/10 bg-white/[0.03]"
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
          <h1 className="font-display text-2xl font-bold">
            Here&apos;s your split
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {naira(total)} locked across {allocations.length} purpose wallets. You
            can change amounts anytime later.
          </p>

          <div className="mt-6 space-y-2.5">
            {allocations.map((a) => (
              <div
                key={a.slug}
                className="glass flex items-center justify-between rounded-2xl p-4"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="size-3.5 text-muted-foreground" />
                  {a.name}
                </span>
                <span className="font-display font-semibold">
                  {naira(a.balance)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex gap-3 pt-8">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={pending}
              className="h-12 rounded-xl border-white/10 bg-white/[0.03]"
            >
              <ArrowLeft />
            </Button>
            <Button
              onClick={finish}
              disabled={pending}
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

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mic, Send, RotateCcw } from "@/components/icons";
import { AgentMark, type AgentState } from "@/components/agent-mark";
import type { Transaction } from "@/lib/money/types";

interface ChatMsg {
  role: "user" | "agent";
  text: string;
  status?: Transaction["status"];
}

const SUGGESTIONS = [
  "Buy ₦480 airtime for 08031234567",
  "Buy ₦1,350 data for 08031234567",
  "Pay ₦1,750 for lunch",
  "How much do I have for transport?",
];

function AgentInner() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const agentState: AgentState = busy
    ? "thinking"
    : listening
      ? "listening"
      : "idle";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, busy]);

  // Auto-send a command passed from the Home screen (?send=...).
  useEffect(() => {
    const q = params.get("send");
    if (q && !started.current) {
      started.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: data.result.message,
          status: data.result.transaction.status,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Network error — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Voice needs Chrome.");
    const rec = new SR();
    rec.lang = "en-NG";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => send(e.results[0][0].transcript);
    rec.start();
  }

  async function reset() {
    await fetch("/api/state", { method: "POST" });
    setMessages([]);
  }

  const empty = messages.length === 0 && !busy;

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pt-8">
        <div className="flex items-center gap-3">
          <AgentMark size={34} state={agentState} />
          <div>
            <h1 className="font-display text-base font-bold">
              Your Financial Agent
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-positive" />
              {busy ? "Working…" : "Ready to act"}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {empty && (
          <div className="flex flex-col items-center pt-12 text-center">
            <AgentMark size={96} state="idle" />
            <h2 className="mt-8 font-display text-2xl font-bold">
              How can I help
              <br />
              with your money?
            </h2>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`animate-pop max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-[hsl(var(--elevated))]"
                  : m.status === "blocked"
                    ? "rounded-bl-md border border-destructive/40 bg-destructive/10"
                    : m.status === "success"
                      ? "rounded-bl-md border border-primary/25 bg-primary/[0.06]"
                      : "rounded-bl-md surface"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="surface flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground">
              <AgentMark size={18} state="thinking" /> thinking…
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-28">
        {empty && (
          <div className="mb-3 space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="surface flex w-full items-center px-4 py-2.5 text-left text-sm text-muted-foreground transition hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="surface-2 flex items-center gap-2 px-3 py-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell your agent anything…"
            disabled={busy}
            className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={startVoice}
            aria-label="Speak"
            className={`flex size-9 items-center justify-center rounded-full transition ${
              listening ? "brand-bg" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic className="size-4" strokeWidth={2} />
          </button>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex size-9 items-center justify-center rounded-full brand-bg disabled:opacity-40"
          >
            <Send className="size-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AgentPage() {
  return (
    <Suspense>
      <AgentInner />
    </Suspense>
  );
}

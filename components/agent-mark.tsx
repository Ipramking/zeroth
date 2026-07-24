import { cn } from "@/lib/utils";
import { ZerothLogo } from "./brand";

export type AgentState = "idle" | "listening" | "thinking" | "complete";

// The agent's on-screen identity: the Zeroth monogram inside a neutral ring.
// When it's listening/thinking, a soft ring pulses behind it.
export function AgentMark({
  size = 40,
  state = "idle",
  className,
}: {
  size?: number;
  state?: AgentState;
  className?: string;
}) {
  const active = state === "listening" || state === "thinking";
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border border-border bg-card",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {active && (
        <span className="animate-mark-pulse absolute inset-0 rounded-full bg-foreground/10" />
      )}
      <ZerothLogo size={size * 0.52} className="relative text-foreground" />
    </div>
  );
}

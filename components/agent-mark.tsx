import { cn } from "@/lib/utils";

export type AgentState = "idle" | "listening" | "thinking" | "complete";

// The brand's signature AI symbol: four rounded nodes around a core.
// State drives motion (listening = ring pulse, thinking = nodes orbit).
export function AgentMark({
  size = 40,
  state = "idle",
  className,
}: {
  size?: number;
  state?: AgentState;
  className?: string;
}) {
  return (
    <div
      className={cn("agent-mark", className)}
      data-state={state}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="agent-ring" />
      <span className="agent-nodes">
        <span className="agent-node n-top" />
        <span className="agent-node n-right" />
        <span className="agent-node n-bottom" />
        <span className="agent-node n-left" />
        <span className="agent-core" />
      </span>
    </div>
  );
}

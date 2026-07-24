import { cn } from "@/lib/utils";
import { AgentMark } from "./agent-mark";

export function BrandMark({ className }: { className?: string }) {
  return <AgentMark size={30} className={className} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-bold tracking-tight", className)}>
      Zeroth
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <Wordmark />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Target, ListChecks } from "lucide-react";
import { AgentMark } from "./agent-mark";
import { cn } from "@/lib/utils";

const LEFT = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/money", label: "Money", icon: Wallet },
];
const RIGHT = [
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/activity", label: "Activity", icon: ListChecks },
];

export function BottomNav() {
  const pathname = usePathname();
  const agentActive = pathname.startsWith("/agent");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
      <div className="mx-3 mb-3 flex items-end justify-between rounded-2xl border border-white/[0.06] bg-[hsl(var(--elevated))]/95 px-2 py-2 backdrop-blur-sm">
        {LEFT.map((t) => (
          <NavItem key={t.href} {...t} active={pathname.startsWith(t.href)} />
        ))}

        {/* Center — the Agent, emphasized. */}
        <Link
          href="/agent"
          aria-label="Agent"
          className="relative -mt-7 flex flex-col items-center"
        >
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-full border transition",
              agentActive
                ? "border-primary/50 bg-primary/15"
                : "border-white/10 bg-[hsl(var(--card))]"
            )}
          >
            <AgentMark size={30} state={agentActive ? "listening" : "idle"} />
          </span>
        </Link>

        {RIGHT.map((t) => (
          <NavItem key={t.href} {...t} active={pathname.startsWith(t.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-[56px] flex-col items-center gap-1 rounded-xl py-1 text-[10px] transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

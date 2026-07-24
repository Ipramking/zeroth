import {
  Home,
  Utensils,
  Smartphone,
  Wifi,
  Bus,
  GraduationCap,
  Receipt,
  PiggyBank,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/money/types";
import { cn } from "@/lib/utils";

const ICONS: Record<Category, LucideIcon> = {
  airtime: Smartphone,
  data: Wifi,
  food: Utensils,
  transport: Bus,
  bills: Receipt,
  rent: Home,
  general: Coins,
};

const EXTRA: Record<string, LucideIcon> = {
  education: GraduationCap,
  savings: PiggyBank,
};

export function WalletIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[category as Category] ?? EXTRA[category] ?? Coins;
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-xl bg-[hsl(var(--elevated))] text-primary",
        className
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

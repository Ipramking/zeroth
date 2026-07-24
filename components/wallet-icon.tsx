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
  Shield,
  TrendingUp,
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

// For custom / vault wallets (category "general"), infer a fitting icon from
// the wallet name so "Savings", "Emergency", "Investments", "School Fees" etc.
// don't all look the same.
const NAME_HINTS: Array<[RegExp, LucideIcon]> = [
  [/sav|piggy|target|goal/i, PiggyBank],
  [/emerg|safety|rainy|shield|backup/i, Shield],
  [/invest|stock|crypto|grow|business|biz|profit/i, TrendingUp],
  [/school|educat|tuition|fees|book/i, GraduationCap],
  [/rent|house|home|apartment|accommodation/i, Home],
  [/food|market|groc|eat|feeding/i, Utensils],
  [/transport|fare|fuel|ride/i, Bus],
  [/bill|electric|util|light|nepa/i, Receipt],
  [/data|internet|wifi/i, Wifi],
  [/airtime|call|recharge|credit/i, Smartphone],
];

export function WalletIcon({
  category,
  name,
  className,
}: {
  category: string;
  name?: string;
  className?: string;
}) {
  let Icon = ICONS[category as Category];
  if (!Icon || category === "general") {
    const hint = name
      ? NAME_HINTS.find(([re]) => re.test(name))?.[1]
      : undefined;
    Icon = hint ?? ICONS[category as Category] ?? Coins;
  }
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-foreground",
        className
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

// Central icon set for the whole app — Phosphor Icons (a refined, professional
// technical set). Re-exported under the app's existing names so usage stays the
// same. Phosphor icons use React context, so every file that renders them must
// be a client component.
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

export type IconType = ComponentType<IconProps>;

export {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  Shield,
  Sparkle as Sparkles,
  Lock,
  Microphone as Mic,
  PaperPlaneRight as Send,
  ArrowCounterClockwise as RotateCcw,
  Check,
  X,
  Plus,
  CircleNotch as Loader2,
  House as Home,
  Wallet,
  Target,
  ListChecks,
  DeviceMobile as Smartphone,
  WifiHigh as Wifi,
  ForkKnife as Utensils,
  Bus,
  Receipt,
  GraduationCap,
  PiggyBank,
  Coins,
  TrendUp as TrendingUp,
  Moon,
  Sun,
  Warning as AlertTriangle,
} from "@phosphor-icons/react";

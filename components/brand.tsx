import { cn } from "@/lib/utils";

// Zeroth monogram — an interlocking double-hook (the "third body" tying two
// halves together). Drawn in currentColor so it flips black/white with the
// theme. To use the exact brand asset instead, drop it at /public/logo.svg and
// swap this for an <img src="/logo.svg" className="dark:invert" />.
export function ZerothLogo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        d="M50 6C73 6 91 23 91 47C91 65 79 77 61 81L57 59C67 57 71 51 71 45C71 35 61 29 50 29C46 29 42 30 39 32L33 11C38 8 44 6 50 6Z"
      />
      <path
        d="M50 114C27 114 9 97 9 73C9 55 21 43 39 39L43 61C33 63 29 69 29 75C29 85 39 91 50 91C54 91 58 90 61 88L67 109C62 112 56 114 50 114Z"
      />
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return <ZerothLogo size={22} className={cn("text-foreground", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-lg font-bold tracking-tight text-foreground",
        className
      )}
    >
      Zeroth
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandMark />
      <Wordmark />
    </div>
  );
}

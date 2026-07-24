import { BottomNav } from "@/components/bottom-nav";

// Mobile app shell: a phone-width column with a fixed bottom nav.
export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto min-h-dvh max-w-md">
      {children}
      <BottomNav />
    </div>
  );
}

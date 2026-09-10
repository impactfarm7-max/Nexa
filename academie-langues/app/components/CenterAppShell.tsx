"use client";

import CenterSidebar from "@/app/components/CenterSidebar";
import CenterBottomNav from "@/app/components/CenterBottomNav";

type CenterAppShellProps = {
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
};

export default function CenterAppShell({
  children,
  className = "bg-[#FFFBF7]",
  mainClassName = "flex-1 min-w-0 w-full min-h-[100dvh]",
}: CenterAppShellProps) {
  return (
    <div className={`flex min-h-[100dvh] w-full overflow-x-hidden ${className}`}>
      <CenterSidebar />
      <main
        style={{ marginLeft: "var(--nexa-center-sidebar-w, 0px)" }}
        className={`transition-[margin] duration-300 ease-in-out ${mainClassName}`}
      >
        {children}
      </main>
      <CenterBottomNav />
    </div>
  );
}

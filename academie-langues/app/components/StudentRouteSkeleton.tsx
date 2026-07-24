type StudentRouteSkeletonProps = {
  /** Main area only — sidebar is already rendered by ClientLayout */
  contentOnly?: boolean;
  variant?: "dashboard" | "page";
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} />;
}

function StudentSidebarSkeleton() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col overflow-hidden bg-[#11224E] border-r border-white/10 md:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/5 px-6">
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl bg-white/10" />
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-20 bg-white/25" />
          <SkeletonBlock className="h-2 w-14 bg-[#eb670e]/40" />
        </div>
      </div>

      <div className="border-b border-white/5 p-4">
        <SkeletonBlock className="h-11 w-full rounded-2xl bg-white/5" />
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={`flex h-11 items-center gap-3 rounded-2xl px-4 ${
              index === 0 ? "bg-[#eb670e]/90" : "bg-white/5"
            }`}
          >
            <SkeletonBlock className={`h-4 w-4 shrink-0 ${index === 0 ? "bg-white/40" : "bg-white/20"}`} />
            <SkeletonBlock className={`h-2.5 ${index === 0 ? "w-28 bg-white/35" : "w-32 bg-white/20"}`} />
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-full bg-white/10" />
          <SkeletonBlock className="h-2.5 w-24 bg-white/20" />
        </div>
      </div>
    </aside>
  );
}

function StudentMainSkeleton({
  variant,
  withSidebarOffset,
}: {
  variant: "dashboard" | "page";
  withSidebarOffset: boolean;
}) {
  const mainClass = withSidebarOffset ? "min-w-0 flex-1 md:ml-64" : "min-w-0 flex-1 w-full";

  if (variant === "page") {
    return (
      <main className={mainClass}>
        <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col justify-center px-4 py-8 md:px-8">
          <SkeletonBlock className="mb-4 h-8 w-48 bg-neutral-200" />
          <SkeletonBlock className="h-4 w-72 max-w-full bg-neutral-100" />
          <div className="mt-8 space-y-3">
            <SkeletonBlock className="h-14 w-full bg-white shadow-sm ring-1 ring-neutral-200" />
            <SkeletonBlock className="h-14 w-full bg-white shadow-sm ring-1 ring-neutral-200" />
            <SkeletonBlock className="h-14 w-5/6 bg-white shadow-sm ring-1 ring-neutral-200" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={mainClass}>
      <div className="min-h-[100dvh] bg-[#FAFAFA] pb-24 font-sans">
        <header className="border-b border-neutral-200/50 bg-white/80 py-4 backdrop-blur-xl md:py-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 md:px-8">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24 bg-neutral-200" />
              <SkeletonBlock className="h-8 w-48 max-w-[60vw] bg-neutral-200" />
            </div>
            <div className="flex gap-2 md:gap-3">
              <SkeletonBlock className="hidden h-10 w-24 rounded-full bg-neutral-100 sm:block md:h-12" />
              <SkeletonBlock className="h-10 w-10 rounded-full bg-neutral-100 md:h-12 md:w-12" />
              <SkeletonBlock className="h-10 w-10 rounded-full bg-orange-50 md:h-12 md:w-12" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8">
          <SkeletonBlock className="mb-8 h-52 w-full rounded-[2rem] bg-neutral-200/70 md:h-56" />
          <SkeletonBlock className="mb-5 ml-1 h-5 w-40 bg-neutral-200" />
          <div className="mb-10 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-32 rounded-2xl bg-neutral-200/60 md:h-40 md:rounded-[2rem]" />
            ))}
          </div>
          <SkeletonBlock className="mb-5 ml-1 h-5 w-44 bg-neutral-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-40 rounded-[1.75rem] bg-neutral-200/50" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function StudentRouteSkeleton({
  contentOnly = false,
  variant = "dashboard",
}: StudentRouteSkeletonProps) {
  if (contentOnly) {
    return (
      <div className="min-h-[100dvh] overflow-x-hidden bg-[#FAFAFA] pb-24 font-sans">
        <StudentMainSkeleton variant={variant} withSidebarOffset={false} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-[#FAFAFA] text-slate-950">
      <StudentSidebarSkeleton />
      <StudentMainSkeleton variant={variant} withSidebarOffset />
    </div>
  );
}

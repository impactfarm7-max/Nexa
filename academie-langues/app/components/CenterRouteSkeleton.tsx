type CenterRouteSkeletonProps = {
  variant?: "light" | "dark";
  mode?: "center" | "student" | "admin" | "account";
  /** Main area only — real CenterSidebar is already mounted */
  contentOnly?: boolean;
  /** Classe optionnelle ajoutée au conteneur (ex. fond personnalisé). */
  className?: string;
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} />;
}

const ORANGE_GRADIENT = "linear-gradient(175deg, #f97316 0%, #ea580c 60%, #c2410c 100%)";

function CenterSidebarSkeleton() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col overflow-hidden md:flex"
      style={{ background: ORANGE_GRADIENT }}
    >
      <div className="flex h-[68px] items-center gap-2.5 border-b border-black/10 px-3">
        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-xl bg-black/20" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-32 bg-white/35" />
          <SkeletonBlock className="h-2 w-20 bg-white/20" />
        </div>
        <SkeletonBlock className="h-7 w-7 rounded-xl bg-black/10" />
      </div>

      <div className="px-3 pt-3">
        <SkeletonBlock className="h-9 w-full rounded-xl bg-black/10" />
      </div>

      <nav className="flex-1 space-y-2 px-2.5 py-5">
        <SkeletonBlock className="mb-3 h-2 w-24 bg-white/20" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={`flex h-10 items-center gap-3 rounded-xl px-3 ${
              index === 0 ? "bg-[#11224E]" : "bg-black/5"
            }`}
          >
            <SkeletonBlock className="h-4 w-4 shrink-0 rounded-md bg-white/35" />
            <SkeletonBlock className={`h-2.5 bg-white/30 ${index % 3 === 0 ? "w-28" : "w-36"}`} />
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-black/10 bg-black/10 px-4 py-3">
        <SkeletonBlock className="h-8 w-8 rounded-full bg-[#11224E]" />
        <div className="space-y-2">
          <SkeletonBlock className="h-2.5 w-24 bg-white/35" />
          <SkeletonBlock className="h-2 w-16 bg-white/20" />
        </div>
      </div>
    </aside>
  );
}

function CenterMainSkeleton({
  mode,
  variant,
  withSidebarOffset,
}: {
  mode: CenterRouteSkeletonProps["mode"];
  variant: CenterRouteSkeletonProps["variant"];
  withSidebarOffset: boolean;
}) {
  const isAccount = mode === "account";
  const isDark = variant === "dark";
  const mainClass = withSidebarOffset ? "min-w-0 flex-1 md:ml-64" : "min-w-0 flex-1";

  return (
    <main className={mainClass}>
      <header
        className={`sticky top-0 z-30 flex h-[53px] items-center justify-between border-b px-4 backdrop-blur-md md:px-6 ${
          isDark
            ? "border-slate-800 bg-[#0b111d]/95"
            : "border-neutral-200/70 bg-white/95"
        }`}
      >
        <SkeletonBlock className={`h-2.5 w-28 ${isDark ? "bg-slate-800" : "bg-neutral-200"}`} />
        <div className="flex items-center gap-3">
          <SkeletonBlock className={`h-8 w-8 rounded-full ${isDark ? "bg-slate-800" : "bg-neutral-100"}`} />
          <SkeletonBlock className={`h-7 w-20 rounded-lg ${isDark ? "bg-slate-800" : "bg-orange-50"}`} />
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2.5">
            <SkeletonBlock className={`h-2.5 w-36 ${isDark ? "bg-slate-800" : "bg-neutral-200"}`} />
            <SkeletonBlock
              className={`h-7 max-w-[72vw] ${isDark ? "bg-slate-700" : "bg-neutral-200"} ${
                isAccount ? "w-52" : "w-64"
              }`}
            />
          </div>
          <SkeletonBlock className={`h-8 w-36 rounded-xl ${isDark ? "bg-slate-800" : "bg-neutral-100"}`} />
        </div>

        {isAccount ? (
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr]">
            <SkeletonBlock
              className={`h-[34rem] shadow-sm ring-1 ${
                isDark ? "bg-slate-900 ring-slate-800" : "bg-white ring-neutral-200"
              }`}
            />
            <div className="space-y-5">
              <SkeletonBlock
                className={`h-20 shadow-sm ring-1 ${
                  isDark ? "bg-slate-900 ring-slate-800" : "bg-white ring-neutral-200"
                }`}
              />
              <SkeletonBlock
                className={`h-72 shadow-sm ring-1 ${
                  isDark ? "bg-slate-900 ring-slate-800" : "bg-white ring-neutral-200"
                }`}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-52 rounded-2xl border p-5 shadow-sm ${
                    isDark ? "border-slate-800 bg-slate-900" : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <SkeletonBlock className={`h-10 w-10 rounded-xl ${isDark ? "bg-orange-600/20" : "bg-orange-50"}`} />
                    <SkeletonBlock className={`h-4 w-4 ${isDark ? "bg-slate-800" : "bg-neutral-100"}`} />
                  </div>
                  <SkeletonBlock className={`mb-5 h-2.5 w-28 ${isDark ? "bg-slate-800" : "bg-neutral-200"}`} />
                  <div className="space-y-3">
                    <SkeletonBlock className={`h-3 w-full ${isDark ? "bg-slate-800" : "bg-neutral-100"}`} />
                    <SkeletonBlock className={`h-3 w-5/6 ${isDark ? "bg-slate-800" : "bg-neutral-100"}`} />
                    <SkeletonBlock className={`h-3 w-3/4 ${isDark ? "bg-slate-800" : "bg-neutral-100"}`} />
                  </div>
                </div>
              ))}
            </div>
            <SkeletonBlock className={`h-5 w-36 ${isDark ? "bg-slate-800" : "bg-neutral-200"}`} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className={`h-24 shadow-sm ring-1 ${
                    isDark ? "bg-slate-900 ring-slate-800" : "bg-white ring-neutral-200"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function CenterRouteSkeleton({
  variant = "light",
  mode = "center",
  contentOnly = false,
  className,
}: CenterRouteSkeletonProps) {
  const shellBg = variant === "dark" ? "bg-[#0b111d] text-slate-100" : "bg-[#FAFAFA] text-slate-950";

  if (contentOnly) {
    return (
      <div className={`min-h-[100dvh] ${shellBg} ${className ?? ""}`}>
        <CenterMainSkeleton mode={mode} variant={variant} withSidebarOffset={false} />
      </div>
    );
  }

  return (
    <div className={`flex min-h-[100dvh] ${shellBg} ${className ?? ""}`}>
      <CenterSidebarSkeleton />
      <CenterMainSkeleton mode={mode} variant={variant} withSidebarOffset />
    </div>
  );
}

"use client";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200/80 ${className}`} />;
}

type Variant = "students-panel" | "finance-body" | "courses-grid";

export default function CenterContentSkeleton({ variant }: { variant: Variant }) {
  if (variant === "students-panel") {
    return (
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-[310px] flex flex-col border-r border-neutral-200 bg-white shrink-0">
          <div className="px-4 py-4 border-b border-neutral-100 space-y-3">
            <Block className="h-2.5 w-24" />
            <Block className="h-8 w-16" />
          </div>
          <div className="px-3 py-2.5 border-b border-neutral-100 flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Block key={i} className="h-7 w-20 shrink-0" />
            ))}
          </div>
          <div className="px-3 py-3 border-b border-neutral-100">
            <Block className="h-9 w-full" />
          </div>
          <div className="flex-1 p-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Block className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Block className="h-3 w-32" />
                  <Block className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#F7F7F6]">
          <Block className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (variant === "finance-body") {
    return (
      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-neutral-200/80 space-y-3">
              <Block className="h-2 w-20" />
              <Block className="h-7 w-28" />
              <Block className="h-2 w-16" />
            </div>
          ))}
        </div>
        <Block className="h-11 w-96 max-w-full" />
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3">
          <Block className="h-10 w-full max-w-sm" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Block className="h-10 w-10 rounded-xl" />
              <Block className="h-5 w-14 rounded-full" />
            </div>
            <Block className="h-4 w-3/4" />
            <Block className="h-3 w-1/2" />
            <Block className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

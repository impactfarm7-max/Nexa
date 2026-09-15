"use client";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200/80 ${className}`} />;
}

type Variant = "students-panel" | "finance-body" | "courses-grid";

export default function CenterContentSkeleton({ variant }: { variant: Variant }) {
  if (variant === "students-panel") {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <Block className="h-8 w-64 rounded-lg" />
          <div className="flex items-center gap-2">
            <Block className="h-9 w-40 rounded-lg" />
            <Block className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="border border-black/[0.08] rounded-lg bg-white overflow-hidden">
          <div className="grid grid-cols-6 gap-2 px-4 py-3 bg-[#F7F7F6] border-b border-black/[0.08]">
            {Array.from({ length: 6 }).map((_, i) => (
              <Block key={i} className="h-2.5 w-3/4" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 items-center px-4 py-3.5 border-b border-black/[0.05] last:border-b-0">
              <div className="space-y-1.5">
                <Block className="h-3 w-4/5" />
                <Block className="h-2.5 w-2/3" />
              </div>
              <Block className="h-3 w-16" />
              <Block className="h-3 w-20" />
              <Block className="h-5 w-14 rounded-full" />
              <Block className="h-3 w-16" />
              <div className="flex items-center gap-1.5 justify-center">
                <Block className="h-7 w-14 rounded-md" />
                <Block className="h-7 w-16 rounded-md" />
              </div>
            </div>
          ))}
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

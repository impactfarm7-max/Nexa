"use client";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-neutral-200/80 ${className}`} />;
}

type Props = {
  variant: "generic" | "tcf";
};

export default function DashboardStatsSkeleton({ variant }: Props) {
  if (variant === "tcf") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Block className="h-10 w-10 rounded-xl" />
                <Block className="h-3.5 w-3.5 rounded" />
              </div>
              <Block className="h-2.5 w-24" />
              <div className="space-y-2.5">
                <Block className="h-3 w-full" />
                <Block className="h-3 w-5/6" />
                <Block className="h-3 w-4/5" />
              </div>
              <Block className="h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <Block className="h-2.5 w-20" />
          <Block className="h-2.5 w-14" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Block className="h-2 w-16" />
                <Block className="h-7 w-7 rounded-lg" />
              </div>
              <Block className="h-7 w-24" />
              <Block className="h-2 w-10" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3">
            <Block className="h-3 w-32" />
            <Block className="h-16 w-full rounded-xl" />
            <Block className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

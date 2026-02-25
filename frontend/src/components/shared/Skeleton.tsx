interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card-neo p-5 space-y-3">
      <Skeleton className="w-32 h-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card-neo overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-dark-50/10">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-dark-50/5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKPI({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-neo p-4 lg:p-5 border border-dark-50/10">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="w-12 h-4" />
          </div>
          <Skeleton className="w-20 h-3 mb-2" />
          <Skeleton className="w-28 h-7" />
          <Skeleton className="w-24 h-3 mt-2" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;

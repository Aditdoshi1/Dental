export default function AdminLoading() {
  return (
    <div className="animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-10 w-36 rounded-lg" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="skeleton h-4 w-20 mb-2" />
            <div className="skeleton h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card">
          <div className="skeleton h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="skeleton h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

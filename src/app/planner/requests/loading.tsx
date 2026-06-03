export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header skeleton */}
      <div className="border-b px-4 sm:px-6 py-4 flex items-center justify-between animate-pulse"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-px bg-gray-200" />
          <div className="h-6 w-44 rounded bg-gray-200" />
        </div>
        <div className="size-7 rounded bg-gray-100" />
      </div>

      {/* Content skeleton */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-3 animate-pulse">
        <div className="h-4 w-40 rounded bg-gray-200 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '2px solid #fbbf24' }}>
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-full bg-amber-100 flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-44 rounded bg-gray-100" />
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <div className="h-8 w-20 rounded-lg bg-green-100" />
                <div className="h-8 w-20 rounded-lg bg-red-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

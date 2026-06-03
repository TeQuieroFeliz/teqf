export default function Loading() {
  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--tqf-beige)' }}>
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 animate-pulse"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-1 size-4 rounded bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-gray-200" />
            <div className="h-5 w-44 rounded bg-gray-200" />
            <div className="h-2.5 w-56 rounded bg-gray-200" />
          </div>
          <div className="size-8 rounded-xl bg-gray-200 flex-shrink-0" />
        </div>
        <div className="h-10 rounded-xl bg-gray-100" />
      </div>

      {/* Cards skeleton */}
      <div className="px-4 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 space-y-4"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-3 w-44 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex gap-3">
              <div className="flex-1 h-10 rounded-xl bg-gray-100" />
              <div className="flex-1 h-10 rounded-xl bg-gray-100" />
            </div>
            <div className="h-11 rounded-2xl bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

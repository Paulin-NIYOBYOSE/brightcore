export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading…</p>
      <div className="h-8 w-64 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-5 space-y-2">
              <div className="h-3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

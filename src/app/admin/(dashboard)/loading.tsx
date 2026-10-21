export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading…</p>
      <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

// frontend/src/components/admin/DashboardStatsCard.jsx
//
// Canonical reusable version of the counter-card pattern Dashboard.jsx
// currently inlines as a local `WidgetCard` helper. Each instance owns
// none of the fetching itself — Dashboard.jsx (or any future page) passes
// down status/value/error per the "one widget's failure shouldn't break
// the others" contract from App Flow §4.
//
// Props:
//   label    — string, e.g. "Total Posts"
//   value    — number | string | ReactNode — rendered only when status === 'success'
//   hint     — optional small caption under the value, e.g. "auto-purges after 7 days"
//   status   — 'loading' | 'success' | 'error'
//   error    — string, shown when status === 'error'
//   onRetry  — () => void

export default function DashboardStatsCard({ label, value, hint, status, error, onRetry }) {
  return (
    <div className="border border-[#333333] rounded-md p-6">
      <p className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[#777777]">
        {label}
      </p>

      {status === "loading" && (
        <div aria-hidden="true">
          <div className="h-8 w-20 rounded-sm bg-[#000000] animate-pulse" />
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="flex items-center justify-between gap-3">
          <p className="font-sans text-sm text-[#777777]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-sm border border-[#333333] px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors duration-fast hover:bg-[#000000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-baseline gap-2">
          <p className="font-sans text-3xl font-semibold text-white tabular-nums">{value}</p>
          {hint && <span className="font-sans text-xs text-[#777777]">{hint}</span>}
        </div>
      )}
    </div>
  );
}

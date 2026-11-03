// frontend/src/components/ui/Toast.jsx
// Dark theme — #111111 bg, white text, #333333 border.

import { useEffect } from "react";

export default function Toast({ message, onDismiss, action, autoDismissMs }) {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-toast flex w-80 items-center justify-between gap-4 border border-[#333333] bg-[#111111] px-4 py-3 text-ink-primary"
    >
      <p className="font-sans text-sm">{message}</p>

      <div className="flex shrink-0 items-center gap-3">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="font-sans text-sm font-bold uppercase tracking-wide text-ink-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {action.label}
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

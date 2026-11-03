// frontend/src/components/admin/UndoToast.jsx
//
// 7-second optimistic-deletion undo toast (App Flow 4.1/4.2, UI & UX
// brief 4.4, Implementation Constants section 7). Used by both the
// Trash flow ("Post moved to trash — Undo") and the deferred-commit
// Permanent Delete flow ("Post scheduled for permanent deletion —
// Undo") — the underlying DELETE/trash request is only fired by the
// caller once this toast's window has fully elapsed without Undo
// being pressed.

import { useEffect, useRef, useState } from "react";

const WINDOW_MS = 7000;
const TICK_MS = 50;

/**
 * @param {object} props
 * @param {string} props.message - e.g. "Post moved to trash"
 * @param {() => void} props.onUndo - Fired when the admin clicks Undo; caller is responsible for the compensating mutation
 * @param {() => void} props.onExpire - Fired once the 7-second window elapses without Undo; caller fires the real mutation here
 */
export default function UndoToast({ message, onUndo, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(WINDOW_MS);
  const intervalRef = useRef(null);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(WINDOW_MS - elapsed, 0);
      setRemainingMs(next);

      if (next === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        clearInterval(intervalRef.current);
        onExpire?.();
      }
    }, TICK_MS);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = () => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;
    clearInterval(intervalRef.current);
    onUndo?.();
  };

  const progressPercent = (remainingMs / WINDOW_MS) * 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-toast w-80 overflow-hidden rounded-sm border border-[#333333] bg-[#000000] text-white"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="font-sans text-sm">{message}</p>

        <button
          type="button"
          onClick={handleUndo}
          className="shrink-0 font-sans text-sm font-bold uppercase tracking-wide text-white underline-offset-2 hover:underline focus-visible:outline-none"
        >
          Undo
        </button>
      </div>

      {/* Shrinking 7-second progress bar */}
      <div className="h-1 w-full bg-[#000000]" aria-hidden="true">
        <div
          className="h-full bg-ink-inverse"
          style={{
            width: `${progressPercent}%`,
            transition: `width ${TICK_MS}ms linear`,
          }}
        />
      </div>
    </div>
  );
}


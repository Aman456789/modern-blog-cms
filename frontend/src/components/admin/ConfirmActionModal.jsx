// frontend/src/components/admin/ConfirmActionModal.jsx
//
// FIX Bug 8: bg-[#000000] resolves to #ffffff (pure white) in the
// dark theme, creating a jarring white card inside the black admin panel.
// Changed to bg-[#111111] (surface-dark-elevated) throughout.

import { useEffect, useRef } from "react";

export default function ConfirmActionModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDangerous = false,
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => { confirmRef.current?.focus(); }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isProcessing) onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isProcessing, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      onPointerDown={(e) => {
        if (!isProcessing && e.target === e.currentTarget) onCancel?.();
      }}
      className="fixed inset-0 flex items-center justify-center px-4 bg-black/70"
      style={{ zIndex: "var(--z-overlay)" }}
    >
      {/* FIX: bg-[#000000] → bg-[#111111] */}
      <div
        className="w-full max-w-sm border border-[#333333] rounded-sm bg-[#111111] p-8"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="font-sans text-base font-semibold text-white">
          {title}
        </h2>
        <p id="confirm-modal-message" className="mt-2 font-sans text-sm leading-relaxed" style={{ color: "#777777" }}>
          {message}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={
              isDangerous
                ? "flex-1 rounded-sm bg-[#000000] text-white px-5 py-2.5 font-sans text-sm font-semibold transition-colors duration-fast hover:bg-transparent hover:text-white border border-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                : "flex-1 rounded-sm border border-[#333333] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:border-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            }
          >
            {isProcessing ? "Working…" : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-sm border border-[#333333] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:border-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

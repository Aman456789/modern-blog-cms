// frontend/src/components/ui/Modal.jsx
// Dark theme — #000000 bg panel, #333333 border, white focus ring.

import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnOverlayClick = true,
}) {
  const dialogRef            = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId              = useId();

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement;

    const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusable?.length > 0) focusable[0].focus();
    else dialogRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;

      const focusableEls = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusableEls?.length) return;

      const first = focusableEls[0];
      const last  = focusableEls[focusableEls.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-black/70 px-4"
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="w-full max-w-md border border-[#333333] bg-[#000000] p-6 focus-visible:outline-none"
      >
        {title && (
          <h2 id={titleId} className="font-syne text-xl font-bold text-ink-primary">
            {title}
          </h2>
        )}
        <div className={title ? "mt-4" : ""}>{children}</div>
      </div>
    </div>
  );
}

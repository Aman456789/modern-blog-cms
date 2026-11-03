// frontend/src/components/editor/UnsavedChangesGuard.jsx
//
// Guards the admin editor against accidental data loss on navigation.
// Two complementary layers:
//
//   1. React Router v6 useBlocker — intercepts in-app SPA navigation
//      (clicking sidebar links, browser back button, programmatic navigate()).
//      Shows a confirm modal instead of the raw browser confirm() dialog
//      so the UI stays on-brand.
//
//   2. window.beforeunload — intercepts hard refreshes, tab close, and
//      browser-level navigation away from the app entirely.
//
// The component renders nothing until isDirty is true, so it is safe to
// always mount it in the editor shell regardless of save state.
//
// ── USAGE ─────────────────────────────────────────────────────────────────
//
//   <UnsavedChangesGuard isDirty={isDirty} />
//
// ── DESIGN ────────────────────────────────────────────────────────────────
//   Confirm modal matches the rest of the admin B&W design system.
//   Keyboard: Tab cycles between "Discard & Leave" and "Keep Editing".
//   Escape defaults to "Keep Editing" (the safe, non-destructive action).

import { useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

// ─── Confirm Modal ───────────────────────────────────────────────────────────
// Rendered inline (not in a portal) — the editor page fills the viewport,
// so there's no z-index conflict here.

function ConfirmLeaveModal({ onProceed, onCancel }) {
  const cancelRef = useRef(null);

  // Focus "Keep Editing" on open — safer default for a destructive action.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Escape → keep editing
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: 'var(--z-overlay)', backgroundColor: 'rgba(0,0,0,0.65)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      aria-describedby="leave-modal-desc"
    >
      <div
        className="w-full max-w-sm bg-[#000000] border border-[#333333]"
        style={{ borderRadius: 'var(--radius-sm)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#333333]">
          <h2
            id="leave-modal-title"
            className="font-sans text-sm font-bold text-white uppercase tracking-widest"
          >
            Unsaved Changes
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-2">
          <p
            id="leave-modal-desc"
            className="font-sans text-base text-white leading-relaxed"
          >
            You have unsaved changes. If you leave now, your edits will be lost.
          </p>
          <p className="font-sans text-sm text-[#777777]">
            Use the Save button or wait for autosave before navigating away.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#333333]">
          {/* Default focus: Keep Editing (safe, non-destructive) */}
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 font-sans text-sm font-bold text-white
                       bg-[#000000] border border-[#333333] hover:border-white
                       transition-colors duration-fast
                       focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Keep Editing
          </button>

          {/* Destructive: proceed without saving */}
          <button
            type="button"
            onClick={onProceed}
            className="px-4 py-2 font-sans text-sm font-bold text-white
                       border border-[#333333] hover:border-[#333333]
                       transition-colors duration-fast
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
          >
            Discard & Leave
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Guard Component ──────────────────────────────────────────────────────────

/**
 * UnsavedChangesGuard
 *
 * Mount inside the editor workspace. Blocks in-app navigation and browser
 * close/refresh when `isDirty` is true.
 *
 * @param {Object}  props
 * @param {boolean} props.isDirty  Whether the editor has unsaved changes.
 */
export default function UnsavedChangesGuard({ isDirty }) {

  // ── Layer 1: React Router useBlocker ────────────────────────────────────
  // Blocks navigation while isDirty is true. The blocker state machine:
  //   'unblocked' → user navigates → 'blocked' → modal appears →
  //     proceed → blocker.proceed() → navigation resumes
  //     cancel  → blocker.reset()   → user stays on editor page
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty]
    )
  );

  // ── Layer 2: window.beforeunload ────────────────────────────────────────
  // Fires when the user closes the tab, does a hard refresh, or navigates
  // to a completely different site. The browser shows its own default dialog;
  // we cannot customise the text (spec forbids it).
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      // Setting returnValue triggers the browser's built-in "Leave site?" dialog.
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ── Render: modal when blocker fires ────────────────────────────────────
  if (blocker.state === 'blocked') {
    return (
      <ConfirmLeaveModal
        onProceed={() => blocker.proceed()}
        onCancel={() => blocker.reset()}
      />
    );
  }

  // No UI when not blocking — pure behaviour component.
  return null;
}

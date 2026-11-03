// frontend/src/components/admin/BulkActionsToolbar.jsx
//
// Sticky toolbar that appears above PostListTable once one or more rows
// are checkbox-selected. Dumb/presentational — PostList.jsx owns the
// selection state array and the actual API calls.
//
// Props:
//   selectedCount  — number of currently selected posts
//   onTrash        — () => void  — bulk-move-to-trash (parent should run
//                      this through ConfirmActionModal first, since
//                      trashing is the one flow that requires a
//                      confirmation step per App Flow §4.2)
//   onClear        — () => void  — deselect all
//   isProcessing   — bool, disables actions while the bulk mutation is in flight

export default function BulkActionsToolbar({ selectedCount, onTrash, onClear, isProcessing = false }) {
  if (!selectedCount) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="sticky top-0 z-10 flex items-center justify-between gap-4 border border-[#333333] bg-[#000000] px-5 py-3 rounded-md mb-4"
    >
      <p className="font-sans text-sm text-white">
        <span className="font-semibold tabular-nums">{selectedCount}</span>{" "}
        {selectedCount === 1 ? "post" : "posts"} selected
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTrash}
          disabled={isProcessing}
          className="rounded-sm border border-[#333333] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors duration-fast hover:bg-ink-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isProcessing ? "Moving to Trash…" : "Move to Trash"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isProcessing}
          className="rounded-sm px-4 py-2 font-sans text-sm font-semibold text-[#777777] transition-colors duration-fast hover:bg-[#000000] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}

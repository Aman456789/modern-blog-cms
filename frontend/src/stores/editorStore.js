// frontend/src/stores/editorStore.js
//
// Zustand store: owns all TipTap editor metadata state AND the
// 60-second autosave loop (App Flow §7 constant, Roadmap Task 4.1).
//
// Responsibility split (critical — do not collapse):
//   - This store: postId, title, slug, status, categoryId, tags,
//     isDirty, isSaving, lastSaved, and the autosave scheduler.
//   - The editor component (TiptapEditor.jsx): owns the raw HTML body.
//     It does NOT live here to avoid re-rendering the whole admin shell
//     on every keystroke. Components pass the content ref to save().
//
// Save-state microinteraction (UI & UX §4.2):
//   Unsaved (muted dot) → Saving (spinner + text) → Saved (check)
//   Derived from isDirty/isSaving/lastSaved — no separate enum needed.

import { create } from "zustand";

const AUTOSAVE_INTERVAL_MS = 60_000; // 60 s — App Flow §7

const initialEditorState = {
  postId:     null,
  title:      "",
  slug:       "",
  status:     "DRAFT",   // "DRAFT" | "PUBLISHED" | "TRASHED"
  tags:       [],        // ObjectId strings, max 10
  mediaGallery: [],      // Media objects
  isDirty:    false,
  isSaving:   false,
  lastSaved:  null,      // Date | null
};

export const useEditorStore = create((set, get) => {
  // The interval handle lives outside Zustand state — it's infrastructure,
  // not UI state. Storing it in state would trigger spurious re-renders.
  let _autosaveIntervalId = null;
  let _saveFn = null; // injected by startAutosave(); allows the store to
                       // call the caller's save function without coupling
                       // to Axios or the component tree directly.

  return {
    ...initialEditorState,

    // ─── Hydration ────────────────────────────────────────────────────

    /**
     * Populate the store from a fetched post (EditPost.jsx on mount).
     * Clears dirty/saving flags so the indicator starts clean.
     */
    hydrate(post) {
      set((state) => {
        const incomingGallery = Array.isArray(post?.mediaGallery) ? post.mediaGallery : [];
        const resolvedGallery = incomingGallery.map((item) => {
          if (item && typeof item === "object" && (item.url || item.filename)) {
            return item;
          }
          const id = typeof item === "string" ? item : item?._id;
          const existing = state.mediaGallery.find((m) => m && (m._id === id || m.id === id));
          return existing || item;
        });

        return {
          postId:     post?._id     ?? post?.postId ?? null,
          title:      post?.title      ?? "",
          slug:       post?.slug       ?? "",
          status:     post?.status     ?? "DRAFT",
          tags:       Array.isArray(post?.tags) ? post.tags : [],
          mediaGallery: resolvedGallery,
          isDirty:    false,
          isSaving:   false,
          lastSaved:  post?.updatedAt ? new Date(post.updatedAt) : null,
        };
      });
    },

    /**
     * Clear the store when unmounting (NewPost → navigate away).
     * Also stops any running autosave loop.
     */
    reset() {
      get().stopAutosave();
      set(initialEditorState);
    },

    // ─── Field setters — each marks the doc dirty ──────────────────────

    setTitle:      (title)      => set({ title,      isDirty: true }),
    setSlug:       (slug)       => set({ slug,        isDirty: true }),
    setStatus:     (status)     => set({ status,      isDirty: true }),
    setTags: (tags) =>
      set({ tags: Array.isArray(tags) ? tags.slice(0, 10) : [], isDirty: true }),
    setMediaGallery: (mediaGallery) => set({ mediaGallery, isDirty: true }),

    addTag(tagId) {
      const { tags } = get();
      if (!tagId || tags.includes(tagId) || tags.length >= 10) return;
      set({ tags: [...tags, tagId], isDirty: true });
    },

    removeTag(tagId) {
      set((s) => ({ tags: s.tags.filter((id) => id !== tagId), isDirty: true }));
    },

    removeMediaFromGallery(mediaId) {
      set((s) => ({ mediaGallery: s.mediaGallery.filter((m) => m && m._id !== mediaId), isDirty: true }));
    },
    
    addMediaToGallery(media) {
      const { mediaGallery } = get();
      if (!media) return;
      
      // Strict Duplicate Verification
      const isDuplicate = mediaGallery.some(m => m?._id === media._id || (m?.url && media?.url && m.url === media.url));
      if (isDuplicate) {
        return; // Already added
      }
      
      set({ mediaGallery: [...mediaGallery.filter(m => m != null), media], isDirty: true });
    },

    // ─── Save lifecycle ────────────────────────────────────────────────

    beginSave:    () => set({ isSaving: true }),
    failSave:     () => set({ isSaving: false }),

    /**
     * Call after a successful PATCH response.
     * @param {{ postId?: string }} [opts]
     */
    completeSave({ postId } = {}) {
      set((s) => ({
        postId:    postId ?? s.postId,
        isSaving:  false,
        isDirty:   false,
        lastSaved: new Date(),
      }));
    },

    // ─── Autosave loop ────────────────────────────────────────────────

    /**
     * Start the 60-second periodic autosave loop.
     *
     * @param {() => Promise<void>} saveFn
     *   An async function (provided by the page component) that reads the
     *   current Zustand state + the TipTap HTML ref and calls the API.
     *   The store calls it on each tick only when isDirty is true.
     *
     * Call this in a useEffect on mount; call stopAutosave() in the
     * cleanup. Calling startAutosave again replaces the previous loop.
     */
    startAutosave(saveFn) {
      get().stopAutosave();
      _saveFn = saveFn;

      _autosaveIntervalId = setInterval(async () => {
        const { isDirty, isSaving } = get();
        if (isDirty && !isSaving && typeof _saveFn === "function") {
          try {
            await _saveFn();
          } catch {
            // saveFn is expected to call failSave() on error; we swallow
            // here so a transient API outage never kills the loop.
          }
        }
      }, AUTOSAVE_INTERVAL_MS);
    },

    stopAutosave() {
      if (_autosaveIntervalId !== null) {
        clearInterval(_autosaveIntervalId);
        _autosaveIntervalId = null;
      }
      _saveFn = null;
    },

    // ─── Derived save-state label ──────────────────────────────────────

    /**
     * Returns "saving" | "unsaved" | "saved"
     * Matches the three UI & UX brief §4.2 microinteraction states.
     */
    getSaveState() {
      const { isSaving, isDirty } = get();
      if (isSaving) return "saving";
      if (isDirty)  return "unsaved";
      return "saved";
    },
  };
});

export default useEditorStore;

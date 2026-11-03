// frontend/src/components/editor/AutoSave.jsx
//
// Headless lifecycle component that activates editorStore.js's
// existing 60-second autosave loop (App Flow §7 constant). The timer
// itself already lives in the Zustand store (startAutosave/
// stopAutosave) so it survives this component's own re-renders and
// stays in one place rather than being reimplemented per page — this
// component's entire job is calling startAutosave on mount and
// stopAutosave on unmount, with the page's actual save logic injected
// via the `save` prop.
//
// Renders nothing. Mount it once per editor session:
//   <AutoSave save={save} />
// where `save` reads the current store state + the TipTap content ref
// and performs the PATCH request (see EditPost.jsx).

import { useEffect, useRef } from "react";
import { useEditorStore } from "../../stores/editorStore.js";

/**
 * @param {object} props
 * @param {() => Promise<void>} props.save - Async save function; called on each tick only while isDirty
 */
export default function AutoSave({ save }) {
  // Keep the latest `save` reference without re-subscribing the
  // store's interval on every render (the page's save callback closes
  // over changing state/refs, so its identity legitimately changes).
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const { startAutosave, stopAutosave } = useEditorStore.getState();

    startAutosave(() => saveRef.current());

    return () => stopAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}


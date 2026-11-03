// frontend/src/components/editor/extensions/ImageUploadNode.js
//
// TipTap extension handling drag-and-drop and paste image uploads
// directly into the editor canvas (file_directory.txt: "Inline media
// upload parsing integration nodes"). Distinct from the base
// `@tiptap/extension-image` node already in TiptapEditor.jsx's
// extension list — that node only renders <img>; this extension is
// what intercepts a dropped/pasted file, uploads it to
// POST /api/media/upload (mediaController.js's Sharp pipeline, max
// 1920px width per TRD §4.1), and inserts the resulting URL as an
// image node once the upload resolves.
//
// While the upload is in-flight, a placeholder image node with a data
// URL preview is inserted so the writer sees instant feedback rather
// than a frozen cursor — it's replaced in place once the real URL
// comes back.

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import api from "../../../services/api.js";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/api/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.media.url;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Handles a single dropped/pasted image File: inserts an immediate
 * placeholder at the given position, uploads in the background, then
 * swaps the placeholder's src for the real backend URL once it
 * resolves (or removes the node entirely on upload failure).
 */
async function handleImageFile(view, file, position) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return;

  const { state, dispatch } = view;
  const placeholderSrc = await readAsDataUrl(file).catch(() => null);
  if (!placeholderSrc) return;

  const imageType = state.schema.nodes.image;
  if (!imageType) return;

  const placeholderNode = imageType.create({
    src: placeholderSrc,
    alt: file.name || "",
  });

  const insertPos = position ?? state.selection.from;
  const tr = state.tr.insert(insertPos, placeholderNode);
  dispatch(tr);

  try {
    const uploadedUrl = await uploadImageFile(file);

    // Find the placeholder node's current position (it may have moved
    // if the document changed during the async upload) by scanning for
    // the matching data-URL src, then swap it for the real URL.
    const { state: latestState, dispatch: latestDispatch } = view;
    let targetPos = null;

    latestState.doc.descendants((node, pos) => {
      if (targetPos !== null) return false;
      if (node.type === imageType && node.attrs.src === placeholderSrc) {
        targetPos = pos;
        return false;
      }
      return true;
    });

    if (targetPos !== null) {
      const updateTr = latestState.tr.setNodeMarkup(targetPos, undefined, {
        ...latestState.doc.nodeAt(targetPos).attrs,
        src: uploadedUrl,
      });
      latestDispatch(updateTr);
    }
  } catch {
    // Upload failed — remove the placeholder rather than leaving a
    // dead data-URL image permanently baked into the saved content.
    const { state: latestState, dispatch: latestDispatch } = view;
    let targetPos = null;

    latestState.doc.descendants((node, pos) => {
      if (targetPos !== null) return false;
      if (node.type === imageType && node.attrs.src === placeholderSrc) {
        targetPos = pos;
        return false;
      }
      return true;
    });

    if (targetPos !== null) {
      const removeTr = latestState.tr.delete(targetPos, targetPos + 1);
      latestDispatch(removeTr);
    }
  }
}

const ImageUploadNode = Extension.create({
  name: "imageUploadNode",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop(view, event) {
            const files = Array.from(event.dataTransfer?.files || []);
            const imageFiles = files.filter((f) => ALLOWED_IMAGE_TYPES.has(f.type));
            if (imageFiles.length === 0) return false;

            event.preventDefault();

            const coords = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            const position = coords?.pos ?? view.state.selection.from;

            imageFiles.forEach((file) => handleImageFile(view, file, position));
            return true;
          },

          handlePaste(view, event) {
            const files = Array.from(event.clipboardData?.files || []);
            const imageFiles = files.filter((f) => ALLOWED_IMAGE_TYPES.has(f.type));
            if (imageFiles.length === 0) return false;

            event.preventDefault();
            imageFiles.forEach((file) => handleImageFile(view, file));
            return true;
          },
        },
      }),
    ];
  },
});

export default ImageUploadNode;


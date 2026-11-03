// frontend/src/components/editor/extensions/CustomVideoNode.js
//
// Custom TipTap node rendering the compressed, 25MB-capped video
// produced by the FFmpeg pipeline (file_directory.txt: "Native Video
// element render nodes specification"; TRD §4.2). There is no official
// `@tiptap/extension-video`, so this is a from-scratch node — the
// counterpart to `@tiptap/extension-image` already used directly in
// TiptapEditor.jsx for images.
//
// The node stores only the final compressed `src` (already capped at
// 25MB server-side by ffmpegHelper.js) plus an optional `poster` frame
// URL. It does NOT perform any compression itself — CompressionMeter.jsx
// owns the upload-and-compress flow and is expected to call this node's
// `setVideo` command with the resulting Media record's URL once the
// POST /api/media/upload-video request resolves.

import { Node, mergeAttributes } from "@tiptap/core";

const CustomVideoNode = Node.create({
  name: "customVideo",
  group: "block",
  atom: true, // single, indivisible unit — no cursor can land inside it
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      poster: {
        default: null,
      },
      // Compressed output size in bytes, surfaced in the rendered DOM
      // as a data attribute purely for admin-facing debugging/QA — has
      // no effect on playback.
      sizeBytes: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[data-type='custom-video']",
        getAttrs: (el) => ({
          src: el.getAttribute("src"),
          poster: el.getAttribute("poster"),
          sizeBytes: el.getAttribute("data-size-bytes"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, poster, sizeBytes, ...rest } = HTMLAttributes;

    return [
      "video",
      mergeAttributes(rest, {
        "data-type": "custom-video",
        src,
        poster: poster || undefined,
        "data-size-bytes": sizeBytes || undefined,
        controls: "true",
        preload: "metadata",
        playsinline: "true",
        crossorigin: "anonymous",
        class: "w-full rounded-sm",
      }),
    ];
  },

  addCommands() {
    return {
      /**
       * Inserts a video node at the current selection.
       * @param {{ src: string, poster?: string, sizeBytes?: number }} options
       */
      setVideo:
        (options) =>
          ({ commands }) => {
            if (!options?.src) return false;
            return commands.insertContent({
              type: this.name,
              attrs: options,
            });
          },
    };
  },
});

export default CustomVideoNode;

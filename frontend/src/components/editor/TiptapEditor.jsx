import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

import Toolbar from "./Toolbar.jsx";
import CustomVideoNode from "./extensions/CustomVideoNode.js";
import ImageUploadNode from "./extensions/ImageUploadNode.js";
import { useEditorStore } from "../../stores/editorStore.js";
import api from "../../services/api.js";
import MediaLibraryModal from "./MediaLibraryModal.jsx";


// Removed inline MediaModal

const TiptapEditor = forwardRef(function TiptapEditor({ initialContent = "", onChange }, ref) {
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaAccept, setMediaAccept] = useState("image/jpeg, image/png, image/webp, image/gif");

  const markDirty = () => useEditorStore.setState({ isDirty: true });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image,
      CustomVideoNode,
      ImageUploadNode,
      Placeholder.configure({ placeholder: "Start writing your blog..." }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: [
          "prose-reading min-h-[60vh] bg-[#000000] text-white font-sans text-base",
          "focus:outline-none",
          "[&_h1]:text-white [&_h1]:font-syne [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8",
          "[&_h2]:text-white [&_h2]:font-syne [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6",
          "[&_h3]:text-white [&_h3]:font-syne [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5",
          "[&_p]:text-white [&_p]:leading-relaxed [&_p]:mb-4",
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:text-white [&_ul]:mb-4",
          "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:text-white [&_ol]:mb-4",
          "[&_li]:mb-1",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-[#333333] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#A1A1AA]",
          "[&_code]:bg-[#1a1a1a] [&_code]:text-white [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-sm [&_code]:font-mono [&_code]:text-sm",
          "[&_pre]:bg-[#111111] [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded-sm [&_pre]:border [&_pre]:border-[#333333] [&_pre]:overflow-x-auto",
          "[&_a]:text-[#3b82f6] [&_a]:underline [&_a]:underline-offset-2 [&_a]:cursor-pointer",
          "[&_strong]:text-white [&_strong]:font-bold",
          "[&_em]:text-white [&_em]:italic",
          "[&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_.is-editor-empty:first-child]:before:text-[#555555]",
          "[&_.is-editor-empty:first-child]:before:float-left",
          "[&_.is-editor-empty:first-child]:before:pointer-events-none",
          "[&_.is-editor-empty:first-child]:before:h-0",
        ].join(" "),
      },
    },
    onUpdate: ({ editor: editorInstance }) => {
      markDirty();
      onChange?.(editorInstance.getHTML());
    },
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || "",
  }), [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (initialContent && initialContent !== current) {
      editor.commands.setContent(initialContent, false);
    }
  }, [editor, initialContent]);

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  const handleUploadFile = async (file) => {
    if (!file || !editor) return;
    setIsMediaModalOpen(false);
    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileToUpload = file;
      let endpoint = "/api/media/upload";

      if ((file?.type || '').startsWith("image/") && !(file?.type || '').includes("gif")) {
        setUploadProgress(30);
      } else if ((file?.type || '').startsWith("video/")) {
        endpoint = "/api/media/upload-video";
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const { data } = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0,
        onUploadProgress: (e) => {
          if (e.total) {
             const startPercent = (file?.type || '').startsWith("video/") ? 50 : 30;
             const remaining = 100 - startPercent;
             setUploadProgress(startPercent + Math.round((e.loaded * remaining) / e.total));
          }
        }
      });

      const mediaUrl = data?.media?.url || data?.url;
      if (!mediaUrl) throw new Error("Upload response did not include a media URL.");
      
      if ((fileToUpload?.type || '').startsWith("video/")) {
        editor.chain().focus().setVideo({ src: mediaUrl, sizeBytes: fileToUpload?.size || 0 }).run();
      } else {
        editor.chain().focus().setImage({ src: mediaUrl }).run();
      }
    } catch (err) {
      setUploadError(err?.response?.data?.message || err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInsertExisting = (media) => {
    if (!editor || !media.url) return;
    const isVideo = media?.kind === 'video' || (media?.mimeType || '').startsWith('video/');

    if (isVideo) {
      editor.chain().focus().setVideo({ src: media.url, sizeBytes: media.sizeBytes || 0 }).run();
    } else {
      editor.chain().focus().setImage({ src: media.url }).run();
    }
    setIsMediaModalOpen(false);
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-[#333333] bg-[#000000] text-white">
      <Toolbar editor={editor} />

      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        accept={mediaAccept}
        onClose={() => setIsMediaModalOpen(false)}
        onUploadFile={handleUploadFile}
        onInsertExisting={handleInsertExisting}
      />

      {(isUploading || uploadError) && (
        <div className="relative border-b border-[#333333] bg-[#000000] px-4 py-3 text-xs text-white" role={uploadError ? "alert" : "status"}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[#A1A1AA]">
              {uploadError ? <span className="text-red-400">{uploadError}</span> : `Processing & Uploading: ${uploadProgress}%`}
            </span>
          </div>
          {!uploadError && isUploading && (
            <div className="w-full h-1 bg-[#111111] overflow-hidden rounded-full">
              <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      )}
      {/* Editor Wrapper with MS Word-like click behavior + Mobile Responsiveness */}
      <div 
        className="min-h-[50vh] bg-[#000000] px-8 pt-8 pb-32 text-white prose-a:text-blue-400 prose-a:underline hover:prose-a:text-blue-300 cursor-text w-full max-w-full break-words overflow-x-hidden"
        onClick={() => {
          if (editor) {
            // If clicking the empty space and trapped in a code block, force a new paragraph
            if (editor.isActive('codeBlock')) {
              editor.chain().focus('end').insertContent('<p></p>').run();
            } else if (!editor.isFocused) {
              editor.commands.focus('end');
            }
          }
        }}
      >
        <EditorContent editor={editor} className="outline-none w-full max-w-full" />
      </div>
    </div>
  );
});

export default TiptapEditor;

// frontend/src/pages/admin/MediaGrid.jsx
//
// Central asset management (/admin/media) — fully dark.
// MediaLibrary fills the left panel; MediaDetailPanel (dark) slides in
// on the right when an asset is selected.

import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import api from "../../services/api.js";
import MediaLibrary from "../../components/admin/MediaLibrary.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function resolveUrl(url) {
  if (!url) return "";
  return url;
}

function getFileType(url, item) {
  if (item?.kind) {
    const k = item.kind.toLowerCase();
    if (k === 'audio') return 'audio';
    if (k === 'video') return 'video';
    if (k === 'document' || k === 'pdf') return 'document';
    if (k === 'image') return 'image';
  }
  if (item?.mimeType) {
    if (item.mimeType.startsWith('audio/')) return 'audio';
    if (item.mimeType.startsWith('video/')) return 'video';
    if (item.mimeType.includes('pdf') || item.mimeType.includes('document')) return 'document';
    if (item.mimeType.startsWith('image/')) return 'image';
  }
  if (!url) return 'image';
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'mpeg', 'aac', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'document';
  return 'image';
}

// ── Dark media detail panel ────────────────────────────────────────────────

function MediaDetailPanel({ item, onClose, onDeleted }) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete "${item.originalName || item.filename}"?`)) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/media/${item._id}`);
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      queryClient.refetchQueries({ queryKey: ["admin-media"] });
      onDeleted(item._id);
    } catch (err) {
      setError(err?.response?.data?.message || "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolveUrl(item.url));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const isOrphaned = !item.postId;

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col bg-[#111111] border-l border-[#333333] overflow-y-auto"
      aria-label="Asset details"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#333333]">
        <h2 className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#A1A1AA]">
          Asset Details
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="w-7 h-7 flex items-center justify-center rounded-sm text-[#A1A1AA] hover:text-white hover:bg-[#000000] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>

      {/* Preview */}
      <div className="bg-black border-b border-[#222222]">
        {getFileType(item.url, item) === 'audio' ? (
          <div className="w-full aspect-square flex flex-col items-center justify-center p-6 bg-[#111111]">
            <div className="text-6xl mb-6">🎵</div>
            <audio controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} controls src={resolveUrl(item.url)} className="w-full h-12 invert hue-rotate-180 opacity-90" />
            <p className="mt-4 text-center text-sm text-white font-medium truncate w-full">{item.originalName}</p>
          </div>
        ) : getFileType(item.url, item) === 'document' ? (
          <div className="w-full aspect-square bg-white flex flex-col items-center justify-center p-4">
            <div className="text-6xl mb-2">📄</div>
            <p className="text-xs text-black font-semibold truncate w-full text-center">{item.originalName}</p>
          </div>
        ) : getFileType(item.url, item) === 'video' ? (
          <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} controls playsInline src={resolveUrl(item.url)} className="w-full aspect-square object-contain bg-black" />
        ) : (
          <img
            src={resolveUrl(item.url)}
            alt={item.originalName || item.filename}
            className="w-full aspect-square object-cover"
          />
        )}
      </div>

      {/* Status badge */}
      <div className="px-5 py-4 border-b border-[#222222]">
        <span className={`inline-flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-sm border ${isOrphaned ? "border-[#444444] text-[#A1A1AA]" : "border-[#333333] bg-[#000000] text-white"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOrphaned ? "bg-[#555555]" : "bg-[#000000]"}`} aria-hidden="true" />
          {isOrphaned ? "Unused" : "In use"}
        </span>
      </div>

      {/* Metadata */}
      <dl className="px-5 py-4 space-y-4 flex-1">
        {[
          { label: "Filename", value: item.originalName || item.filename },
          { label: "Type", value: item.mimeType },
          { label: "Size", value: formatBytes(item.sizeBytes) },
          { label: "Uploaded", value: item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-1">{label}</dt>
            <dd className="font-sans text-sm text-white break-all">{value}</dd>
          </div>
        ))}

        {/* URL with copy */}
        <div>
          <dt className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#555555] mb-2">URL</dt>
          <dd className="flex items-center gap-2">
            <code className="font-sans text-xs text-[#A1A1AA] break-all flex-1 truncate">{item.url}</code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy URL"
              className="shrink-0 font-sans text-[10px] font-semibold text-[#A1A1AA] border border-[#333333] px-2 py-1 rounded-sm hover:text-white hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </dd>
        </div>
      </dl>

      {/* Error */}
      {error && (
        <p role="alert" className="mx-5 mb-3 font-sans text-xs text-[#A1A1AA] border-l-2 border-white pl-3">
          {error}
        </p>
      )}

      {/* Delete */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full font-sans text-sm font-semibold text-[#A1A1AA] border border-[#333333] px-4 py-2.5 rounded-sm hover:text-white hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Deleting…" : "Delete Asset"}
        </button>
      </div>
    </aside>
  );
}

// ── Image upload helper ────────────────────────────────────────────────────

async function uploadImage(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/api/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });
  return data.media;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function MediaGrid() {
  const queryClient = useQueryClient();

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const handleModalUpload = async () => {
    if (!selectedFile || isUploading) return;
    
    // Frontend File Validation
    const ext = (selectedFile.name || '').split('.').pop().toLowerCase();
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'dll', 'com', 'scr', 'vbs', 'js', 'jar', 'apk'];
    if (dangerousExtensions.includes(ext)) {
      setUploadError("Executable and script files are not allowed.");
      return;
    }
    if (selectedFile.size > 500 * 1024 * 1024) {
      setUploadError("File is too large. Maximum supported upload size is 500 MB.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      await api.post("/api/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      queryClient.refetchQueries({ queryKey: ["admin-media"] });
      
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);

    } catch (err) {
      let errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMsg = "Network connection lost. Please check your internet connection and try again.";
      }
      setUploadError(errorMsg || "Upload failed. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleMediaSelect = (media) => {
    setSelectedMedia((prev) => prev?._id === media._id ? null : media);
  };

  return (
    <div className="flex flex-col h-full bg-black pt-0 pb-8 -mt-5 md:-mt-6">

      {/* Page header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#333333]">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white leading-none">Assets</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-[#000000] text-white font-sans text-sm font-semibold px-5 py-2.5 rounded-sm hover:opacity-80 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            + Upload
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-black">
          <MediaLibrary mode="library" onSelect={handleMediaSelect} />
        </div>
        {selectedMedia && (
          <MediaDetailPanel
            item={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            onDeleted={() => setSelectedMedia(null)}
          />
        )}
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-[#333333] w-full max-w-md p-8 rounded-2xl shadow-2xl relative flex flex-col gap-6">
            <button
              onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); setUploadError(null); }}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white transition-colors focus-visible:outline-none"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h2 className="text-xl font-bold text-white font-syne">Upload Media</h2>
            
            <label className={`w-full flex flex-col items-center justify-center border-2 border-dashed border-[#333333] rounded-xl py-12 px-6 transition-colors group ${
              isUploading 
                ? 'pointer-events-none opacity-50' 
                : 'cursor-pointer hover:border-white hover:bg-[#222222]'
            }`}>
              <span className="text-white font-sans text-sm font-semibold text-center mb-2 truncate max-w-xs">
                {selectedFile ? selectedFile.name : 'Click to select a file'}
              </span>
              {!selectedFile && <span className="text-[#A1A1AA] text-xs text-center">Images, Video, Audio, Documents</span>}
              <input 
                type="file" 
                className="hidden" 
                disabled={isUploading}
                accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const ext = (file.name || '').split('.').pop().toLowerCase();
                  const dangerous = ['exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'dll', 'com', 'scr', 'vbs', 'js', 'jar', 'apk'];
                  if (dangerous.includes(ext)) {
                    setUploadError("Executable and script files are not allowed.");
                    setSelectedFile(null);
                    return;
                  }
                  if (file.size > 500 * 1024 * 1024) {
                    setUploadError("File is too large. Maximum supported upload size is 500 MB.");
                    setSelectedFile(null);
                    return;
                  }
                  setUploadError(null);
                  setSelectedFile(file);
                }} 
              />
            </label>
            
            {uploadError && <p className="text-red-500 text-xs font-sans text-center">{uploadError}</p>}
            
            {isUploading ? (
              uploadProgress >= 100 ? (
                <div className="flex items-center justify-center gap-3 py-3 border border-[#333333] bg-[#000000] rounded-xl text-white mt-2">
                  <LoadingSpinner className="w-5 h-5 text-white" />
                  <span className="text-sm font-sans text-[#A1A1AA]">Processing &amp; saving to cloud...</span>
                </div>
              ) : (
                <div className="w-full bg-[#111111] border border-[#333333] rounded-full h-3 overflow-hidden shrink-0 mt-2">
                  <div className="bg-white h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-end px-2" style={{ width: `${uploadProgress}%` }}>
                    <span className="text-[10px] text-black font-bold">{uploadProgress}%</span>
                  </div>
                </div>
              )
            ) : (
              <button
                onClick={handleModalUpload}
                disabled={!selectedFile}
                className="w-full bg-white text-black font-sans font-bold py-3.5 rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Select & Upload
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

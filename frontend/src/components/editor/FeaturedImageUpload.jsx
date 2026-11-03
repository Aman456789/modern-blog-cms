import { useCallback, useId, useRef, useState } from "react";
import api from "../../services/api.js";
import MediaLibraryModal from "./MediaLibraryModal.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_LABEL = "JPEG, PNG, WebP, GIF";
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function resolveUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://Aman-backend-env-1.eba-ufwvg2cy.ap-southeast-2.elasticbeanstalk.com").replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${path}`;
}

const isVideo = (url) => typeof url === 'string' && url.match(/\.(mp4|webm|ogg)$/i);

function validateFile(file) {
  if (!file) return "No file selected.";
  const ext = (file.name || '').split('.').pop().toLowerCase();
  const dangerous = ['exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'dll', 'com', 'scr', 'vbs', 'js', 'jar', 'apk', 'pdf', 'doc', 'docx'];
  if (dangerous.includes(ext) || (!file?.type?.startsWith("image/") && !file?.type?.startsWith("video/"))) {
    return "Unsupported format. Only images and videos are allowed for cover media.";
  }
  const isVideoFile = file.type?.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const maxBytes = isVideoFile ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File too large. Maximum allowed size is ${isVideoFile ? '100 MB' : '25 MB'}.`;
  }
  return null;
}

export default function FeaturedImageUpload({ value, onChange, postId = null }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const dropzoneId = useId();
  const errorId = useId();

  const uploadFile = useCallback(async (rawFile) => {
    if (isUploading) return;
    const validationError = validateFile(rawFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", rawFile); // Do NOT use a blob here
      if (postId) formData.append("postId", postId);

      const { data } = await api.post("/api/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(uploadPercent);
          }
        },
      });
      onChange?.(data.media.url);
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response.data.message);
        setError(err.response.data.message);
      } else {
        let errorMsg = err?.response?.data?.message || err?.message;
        if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
          errorMsg = "Network connection lost. Please check your internet connection and try again.";
        }
        setError(errorMsg || "Upload failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [onChange, postId, isUploading]);

  const openPicker = () => {
    if (!isUploading) setIsMediaModalOpen(true);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const rawFile = event.dataTransfer.files?.[0];
    if (rawFile) {
      if (!rawFile.type.startsWith("image/") && !rawFile.type.startsWith("video/")) {
        alert("Unsupported format. Only images and videos are allowed.");
        return;
      }
      uploadFile(rawFile);
    }
  };

  const handleInputChange = (event) => {
    const rawFile = event.target.files?.[0];
    event.target.value = "";
    if (rawFile) {
      if (!rawFile.type.startsWith("image/") && !rawFile.type.startsWith("video/")) {
        alert("Unsupported format. Only images and videos are allowed.");
        return;
      }
      uploadFile(rawFile);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="space-y-3 bg-[#000000] text-white">
      <div className="flex items-center justify-between gap-3">
        <label id={`${dropzoneId}-label`} className="text-xs font-bold uppercase tracking-widest text-white">
          Cover Image
        </label>
        {value && !isUploading && <span className="text-xs text-[#777777]">Preview active</span>}
      </div>

      {value && !isUploading ? (
        <div className="overflow-hidden rounded-sm border border-[#333333] bg-[#000000]">
          {/* Safe Media Renderer */}
          {(() => {
            const fileUrl = resolveUrl(value) || '';
            const ext = fileUrl.split('.').pop().toLowerCase();
          
            if (['mp4', 'webm', 'ogg'].includes(ext)) {
              return <video src={fileUrl} controls playsInline className="block aspect-video w-full object-cover rounded-sm" />;
            } 
            else if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) {
              return <audio src={fileUrl} controls className="w-full mt-4" />;
            } 
            else if (['pdf', 'doc', 'docx'].includes(ext)) {
              return (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full aspect-video bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm text-[#deff9a] hover:underline p-4">
                  <i className="fa-solid fa-file-lines mr-2"></i> View Document
                </a>
              );
            } 
            else {
              // Fallback for all images (jpg, png, svg, webp)
              return <img src={fileUrl} alt="Cover preview" loading="lazy" className="block aspect-video w-full object-cover rounded-sm" />;
            }
          })()}
          <div className="flex gap-2 border-t border-[#333333] bg-[#000000] p-3">
            <button
              type="button"
              onClick={openPicker}
              className="flex-1 rounded-sm border border-[#333333] bg-[#000000] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Replace Image
            </button>
            <button
              type="button"
              onClick={() => onChange?.("")}
              className="rounded-sm border border-[#333333] bg-[#000000] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          id={dropzoneId}
          role="button"
          tabIndex={0}
          aria-labelledby={`${dropzoneId}-label`}
          aria-describedby={error ? errorId : undefined}
          aria-busy={isUploading}
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed bg-[#000000] px-6 text-center text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${
            isUploading 
              ? "pointer-events-none opacity-50" 
              : isDragging 
              ? "cursor-pointer border-white" 
              : "cursor-pointer border-[#333333] hover:border-white"
          }`}
        >
          <UploadIcon className="h-8 w-8 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">{isUploading ? "Uploading..." : isDragging ? "Release to upload" : "Click to select from Media Library"}</p>
            <p className="mt-1 text-xs text-[#777777]">or drag and drop here. {ACCEPTED_LABEL}. max {MAX_SIZE_MB} MB</p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="mt-4 w-full">
          {progress >= 100 ? (
            <div className="flex items-center justify-center gap-3 py-2 text-white">
              <LoadingSpinner className="w-4 h-4 text-white" />
              <span className="text-xs font-sans text-[#A1A1AA]">Processing &amp; saving to cloud...</span>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[#A1A1AA] text-xs">
                  {`Uploading: ${progress}%`}
                </p>
              </div>
              <div className="w-full h-1 bg-[#111111] overflow-hidden rounded-full">
                <div 
                  className="h-full bg-white transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="border-l-2 border-[#333333] pl-3 text-xs leading-relaxed text-white">
          {error}
        </p>
      )}

      {/* Media Library Modal Integration */}
      <MediaLibraryModal 
        isOpen={isMediaModalOpen}
        onlyVisuals={true}
        isMultiple={false}
        allowedTypes="image/*, video/*"
        onClose={() => setIsMediaModalOpen(false)}
        onUploadFile={(file) => {
          setIsMediaModalOpen(false);
          uploadFile(file);
        }}
        onInsertExisting={(media) => {
          setIsMediaModalOpen(false);
          const item = Array.isArray(media) ? media[0] : media;
          onChange?.(item?.url || item);
        }}
      />

      <input ref={inputRef} type="file" disabled={isUploading} accept="image/*,video/*" onChange={handleInputChange} className="sr-only" tabIndex={-1} />
    </div>
  );
}

function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}


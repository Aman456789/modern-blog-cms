// frontend/src/components/admin/MediaPreviewModal.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'document';
  return 'image';
}

export default function MediaPreviewModal({ item, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  if (!item) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm focus-visible:outline-none"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute right-6 top-6 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/80 border-2 border-white text-white text-3xl font-bold transition-all focus-visible:outline-none"
      >
        &times;
      </button>

      <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col items-center">
        {getFileType(item.url, item) === 'audio' ? (
          <div className="flex flex-col items-center justify-center w-full px-4 z-10">
            {/* Main Player Card */}
            <div className="w-full max-w-2xl bg-[#111111] border border-[#222222] rounded-[40px] p-10 md:p-16 shadow-2xl flex flex-col items-center gap-8">
              
              {/* 3D Music Icon / Visualizer Placeholder */}
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-[#deff9a] to-[#a3cfbb] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(222,255,154,0.2)]">
                <i className="fa-solid fa-music text-black text-5xl md:text-6xl">🎵</i>
              </div>

              {/* File Info */}
              <div className="text-center w-full px-4">
                <h3 className="text-white text-xl md:text-2xl font-bold tracking-tight mb-2 truncate">
                  {item.originalName || item.filename || 'Audio File'}
                </h3>
                <p className="text-[#A1A1AA] text-sm tracking-widest uppercase">Now Playing</p>
              </div>

              {/* The Actual Player - Wide & Large */}
              <div className="w-full">
                <audio controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} 
                  controls 
                  src={resolveUrl(item.url)} 
                  className="w-full h-14 scale-[1.02] md:scale-105 filter invert outline-none" 
                  autoPlay 
                />
              </div>
            </div>
          </div>
        ) : getFileType(item.url, item) === 'pdf' ? (
          <div className="w-[90vw] h-[85vh] bg-white rounded-sm overflow-hidden flex flex-col">
              <object data={resolveUrl(item.url)} type="application/pdf" className="w-full h-full">
                  <div className="flex flex-col items-center justify-center h-full p-10 bg-[#0a0a0a]">
                      <p className="text-white mb-4">Your browser cannot display this PDF.</p>
                      <a href={resolveUrl(item.url)} target="_blank" rel="noreferrer" className="bg-white text-black px-6 py-2 rounded-full font-bold">Download PDF</a>
                  </div>
              </object>
          </div>
        ) : getFileType(item.url, item) === 'document' ? (
          <div className="flex flex-col items-center justify-center p-10 bg-[#0a0a0a] rounded-2xl border border-[#222222]">
              <div className="text-7xl mb-4">📄</div>
              <h3 className="text-white text-lg mb-6 truncate max-w-md">{item.originalName || item.filename}</h3>
              <a href={resolveUrl(item.url)} target="_blank" rel="noreferrer" className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-[#daffde] transition-all">
                  Open / Download File
              </a>
          </div>
        ) : getFileType(item.url, item) === 'video' ? (
          <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} src={resolveUrl(item.url)} controls autoPlay playsInline className="max-h-[85vh] max-w-[85vw] rounded-sm object-contain" />
        ) : (
          <img src={resolveUrl(item.url)} className="max-h-[85vh] max-w-[85vw] rounded-sm object-contain" alt="Preview" />
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

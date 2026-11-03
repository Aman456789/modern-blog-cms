// frontend/src/components/public/MediaGrid.jsx
import React, { useState } from 'react';
import MediaPreviewModal from '../admin/MediaPreviewModal.jsx';

function getFileType(url, media) {
  if (media?.kind) {
    const k = String(media.kind).toLowerCase();
    if (k === 'audio') return 'audio';
    if (k === 'video') return 'video';
    if (k === 'document' || k === 'pdf') return 'document';
    if (k === 'image') return 'image';
  }
  if (media?.type) {
    const t = String(media.type).toLowerCase();
    if (t === 'audio') return 'audio';
    if (t === 'video') return 'video';
    if (t === 'document' || t === 'pdf') return 'document';
    if (t === 'image') return 'image';
  }
  if (media?.mimeType) {
    const m = String(media.mimeType).toLowerCase();
    if (m.startsWith('audio/')) return 'audio';
    if (m.startsWith('video/')) return 'video';
    if (m.includes('pdf') || m.includes('document')) return 'document';
    if (m.startsWith('image/')) return 'image';
  }
  if (!url) return 'image';
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'mpeg', 'aac', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'document';
  return 'image';
}

function resolveUrl(url) {
  if (!url) return "";
  return url;
}

export default function MediaGrid({ mediaItems, onRemove, onPreviewClick }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className={onRemove ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4 w-full max-w-[100%] overflow-x-hidden" : "flex flex-col gap-6 w-full max-w-[100%] overflow-x-hidden"}>
        {/* Empty grid state ensures layout stability */}
      </div>
    );
  }

  const handleMediaClick = (media) => {
    if (onPreviewClick) {
      onPreviewClick(media);
    } else {
      setSelectedMedia(media);
      setLightboxOpen(true);
    }
  };

  return (
    <>
      <div className={onRemove ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4 w-full max-w-[100%] overflow-x-hidden" : "flex flex-col gap-6 w-full max-w-[100%] overflow-x-hidden"}>
        {mediaItems.filter(item => item && item.url && item._id).map((media) => {
          const type = getFileType(media.url, media);
          
          return (
            <div 
              key={media._id}
              className={onRemove 
                ? "relative w-full min-w-0 max-w-full aspect-square rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] group flex items-center justify-center cursor-pointer" 
                : "relative w-full min-w-0 max-w-full group cursor-pointer overflow-hidden rounded-2xl bg-[#111111] border border-[#222222] aspect-[4/3] flex items-center justify-center"
              }
              onClick={() => handleMediaClick(media)}
            >
              {type === 'audio' ? (
                <div className="w-full min-w-0 max-w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#2d1b4e] text-white p-4">
                  <div className="text-6xl mb-4 shadow-sm">🎵</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-center truncate w-full opacity-90 px-2">{media.originalName || media.filename || 'Audio File'}</span>
                </div>
              ) : type === 'document' ? (
                <div className="w-full min-w-0 max-w-full h-full flex flex-col items-center justify-center bg-[#f5f5f5] text-[#333333] relative">
                  <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider shadow-sm">DOC</div>
                  <div className="text-6xl mb-4 text-[#555555]">📄</div>
                  <span className="text-xs font-bold text-center truncate w-[90%] opacity-80 px-2">{media.originalName || media.filename || 'Document'}</span>
                </div>
              ) : type === 'video' ? (
                <video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} preload="metadata" playsInline src={`${resolveUrl(media.url)}#t=0.1`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none" muted />
              ) : (
                <img src={resolveUrl(media.url)} alt={media.caption || media.originalName || 'Gallery media'} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none" />
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md border border-white/50 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] transform scale-75 group-hover:scale-100 transition-all duration-300 pointer-events-none">
                  {type === 'video' ? (
                     <svg className="w-5 h-5 ml-1 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  ) : (
                     <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </div>
              </div>

              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(media.id || media._id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                  aria-label="Remove media"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {lightboxOpen && selectedMedia && (
         <MediaPreviewModal
           item={{ ...selectedMedia, originalName: selectedMedia.caption || selectedMedia.originalName || selectedMedia.filename }}
           onClose={() => {
             setLightboxOpen(false);
             setSelectedMedia(null);
           }}
         />
      )}
    </>
  );
}

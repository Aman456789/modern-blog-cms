import { useEffect, useRef, useState } from "react";
import api from "../../services/api.js";
import MediaPreviewModal from "../admin/MediaPreviewModal.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";

function getFileType(url) {
  if (!url) return 'image';
  const ext = url.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'mpeg', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'document';
  return 'image';
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,video/x-matroska";

function isFileTypeAllowed(file, allowedPattern) {
  if (!file) return false;
  const ext = (file.name || '').split('.').pop().toLowerCase();
  
  // Reject dangerous executables and scripts
  const dangerous = ['exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'dll', 'com', 'scr', 'vbs', 'js', 'jar', 'apk'];
  if (dangerous.includes(ext)) return false;

  if (!allowedPattern || allowedPattern === '*/*' || allowedPattern === '*') {
    return true;
  }

  const patterns = allowedPattern.split(',').map(p => p.trim().toLowerCase());
  const mime = (file.type || '').toLowerCase();

  for (const p of patterns) {
    if (p === '*/*') return true;
    if (p.endsWith('/*')) {
      const typePrefix = p.slice(0, -1);
      if (mime.startsWith(typePrefix)) return true;
    } else if (p.startsWith('.')) {
      if ('.' + ext === p) return true;
    } else {
      if (mime === p) return true;
    }
  }

  // Common extensions fallback
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
  const docExts = ['pdf', 'doc', 'docx', 'txt'];

  const allowsImages = patterns.some(p => p.includes('image'));
  const allowsVideos = patterns.some(p => p.includes('video'));
  const allowsAudio = patterns.some(p => p.includes('audio'));
  const allowsDocs = patterns.some(p => p.includes('pdf') || p.includes('document'));

  if (allowsImages && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return true;
  if (allowsVideos && ['mp4', 'webm', 'mov', 'mkv', 'ogg'].includes(ext)) return true;
  if (allowsAudio && audioExts.includes(ext)) return true;
  if (allowsDocs && docExts.includes(ext)) return true;

  return false;
}

export default function MediaLibraryModal({ 
  isOpen, 
  onClose, 
  onInsertExisting, 
  onUploadSuccess,
  onlyVisuals = false, 
  isMultiple = true,
  allowedTypes = "*/*",
  accept, 
  multiple 
}) {
  const allowMultiple = multiple !== undefined ? multiple : (isMultiple && !onlyVisuals);
  const effectiveAllowedTypes = accept || allowedTypes;
  const [activeTab, setActiveTab] = useState("upload");
  const [mediaList, setMediaList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  
  // Unified Progress States
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.get("/api/admin/media")
        .then((res) => {
          const items = res.data?.items || res.data?.media || (Array.isArray(res.data) ? res.data : []);
          setMediaList((prev) => {
            const incomingIds = new Set(items.map((i) => i._id));
            const freshUnindexed = prev.filter((p) => p && p._id && !incomingIds.has(p._id));
            return [...freshUnindexed, ...items];
          });
        })
        .catch((err) => console.error("Failed to load media", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleLocalFile = async (selectedFiles) => {
    if (isProcessing) return;
    const rawFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    if (rawFiles.length === 0) return;

    const filesToValidate = allowMultiple ? rawFiles : [rawFiles[0]];
    const validFiles = filesToValidate.filter(f => isFileTypeAllowed(f, effectiveAllowedTypes));

    if (validFiles.length < filesToValidate.length) {
      const typeNotice = (!effectiveAllowedTypes || effectiveAllowedTypes === '*/*')
        ? "Executable and script files are not allowed."
        : `Unsupported format. Allowed types: ${effectiveAllowedTypes}`;
      alert(typeNotice);
    }
    if (validFiles.length === 0) return;

    const oversized = validFiles.some(f => f.size > 500 * 1024 * 1024);
    if (oversized) {
      alert("One or more files exceed the 500 MB maximum size limit.");
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const uploadedNodes = [];
      const total = validFiles.length;

      for (let i = 0; i < total; i++) {
        const file = validFiles[i];
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await api.post("/api/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const filePercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              const overallPercent = Math.round(((i * 100) + filePercent) / total);
              setUploadProgress(overallPercent);
            }
          },
        });

        const mediaNode = data?.media || data;
        if (mediaNode && mediaNode._id && mediaNode.url) {
          uploadedNodes.push(mediaNode);
        }
      }

      setMediaList(prev => [...uploadedNodes, ...prev]);
      setSelected(uploadedNodes);
      onUploadSuccess?.(uploadedNodes);
      setActiveTab('library');
    } catch (err) {
      console.error("Upload failed", err);
      if (err.response?.status === 409) {
        alert(err.response.data.message);
      } else {
        let errorMsg = err?.response?.data?.message || err?.message;
        if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
          errorMsg = "Network connection lost. Please check your internet connection and try again.";
        }
        alert(errorMsg || "Upload failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" 
      onPointerDown={(e) => { if (!isProcessing && e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-[#111111] border border-[#333333] rounded-sm overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#333333] px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold font-sans">Insert Media</h2>
            {selected.length > 0 && activeTab === 'library' && (
              <button 
                onClick={() => {
                  selected.forEach(item => onInsertExisting(item));
                  handleClose();
                }}
                className="bg-white text-black font-semibold font-sans text-xs px-3 py-1.5 rounded-sm hover:opacity-80 transition-opacity"
              >
                Insert {isMultiple && selected.length > 1 ? `${selected.length} Items` : 'Item'}
              </button>
            )}
          </div>
          <button 
            onClick={handleClose} 
            disabled={isProcessing}
            className="text-[#777777] hover:text-white transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-[#333333] px-6">
          <button 
            disabled={isProcessing}
            className={`py-3 mr-6 font-sans text-sm font-semibold transition-colors disabled:opacity-50 ${activeTab === 'upload' ? 'text-white border-b-2 border-white' : 'text-[#777777] hover:text-white'}`} 
            onClick={() => { setActiveTab('upload'); setSelected([]); }}
          >
            Upload New
          </button>
          <button 
            disabled={isProcessing}
            className={`py-3 font-sans text-sm font-semibold transition-colors disabled:opacity-50 ${activeTab === 'library' ? 'text-white border-b-2 border-white' : 'text-[#777777] hover:text-white'}`} 
            onClick={() => setActiveTab('library')}
          >
            Media Library
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upload' && (
            <div className="flex flex-col h-full w-full justify-center">
              <div 
                className={`flex flex-col items-center justify-center border-2 border-dashed border-[#333333] rounded-sm transition-colors py-16 ${
                  isProcessing 
                    ? 'pointer-events-none opacity-50' 
                    : 'hover:border-[#555555] cursor-pointer'
                }`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isProcessing) return;
                  const droppedFiles = Array.from(e.dataTransfer.files || []);
                  if (!droppedFiles.length) return;
                  if (allowMultiple) {
                    handleLocalFile(droppedFiles);
                  } else {
                    handleLocalFile([droppedFiles[0]]);
                  }
                }}
              >
                <span className="text-[#A1A1AA] font-sans text-sm mb-2">
                  {allowMultiple ? "Click or drag files to upload" : "Click to select a file to upload"}
                </span>
                <span className="text-[#555555] font-sans text-xs">
                  {effectiveAllowedTypes === 'image/*, video/*' || effectiveAllowedTypes === 'image/*,video/*'
                    ? "Images and Videos supported"
                    : "Images, Videos, Audio, and Documents supported (max 500 MB)"}
                </span>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  disabled={isProcessing}
                  multiple={allowMultiple}
                  className="hidden" 
                  accept={effectiveAllowedTypes === '*/*' ? undefined : effectiveAllowedTypes}
                  onChange={(e) => {
                    const selectedFiles = Array.from(e.target.files || []);
                    if (!selectedFiles.length) return;
                    if (allowMultiple) {
                      handleLocalFile(selectedFiles);
                    } else {
                      handleLocalFile([selectedFiles[0]]);
                    }
                    e.target.value = "";
                  }} 
                />
              </div>

              {/* Progress Meter UI (Pure Black) */}
              {isProcessing && (
                <div className="mt-6 w-full">
                  {uploadProgress >= 100 ? (
                    <div className="flex items-center justify-center gap-3 py-3 border border-[#333333] bg-[#000000] rounded-sm text-white">
                      <LoadingSpinner className="w-5 h-5 text-white" />
                      <span className="text-sm font-sans text-[#A1A1AA]">Processing &amp; saving to cloud...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[#A1A1AA] text-xs font-sans">Uploading: {uploadProgress}%</p>
                      <div className="w-full h-2 bg-[#111111] border border-[#333333] mt-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-300 ease-out" 
                          style={{ width: `${uploadProgress}%` }} 
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'library' && (
            <div>
              {isLoading ? (
                <p className="text-[#777777] font-sans text-sm text-center py-10">Loading media...</p>
              ) : mediaList.length === 0 ? (
                <p className="text-[#777777] font-sans text-sm text-center py-10">No media found in the library.</p>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaList
                    .filter((item) => {
                      if (!onlyVisuals) return true;
                      const type = getFileType(item.url);
                      return type !== 'audio' && type !== 'document' && type !== 'pdf';
                    })
                    .map((item) => {
                    const fileType = (item?.type || item?.mimeType || '').split('/')[0];
                    const isVideo = item?.kind === 'video' || fileType === 'video' || (item?.mimeType || '').startsWith('video/');
                    return (
                      <div 
                        key={item._id} 
                        onClick={() => {
                          if (isMultiple) {
                            setSelected(prev => 
                              prev.some(p => p._id === item._id) 
                                ? prev.filter(p => p._id !== item._id)
                                : [...prev, item]
                            );
                          } else {
                            setSelected(prev => 
                              prev[0]?._id === item._id ? [] : [item]
                            );
                          }
                        }} 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                        className={`cursor-pointer border aspect-square bg-[#000000] overflow-hidden rounded-sm relative group ${
                          selected.some(p => p._id === item._id) 
                            ? 'border-white ring-2 ring-white scale-[0.98]' 
                            : 'border-[#333333] hover:border-[#777777]'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 z-10 flex items-center justify-center transition-colors ${
                          selected.some(p => p._id === item._id) ? 'bg-white border-white' : 'border-white/50 bg-black/50'
                        }`}>
                          {selected.some(p => p._id === item._id) && (
                            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        {/* Safe Media Renderer */}
                        {(() => {
                          const fileUrl = item?.url || '';
                          const ext = fileUrl.split('.').pop().toLowerCase();
                        
                          if (['mp4', 'webm', 'ogg'].includes(ext)) {
                            return <video src={fileUrl} controls playsInline className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />;
                          } 
                          else if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) {
                            return <audio src={fileUrl} controls className="w-full mt-4" />;
                          } 
                          else if (['pdf', 'doc', 'docx'].includes(ext)) {
                            return (
                              <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full h-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#deff9a] hover:underline p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                                <i className="fa-solid fa-file-lines mr-2"></i> View Document
                              </a>
                            );
                          } 
                          else {
                            // Fallback for all images (jpg, png, svg, webp)
                            return <img src={fileUrl} alt="Media" loading="lazy" className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />;
                          }
                        })()}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(item);
                          }}
                          className="absolute bottom-2 right-2 bg-black/80 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                          title="Preview"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}

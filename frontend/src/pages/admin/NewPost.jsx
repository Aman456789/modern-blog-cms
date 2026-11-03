// frontend/src/pages/admin/NewPost.jsx
//
// REFACTOR — Cinematic Dark Theme & Vertical Layout
//
// Previous bugs fixed:
//   • Clunky sidebars removed in favor of a centered, single-column max-w-3xl container.
//   • Pure black theme applied throughout.
//   • "White boxes" eradicated completely.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api.js";
import { useEditorStore } from "../../stores/editorStore.js";
import TiptapEditor from "../../components/editor/TiptapEditor.jsx";
import FeaturedImageUpload from "../../components/editor/FeaturedImageUpload.jsx";
import MediaLibraryModal from "../../components/editor/MediaLibraryModal.jsx";
import MediaGrid from "../../components/public/MediaGrid.jsx";
import MediaPreviewModal from "../../components/admin/MediaPreviewModal.jsx";

function slugify(value) {
  return String(value || "")
    .trim()
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function SaveIndicator({ status }) {
  if (!status) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-[#777777]" role="status" aria-live="polite">
      <span
        className={`h-2 w-2 rounded-full ${status === "Saving..." ? "animate-pulse bg-[#A1A1AA]" : "bg-[#ffffff]"}`}
        aria-hidden="true"
      />
      {status}
    </div>
  );
}

function TagInput({ tags, onAddTag }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get("/api/posts/tags")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAvailableTags(res.data);
        }
      })
      .catch((err) => console.error("Failed to fetch tags", err));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = availableTags.filter(
    (t) => t?.toLowerCase().includes(inputValue?.toLowerCase() || '') && !(tags || []).includes(t)
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const tagToAdd = filteredTags.length > 0 && isOpen ? filteredTags[0] : inputValue.trim();
      if (tagToAdd && !tags.includes(tagToAdd)) {
        onAddTag(tagToAdd);
      }
      setInputValue("");
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1 block font-sans text-xs uppercase tracking-widest text-[#777777]">
        Tags
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
        className="w-full rounded-sm border border-[#333333] bg-[#000000] px-3 py-2 font-sans text-base text-white placeholder:text-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        autoComplete="off"
      />
      {isOpen && inputValue && filteredTags.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-[#000000] border border-[#333333] rounded shadow-lg max-h-48 overflow-y-auto">
          {(Array.isArray(filteredTags) ? filteredTags : []).map((tag) => (
            <li
              key={tag}
              onMouseDown={(e) => {
                e.preventDefault();
                onAddTag(tag);
                setInputValue("");
                setIsOpen(false);
              }}
              className="px-4 py-2 text-white cursor-pointer hover:bg-[#111111] transition-colors"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NewPost() {
  const navigate = useNavigate();
  const store = useEditorStore();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const editorRef = useRef(null);

  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [routeName, setRouteName] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [saveError, setSaveError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const isSavingRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [slugWarning, setSlugWarning] = useState('');

  // Real-time Debounced Validation for Duplicate Titles/Routes
  useEffect(() => {
    // Calculate the live slug to check
    const slugToCheck = routeName 
      ? routeName.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
      : (store.title || "").toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (!slugToCheck) {
      setSlugWarning('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const excludeIdParam = postIdRef.current ? `&excludeId=${postIdRef.current}` : '';
        const res = await api.get(`/api/admin/check-slug?slug=${slugToCheck}${excludeIdParam}`);
        if (res.data.exists) {
          setSlugWarning('⚠️ Warning: A post with this Title or Route Name already exists!');
        } else {
          setSlugWarning('');
        }
      } catch (error) {
        console.error("Failed to check duplicate route", error);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [store.title, routeName]);
  const postIdRef = useRef(null);
  const lastSavedRef = useRef({ title: "", excerpt: "", content: "", mediaGalleryIds: "[]" });

  useEffect(() => {
    store.reset?.();
  }, []);

  const handleSave = async (statusOverride = "DRAFT") => {
    if (isSavingRef.current || isBusy) return;

    const title = store.title?.trim() || "";
    const currentContent = editorRef.current?.getHTML?.() || content || "";
    const cleanContentText = currentContent.replace(/<[^>]*>/g, '').trim();

    // The "Half-Baked Blog" Validation
    const errors = {};
    if (!title) {
      errors.title = "Please provide a post title before saving or publishing.";
    }
    if (statusOverride === "PUBLISHED") {
      if (!cleanContentText) {
        errors.content = "Please write some content for your post before publishing.";
      }
      if (!featuredImageUrl) {
        errors.featuredImageUrl = "Please select a cover image before publishing.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSaveError(errors.title || errors.content || errors.featuredImageUrl);
      return;
    }

    setValidationErrors({});
    const slug = slugify(store.slug || title);

    setSaveError("");
    setSaveStatus("Saving...");
    setIsBusy(true);
    isSavingRef.current = true;

    try {
      const payload = {
        title,
        routeName,
        slug,
        content: currentContent,
        excerpt,
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_keywords: seoKeywords,
        tags: store.tags || [],
        status: statusOverride,
        featuredImageUrl,
        mediaGallery: (Array.isArray(store.mediaGallery) ? store.mediaGallery : []).filter(m => m != null).map(m => m._id),
      };

      let responseSlug = payload.slug;
      let finalData = null;

      if (postIdRef.current) {
        const { data } = await api.patch(`/api/admin/posts/${postIdRef.current}`, payload);
        finalData = data;
        if (data.post?.slug) responseSlug = data.post.slug;
      } else {
        const { data } = await api.post("/api/admin/posts", payload);
        finalData = data;
        postIdRef.current = data.post._id;
        if (data.post?.slug) responseSlug = data.post.slug;
      }
      
      // --- RESET UNSAVED CHANGES STATE ---
      if (typeof store?.setIsDirty === 'function') store.setIsDirty(false);
      const postToHydrate = {
        ...(finalData.post || finalData),
        mediaGallery: store.mediaGallery && store.mediaGallery.length > 0 ? store.mediaGallery : (finalData.post?.mediaGallery || []),
      };
      if (typeof store?.hydrate === 'function' && finalData) store.hydrate(postToHydrate);

      setSaveStatus(statusOverride === "PUBLISHED" ? "Published" : "Saved as draft");
      
      if (statusOverride === "PUBLISHED") {
        setTimeout(() => {
          navigate(`/blog/${responseSlug}`);
        }, 500);
      }
    } catch (err) {
      let errorMsg = err.response?.data?.details || err.response?.data?.message || err.message;
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMsg = "Network connection lost. Please check your internet connection and try again.";
      }
      setSaveError('Save Failed: ' + errorMsg);
      setSaveStatus("Error");
    } finally {
      isSavingRef.current = false;
      setIsBusy(false);
    }
  };

  useEffect(() => {
    const title = store.title?.trim() || "";
    const currentExcerpt = excerpt || "";
    const currentContent = editorRef.current?.getHTML?.() || content || "";

    if (!title) return;

    const hasChanges = 
      title !== lastSavedRef.current.title ||
      currentExcerpt !== lastSavedRef.current.excerpt ||
      currentContent !== lastSavedRef.current.content ||
      JSON.stringify(store.mediaGallery?.map(m => m?._id)) !== lastSavedRef.current.mediaGalleryIds;

    if (!hasChanges) return;

    const timeout = setTimeout(() => {
      handleSave("DRAFT").then(() => {
         lastSavedRef.current = { 
           title, 
           excerpt: currentExcerpt, 
           content: currentContent,
           mediaGalleryIds: JSON.stringify(store.mediaGallery?.map(m => m?._id))
         };
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [store.title, excerpt, content, store.mediaGallery]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-3xl flex-col gap-8 bg-[#000000] text-white pt-0 pb-8 px-6">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-[#333333] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={() => navigate("/admin/posts/new")}
            className="rounded-sm border border-[#333333] bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            New Post
          </button>
          <button
            type="button"
            onClick={() => handleSave("DRAFT")}
            disabled={isBusy}
            className="rounded-sm border border-[#333333] bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave("PUBLISHED")}
            disabled={isBusy}
            className="rounded-sm border border-[#333333] bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            {isBusy ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {/* --- TITLE & ROUTE NAME BOXES --- */}
      <div className="flex flex-col gap-0 mb-4">
        
        {/* Post Title Box */}
        <div className="p-4 border border-white/10 rounded-t-lg bg-[#0a0a0a] border-b-0">
          <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Post Title
          </label>
          <input
            type="text"
            value={store.title || ""}
            onChange={(e) => store.setTitle?.(e.target.value)}
            placeholder="Enter post title..."
            className="w-full bg-transparent border-b border-white/20 text-white placeholder-white/20 text-lg md:text-xl py-2 focus:outline-none focus:border-[#deff9a] transition-colors"
          />
        </div>

        {/* Route Name Box */}
        <div className="p-4 border border-white/10 rounded-b-lg bg-[#0a0a0a]">
          <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Route Name (Optional Custom URL)
          </label>
          <input
            type="text"
            placeholder="e.g. royal-wedding-ideas"
            value={routeName}
            onChange={(e) => {
              const formatted = e.target.value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
              setRouteName(formatted);
            }}
            className="w-full bg-transparent border-b border-white/20 text-white placeholder-white/20 text-sm py-2 focus:outline-none focus:border-[#deff9a] transition-colors"
          />
          <p className="text-white/30 text-xs mt-2">
            URL preview: /blog/{routeName || '<auto-generated>'}
          </p>
          {slugWarning && (
            <p className="text-[#ff6b6b] font-bold text-xs mt-2 animate-pulse">
              {slugWarning}
            </p>
          )}
        </div>

      </div>
      {/* --- END ROUTE NAME FIELD --- */}

      {/* --- CUSTOM SEO SETTINGS --- */}
      <div className="p-4 border border-white/10 rounded-lg bg-[#0a0a0a]">
        <h3 className="text-white/70 text-sm font-bold tracking-widest uppercase mb-4">Custom SEO Metadata</h3>
        
        <div className="mb-4">
          <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            SEO Title (Max 60 chars)
          </label>
          <input
            type="text"
            maxLength={60}
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Seo Title"
            className="w-full bg-transparent border-b border-white/20 text-white placeholder-white/20 text-sm py-2 focus:outline-none focus:border-[#deff9a] transition-colors"
          />
        </div>

        <div>
          <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            SEO Description (Max 160 chars)
          </label>
          <textarea
            maxLength={160}
            rows="2"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Brief description for Google Search results..."
            className="w-full bg-transparent border-b border-white/20 text-white placeholder-white/20 text-sm py-2 focus:outline-none focus:border-[#deff9a] transition-colors resize-none"
          ></textarea>
        </div>

        {/* --- SEO KEYWORDS FIELD --- */}
        <div className="mt-4">
          <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Meta Keywords (Comma separated)
          </label>
          <input
            type="text"
            value={seoKeywords}
            onChange={(e) => {
              // Allow letters, numbers, spaces, and commas
              const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,]/g, '');
              setSeoKeywords(sanitized);
            }}
            placeholder="e.g. luxury weddings, udaipur, cinematic"
            className="w-full bg-transparent border-b border-white/20 text-white placeholder-white/20 text-sm py-2 focus:outline-none focus:border-[#deff9a] transition-colors"
          />
        </div>
      </div>
      {/* --- END CUSTOM SEO SETTINGS --- */}

      <FeaturedImageUpload value={featuredImageUrl} onChange={setFeaturedImageUrl} />

      <div className="relative">
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Excerpt..."
          rows={4}
          maxLength={300}
          className="w-full resize-y rounded-sm border border-[#333333] bg-[#000000] px-4 py-3 pb-8 text-base text-white placeholder:text-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        />
        <div className="absolute bottom-2 right-3 text-[#777777] text-xs pointer-events-none">
          {excerpt?.length || 0}/300
        </div>
      </div>

      <div className="space-y-3">
        <TagInput 
          tags={store.tags || []} 
          onAddTag={(tag) => store.addTag?.(tag)}
        />
        
        {(store.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(store.tags) ? store.tags : []).map((tagId) => (
              <span key={tagId} className="inline-flex items-center gap-2 rounded-sm border border-[#333333] bg-[#000000] px-3 py-1.5 text-xs text-white">
                #{tagId.replace(/^#+/g, '')}
                <button type="button" onClick={() => store.removeTag?.(tagId)} className="text-[#777777] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-sm" aria-label={`Remove tag ${tagId}`}>
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {saveError && (
        <div role="alert" className="rounded-sm border border-[#333333] bg-[#000000] px-4 py-3 text-sm text-white">
          {saveError}
        </div>
      )}

      <TiptapEditor
        ref={editorRef}
        initialContent=""
        onChange={(html) => {
          setContent(html);
          if (!store.isDirty) store.setTitle?.(store.title ?? "");
        }}
      />
      
      {/* ── Portfolio Media Gallery Section ── */}
      <div className="mt-8 pt-8 border-t border-[#333333]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-syne text-2xl font-semibold text-white">Portfolio Media Gallery</h2>
          <button
            type="button"
            onClick={() => setIsMediaModalOpen(true)}
            className="rounded-sm border border-[#333333] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Add Media
          </button>
        </div>
        
        {store.mediaGallery?.length > 0 ? (
          <MediaGrid 
            mediaItems={store.mediaGallery} 
            onRemove={(id) => store.removeMediaFromGallery(id)} 
            onPreviewClick={setPreviewMedia}
          />
        ) : (
          <div className="text-[#777777] text-sm text-center py-10 border border-dashed border-[#333333] rounded-sm">
            No media in gallery. Click "Add Media" to select items.
          </div>
        )}
      </div>

      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        isMultiple={true}
        allowedTypes="*/*"
        onClose={() => setIsMediaModalOpen(false)}
        onInsertExisting={(media) => {
          const items = Array.isArray(media) ? media : [media];
          items.forEach(m => store.addMediaToGallery(m));
          setIsMediaModalOpen(false);
        }}
        onUploadSuccess={(newFiles) => {
          const items = Array.isArray(newFiles) ? newFiles : [newFiles];
          items.forEach(m => store.addMediaToGallery(m));
        }}
      />

      {previewMedia && (
         <MediaPreviewModal item={previewMedia} onClose={() => setPreviewMedia(null)} />
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api.js";
import { useEditorStore } from "../../stores/editorStore.js";
import TiptapEditor from "../../components/editor/TiptapEditor.jsx";
import FeaturedImageUpload from "../../components/editor/FeaturedImageUpload.jsx";
import MediaLibraryModal from "../../components/editor/MediaLibraryModal.jsx";
import MediaGrid from "../../components/public/MediaGrid.jsx";
import TagInput from "../../components/editor/TagInput.jsx";

function SaveStateIndicator() {
  const saveState = useEditorStore((state) => state.getSaveState());
  const label = saveState === "saving" ? "Saving..." : saveState === "unsaved" ? "Unsaved changes" : "Saved as draft";

  return (
    <div className="flex items-center gap-2 text-sm text-[#777777]" role="status" aria-live="polite">
      <span
        className={`h-2 w-2 rounded-full ${saveState === "saving" ? "animate-pulse bg-[#A1A1AA]" : saveState === "unsaved" ? "bg-[#555555]" : "bg-[#ffffff]"}`}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  const {
    title,
    slug,
    status,
    tags,
    hydrate,
    setTitle,
    setStatus,
    addTag,
    removeTag,
    beginSave,
    completeSave,
    failSave,
    isDirty,
    isSaving,
    mediaGallery,
  } = useEditorStore();

  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [routeName, setRouteName] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [slugWarning, setSlugWarning] = useState('');

  // Real-time Debounced Validation for Duplicate Titles/Routes
  useEffect(() => {
    // Calculate the live slug to check
    const slugToCheck = routeName 
      ? routeName.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
      : (title || "").toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (!slugToCheck) {
      setSlugWarning('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // If in EditPost.jsx, you can append &excludeId=${id} to the URL
        const res = await api.get(`/api/admin/check-slug?slug=${slugToCheck}&excludeId=${id}`);
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
  }, [title, routeName, id]);
  const contentRef = useRef(content);
  contentRef.current = content;

  const metaRef = useRef({ excerpt, featuredImageUrl, routeName, seoTitle, seoDescription, seoKeywords });
  metaRef.current = { excerpt, featuredImageUrl, routeName, seoTitle, seoDescription, seoKeywords };

  useEffect(() => {
    let cancelled = false;

    async function loadPost() {
      try {
        const { data } = await api.get(`/api/admin/posts/${id}`);
        if (cancelled) return;
        hydrate(data.post);
        setContent(data.post.content || "");
        setExcerpt(data.post.excerpt || "");
        setFeaturedImageUrl(data.post.featuredImageUrl || "");
        setRouteName(data.post.slug || "");
        setSeoTitle(data.post.seo_title || "");
        setSeoDescription(data.post.seo_description || "");
        setSeoKeywords(data.post.seo_keywords || "");
      } catch (err) {
        if (!cancelled) setLoadError(err?.response?.data?.message || "Could not load this post.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPost();
    return () => {
      cancelled = true;
    };
  }, [hydrate, id]);

  const isSavingRef = useRef(false);
  const save = useCallback(async (options = {}) => {
    const store = useEditorStore.getState();
    if (isSavingRef.current || store.isSaving) return;
    if (!options.force && !store.isDirty) return;
    
    const title = store.title?.trim() || "";
    // Intentionally suppress title errors during autosave so it doesn't pop up while typing empty
    if (!options.force && !title) return;

    const currentContent = editorRef.current?.getHTML?.() || contentRef.current || "";
    const cleanContentText = currentContent.replace(/<[^>]*>/g, '').trim();

    // The "Half-Baked Blog" Validation on Publish
    if (options.status === "PUBLISHED" || (!options.status && store.status === "PUBLISHED")) {
      if (!title) {
        setSaveError("Please provide a post title before publishing.");
        return;
      }
      if (!cleanContentText) {
        setSaveError("Please write some content for your post before publishing.");
        return;
      }
      if (!metaRef.current.featuredImageUrl) {
        setSaveError("Please select a cover image before publishing.");
        return;
      }
    }

    isSavingRef.current = true;
    beginSave();
    setSaveError("");
    try {
      const { data } = await api.patch(`/api/admin/posts/${id}`, {
        title: store.title,
        routeName: metaRef.current.routeName,
        slug: store.slug || slug,
        status: options.status || store.status,
        tags: store.tags || [],
        content: currentContent,
        excerpt: metaRef.current.excerpt,
        seo_title: metaRef.current.seoTitle,
        seo_description: metaRef.current.seoDescription,
        seo_keywords: metaRef.current.seoKeywords,
        featuredImageUrl: metaRef.current.featuredImageUrl,
        mediaGallery: store.mediaGallery?.filter(m => m != null).map(m => m._id) || [],
      });
      
      // --- RESET UNSAVED CHANGES STATE ---
      if (typeof store?.setIsDirty === 'function') store.setIsDirty(false);
      const postToHydrate = {
        ...(data.post || data),
        mediaGallery: store.mediaGallery && store.mediaGallery.length > 0 ? store.mediaGallery : (data.post?.mediaGallery || []),
      };
      if (typeof hydrate === 'function') hydrate(postToHydrate);

      completeSave({ postId: id });

      if (options.status === "PUBLISHED" || (!options.status && store.status === "PUBLISHED")) {
        const responseSlug = data.post?.slug || store.slug || slug;
        setTimeout(() => {
          navigate(`/blog/${responseSlug}`);
        }, 500);
      }
    } catch (err) {
      failSave();
      let errorMsg = err.response?.data?.details || err.response?.data?.message || err.message;
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMsg = "Network connection lost. Please check your internet connection and try again.";
      }
      setSaveError('Save Failed: ' + errorMsg);
    } finally {
      isSavingRef.current = false;
    }
  }, [beginSave, completeSave, failSave, id, slug, navigate]);

  useEffect(() => {
    if (!isDirty) return;
    const currentTitle = title?.trim();
    if (!currentTitle) return;

    const timeout = setTimeout(() => {
      save({ force: true, status: "DRAFT" });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [title, excerpt, content, mediaGallery, isDirty, save]);

  const markDirtyAndSetExcerpt = (value) => {
    setExcerpt(value);
    useEditorStore.setState({ isDirty: true });
  };

  const markDirtyAndSetFeaturedImage = (value) => {
    setFeaturedImageUrl(value);
    useEditorStore.setState({ isDirty: true });
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    useEditorStore.setState({ isDirty: true });
  };

  const removeTagByValue = (tag) => removeTag(typeof tag === "string" ? tag : tag._id);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 bg-[#000000] text-white">
        <div className="h-12 w-2/3 animate-pulse rounded-sm bg-[#333333]" />
        <div className="aspect-video animate-pulse rounded-sm border border-[#333333] bg-[#000000]" />
        <div className="h-72 animate-pulse rounded-sm border border-[#333333] bg-[#000000]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl rounded-sm border border-[#333333] bg-[#000000] p-6 text-white">
        <p className="text-base text-white">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate("/admin/posts")}
          className="mt-4 rounded-sm border border-[#333333] bg-[#000000] px-4 py-2 text-sm font-semibold text-white hover:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        >
          Back to posts
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-104px)] w-full max-w-3xl flex-col gap-8 bg-[#000000] text-white pt-0 pb-8 px-6">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-[#333333] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SaveStateIndicator />
          <button
            type="button"
            onClick={() => navigate("/admin/posts/new")}
            className="rounded-sm border border-[#333333] bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            New Post
          </button>
          <button
            type="button"
            onClick={() => save({ force: true, status: "DRAFT" })}
            disabled={isSaving}
            className="rounded-sm border border-[#333333] bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => save({ force: true, status: "PUBLISHED" })}
            disabled={isSaving}
            className="rounded-sm border border-[#333333] bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            {isSaving ? "Saving..." : "Publish"}
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
            value={title || ""}
            onChange={(e) => setTitle(e.target.value)}
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
              useEditorStore.setState({ isDirty: true });
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
      {/* --- EXISTING SEO BOX FOLLOWS IMMEDIATELY HERE --- */}
      
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
            onChange={(e) => {
              setSeoTitle(e.target.value);
              useEditorStore.setState({ isDirty: true });
            }}
            placeholder="seo title"
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
            onChange={(e) => {
              setSeoDescription(e.target.value);
              useEditorStore.setState({ isDirty: true });
            }}
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
              useEditorStore.setState({ isDirty: true });
            }}
            placeholder="e.g. luxury weddings, udaipur, cinematic"
            className="w-full bg-transparent border-b border-white/20 text-white placeholder-white/20 text-sm py-2 focus:outline-none focus:border-[#deff9a] transition-colors"
          />
        </div>
      </div>
      {/* --- END CUSTOM SEO SETTINGS --- */}

      <FeaturedImageUpload value={featuredImageUrl} onChange={markDirtyAndSetFeaturedImage} postId={id} />

      <div className="relative">
        <textarea
          value={excerpt}
          onChange={(e) => markDirtyAndSetExcerpt(e.target.value)}
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
          tags={tags || []} 
          onAddTag={(tag) => addTag(tag)}
        />
        {(tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const tagStr = typeof tag === "string" ? tag : tag.name || tag._id;
              return (
                <span key={typeof tag === "string" ? tag : tag._id} className="inline-flex items-center gap-2 rounded-sm border border-[#333333] bg-[#000000] px-3 py-1.5 text-xs text-white">
                  #{tagStr.replace(/^#+/g, '')}
                  <button type="button" onClick={() => removeTagByValue(tag)} className="text-[#777777] hover:text-white" aria-label="Remove tag">
                    x
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {saveError && (
        <div role="alert" className="rounded-sm border border-[#333333] bg-[#000000] px-4 py-3 text-sm text-white">
          {saveError}
        </div>
      )}

      <TiptapEditor ref={editorRef} initialContent={content} onChange={setContent} />

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
        
        {mediaGallery?.length > 0 ? (
          <MediaGrid 
            mediaItems={mediaGallery} 
            onRemove={(id) => useEditorStore.getState().removeMediaFromGallery(id)} 
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
          items.forEach(m => useEditorStore.getState().addMediaToGallery(m));
          setIsMediaModalOpen(false);
        }}
        onUploadSuccess={(newFiles) => {
          const items = Array.isArray(newFiles) ? newFiles : [newFiles];
          items.forEach(m => useEditorStore.getState().addMediaToGallery(m));
        }}
      />
    </div>
  );
}

// frontend/src/pages/admin/Settings.jsx
//
// Global SEO defaults (/admin/settings) — fully dark.
// All form inputs: bg-black, border-[#333333], text-white.
// Save state feedback is inline, no toasts.

import { useEffect, useState, useCallback } from "react";
import api from "../../services/api.js";

const EMPTY_FORM = {
  siteTitle:              "",
  defaultMetaDescription: "",
  defaultOgImageUrl:      "",
  siteUrl:                "",
  postsPerPage:           12,
};

// ── Shared dark input components ──────────────────────────────────────────

function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA] mb-2"
    >
      {children}
    </label>
  );
}

const inputBase = "w-full bg-black border border-[#333333] px-4 py-3 font-sans text-sm text-white rounded-sm placeholder:text-[#555555] transition-colors duration-fast focus-visible:outline-none focus-visible:border-white focus-visible:ring-0";

// ── Page ──────────────────────────────────────────────────────────────────

export default function Settings() {
  const [status,    setStatus]    = useState("loading");
  const [error,     setError]     = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saveState, setSaveState] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'
  const [metaTitle, setMetaTitle] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    api.get("/api/admin/settings")
      .then((res) => {
        setForm({ ...EMPTY_FORM, ...res.data.settings });
        setMetaTitle(res.data.settings?.metaTitle || "");
        setMetaKeywords(res.data.settings?.metaKeywords || "");
        setStatus("success");
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? "Couldn't load settings.");
        setStatus("error");
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (saveState !== "idle") setSaveState("idle");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!metaTitle.trim()) {
      setError("Default Meta Title is required.");
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    try {
      const payload = {
        ...form,
        metaTitle,
        metaKeywords,
        postsPerPage: Number(form.postsPerPage) || 10
      };
      await api.patch("/api/admin/settings", payload);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const descLen     = form.defaultMetaDescription.length;
  const descTooLong = descLen > 160;

  // Loading skeleton
  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="space-y-4" aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[#111111] rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div role="alert" className="flex items-center justify-between gap-3 bg-[#111111] border border-[#333333] rounded-md px-5 py-4">
          <p className="font-sans text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={load}
            className="font-sans text-xs font-semibold text-white border border-[#333333] px-4 py-2 rounded-sm hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 pt-0 pb-8">

      {/* Page header */}
      <div className="mb-6">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] mb-2">
          Configuration
        </p>
        <h1 className="font-syne text-3xl font-bold text-white leading-none">Settings</h1>
        <p className="mt-3 font-sans text-sm text-[#A1A1AA] leading-relaxed">
          Global SEO defaults. Applied as fallbacks when individual posts don&apos;t define their own meta values.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SEO section */}
        <section className="bg-[#111111] border border-[#333333] rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333333]">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
              Site Identity
            </h2>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <FieldLabel htmlFor="set-site-title">Site Title</FieldLabel>
              <input
                id="set-site-title"
                type="text"
                value={form.siteTitle}
                onChange={updateField("siteTitle")}
                className={inputBase}
                placeholder="Fotographiya Blog"
              />
            </div>
            <div>
              <FieldLabel htmlFor="set-site-url">Canonical Site URL</FieldLabel>
              <input
                id="set-site-url"
                type="url"
                value={form.siteUrl}
                onChange={updateField("siteUrl")}
                className={inputBase}
                placeholder="https://fotographiya.com"
              />
            </div>
          </div>
        </section>

        {/* Meta section */}
        <section className="bg-[#111111] border border-[#333333] rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333333]">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
              Default Meta Tags
            </h2>
          </div>
          <div className="px-6 py-5 space-y-5">
            {/* --- DEFAULT META TITLE --- */}
            <div className="mb-6">
              <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                Default Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setMetaTitle(e.target.value);
                  if (saveState !== "idle") setSaveState("idle");
                }}
                placeholder="e.g., Fotographiya | Luxury Destination Wedding Photography"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg text-white p-3 text-sm focus:outline-none focus:border-[#deff9a] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <FieldLabel htmlFor="set-meta-desc">Default Meta Description</FieldLabel>
                <span className={`font-sans text-[10px] tabular-nums ${descTooLong ? "text-white font-semibold" : "text-[#555555]"}`}>
                  {descLen}/160
                </span>
              </div>
              <textarea
                id="set-meta-desc"
                rows={3}
                value={form.defaultMetaDescription}
                onChange={updateField("defaultMetaDescription")}
                className={`${inputBase} resize-none`}
                placeholder="A cinematic wedding photography blog…"
              />
              {descTooLong && (
                <p className="mt-2 font-sans text-xs text-[#A1A1AA]">
                  Search engines truncate descriptions past 160 characters.
                </p>
              )}
            </div>

            {/* --- DEFAULT META KEYWORDS --- */}
            <div className="mb-6 mt-6">
              <label className="block text-white/50 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                Default Meta Keywords
              </label>
              <input
                type="text"
                value={metaKeywords}
                onChange={(e) => {
                  // Validation: Sanitize invalid special characters, allow only letters, numbers, spaces, and commas
                  const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s,]/g, '');
                  setMetaKeywords(sanitized);
                  if (saveState !== "idle") setSaveState("idle");
                }}
                placeholder="e.g., wedding, photography, cinematic, luxury"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg text-white p-3 text-sm focus:outline-none focus:border-[#deff9a] transition-colors"
              />
            </div>

            <div>
              <FieldLabel htmlFor="set-og-image">Default Open Graph Image URL</FieldLabel>
              <input
                id="set-og-image"
                type="url"
                value={form.defaultOgImageUrl}
                onChange={updateField("defaultOgImageUrl")}
                className={inputBase}
                placeholder="https://fotographiya.com/og-default.jpg"
              />
            </div>
          </div>
        </section>

        {/* Feed section */}
        <section className="bg-[#111111] border border-[#333333] rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333333]">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
              Feed Behaviour
            </h2>
          </div>
          <div className="px-6 py-5">
            <FieldLabel htmlFor="set-posts-per-page">Posts Per Page</FieldLabel>
            <input
              id="set-posts-per-page"
              type="number"
              min={1}
              max={50}
              value={form.postsPerPage}
              onChange={updateField("postsPerPage")}
              className={`${inputBase} w-28 tabular-nums`}
            />
            <p className="mt-2 font-sans text-xs text-[#555555]">Min 1 · Max 50</p>
          </div>
        </section>

        {/* Save row */}
        <div className="flex items-center gap-5 pt-2">
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="bg-[#000000] text-white font-sans text-sm font-semibold px-6 py-3 rounded-sm hover:opacity-80 transition-opacity duration-fast disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {saveState === "saving" ? "Saving…" : "Save Settings"}
          </button>

          <span aria-live="polite" className="font-sans text-sm">
            {saveState === "saved" && (
              <span className="text-[#A1A1AA] flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="text-white">Couldn&apos;t save — try again.</span>
            )}
          </span>
        </div>
      </form>
    </div>
  );
}

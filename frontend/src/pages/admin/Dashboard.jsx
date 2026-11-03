// frontend/src/pages/admin/Dashboard.jsx
//
// Dark-theme admin dashboard. Each widget is independently loaded — one
// widget failing never blocks the rest (App Flow §4 shell-first contract).
//
// Surface palette:
//   Page bg:       bg-black  (#000000)
//   Card surface:  bg-[#111111]
//   Card border:   border-[#333333]
//   Skeleton:      bg-[#222222] animate-pulse
//   Primary text:  text-white
//   Muted text:    text-[#A1A1AA]

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

function useWidget(fetcher, deps = []) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: "loading" }));
    fetcher()
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((err) => setState({ status: "error", data: null, error: err?.message ?? "Failed to load" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { ...state, retry: load };
}

// ── Dark stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, hint, status, error, onRetry }) {
  if (status === "loading") {
    return (
      <div className="border border-white/10 rounded-lg p-6 flex flex-col justify-between min-h-[120px] w-full bg-transparent">
        <div className="h-3 w-24 rounded bg-white/5 animate-pulse mb-4" />
        <div className="h-10 w-16 rounded bg-white/5 animate-pulse mt-auto" />
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#333333] rounded-md p-6 flex flex-col justify-between min-h-[120px] w-full">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">
        {label}
      </p>

      {status === "error" && (
        <div role="alert" className="mt-3 flex items-center justify-between gap-2">
          <p className="font-sans text-xs text-[#A1A1AA] leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 font-sans text-xs font-semibold text-white border border-[#333333] px-3 py-1.5 rounded-sm hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="mt-4 flex items-end gap-3">
          <p className="font-syne text-4xl font-bold text-white tabular-nums leading-none">
            {value}
          </p>
          {hint && <p className="font-sans text-xs text-[#A1A1AA] mb-1 leading-tight">{hint}</p>}
        </div>
      )}
    </div>
  );
}

// ── Dark widget card (for chart + drafts list) ────────────────────────────

function WidgetCard({ title, status, error, onRetry, children, className = "" }) {
  return (
    <div className={`bg-[#111111] border border-[#333333] rounded-md p-6 ${className}`}>
      <p className="mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">
        {title}
      </p>

      {status === "loading" && (
        <div className="space-y-3" aria-hidden="true">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-5 rounded-sm bg-[#222222] animate-pulse" style={{ width: `${70 - i * 15}%` }} />
          ))}
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="flex items-center justify-between gap-3">
          <p className="font-sans text-sm text-[#A1A1AA]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 font-sans text-xs font-semibold text-white border border-[#333333] px-3 py-1.5 rounded-sm hover:border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Retry
          </button>
        </div>
      )}

      {status === "success" && children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const totalPosts = useWidget(() =>
    api.get("/api/admin/posts", { params: { status: "PUBLISHED,DRAFT", limit: 1 } })
      .then((res) => res.data.total ?? res.data.posts?.length ?? 0)
  );

  const publishedCount = useWidget(() =>
    api.get("/api/admin/posts", { params: { status: "PUBLISHED", limit: 1 } })
      .then((res) => res.data.total ?? res.data.posts?.length ?? 0)
  );

  const recentDrafts = useWidget(() =>
    api.get("/api/admin/posts", {
      params: { status: "DRAFT", limit: 5, sort: "-updatedAt", select: "title,slug,updatedAt" },
    }).then((res) => res.data.posts ?? [])
  );

  const trashedCount = useWidget(() =>
    api.get("/api/admin/posts", { params: { status: "TRASHED", limit: 1 } })
      .then((res) => res.data.total ?? res.data.posts?.length ?? 0)
  );

  const publishActivity = useWidget(() =>
    api.get("/api/admin/posts", { params: { status: "PUBLISHED", limit: 100 } })
      .then((res) => {
        const posts = res.data.posts ?? [];
        
        const activityMap = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          activityMap[dateStr] = 0;
        }

        posts.forEach(post => {
          if (!post.publishedAt && !post.createdAt) return;
          const d = new Date(post.publishedAt || post.createdAt);
          const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (activityMap[dateStr] !== undefined) {
            activityMap[dateStr]++;
          }
        });

        return Object.entries(activityMap).map(([month, count]) => ({ month, count }));
      })
  );

  return (
    <div className="max-w-6xl mx-auto px-8 pt-0 pb-8">

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] mb-2">
            Overview
          </p>
          <h1 className="font-syne text-3xl font-bold text-white leading-none">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            target="_blank"
            className="text-sm text-[#A1A1AA] hover:text-white transition-colors border border-transparent hover:border-[#333333] px-4 py-2 rounded"
          >
            View Blog
          </Link>
          <Link
            to="/admin/posts/new"
            className="font-sans text-sm font-semibold border border-white text-white px-6 py-2 rounded-sm hover:bg-[#111111] transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Create a New Post
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-6">
        <StatCard
          label="Total Posts"
          value={totalPosts.data}
          status={totalPosts.status}
          error={totalPosts.error}
          onRetry={totalPosts.retry}
        />
        <StatCard
          label="In Trash"
          value={trashedCount.data}
          hint={trashedCount.data > 0 ? "auto-purge in 7 days" : undefined}
          status={trashedCount.status}
          error={trashedCount.error}
          onRetry={trashedCount.retry}
        />
        <StatCard
          label="PUBLISHED POSTS"
          value={publishedCount.data}
          status={publishedCount.status}
          error={publishedCount.error}
          onRetry={publishedCount.retry}
        />
      </div>

      {/* Bottom row: drafts list + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent drafts — 2 / 5 columns */}
        <WidgetCard
          title="Recent Drafts"
          status={recentDrafts.status}
          error={recentDrafts.error}
          onRetry={recentDrafts.retry}
          className="lg:col-span-2"
        >
          {(recentDrafts.data || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              {/* Intentional empty state */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#333333]" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p className="font-sans text-sm text-[#A1A1AA] text-center">
                No drafts in progress
              </p>
              <Link
                to="/admin/posts/new"
                className="font-sans text-xs text-white underline underline-offset-2 hover:no-underline transition-all duration-fast"
              >
                Start writing →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#222222]">
              {(recentDrafts.data || []).map((post) => (
                <li key={post._id ?? post.slug}>
                  <Link
                    to={`/admin/posts/${post._id}/edit`}
                    className="flex items-start justify-between gap-3 py-3 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-sm"
                  >
                    <span className="font-sans text-sm text-white group-hover:text-[#A1A1AA] transition-colors duration-fast truncate">
                      {post.title || <span className="italic text-[#A1A1AA]">Untitled</span>}
                    </span>
                    <span className="font-sans text-[10px] text-[#A1A1AA] shrink-0 pt-0.5 tabular-nums">
                      {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>

        {/* Publish activity chart — 3 / 5 columns */}
        <WidgetCard
          title="Monthly Publish Activity"
          status={publishActivity.status}
          error={publishActivity.error}
          onRetry={publishActivity.retry}
          className="lg:col-span-3"
        >
          <div className="h-64 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={publishActivity.data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#555555" tick={{ fill: '#777777', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#222222', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  cursor={{ stroke: '#333333', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="count" stroke="#ffffff" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, fill: '#000000', stroke: '#ffffff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}



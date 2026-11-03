// frontend/src/components/admin/ReAuthModal.jsx
//
// FIX Bug 8: bg-[#000000] → bg-[#111111] on modal panel and input fields.
// In the dark theme surface-light = #ffffff (white), which renders a pure
// white box over the black admin editor — visually broken.

import { useEffect, useRef, useState } from "react";
import api from "../../services/api.js";

export default function ReAuthModal({ onSuccess }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus]     = useState("idle");
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      await api.post("/api/auth/login", { email, password });
      onSuccess?.();
    } catch {
      setStatus("invalid");
      setPassword("");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-title"
      className="fixed inset-0 flex items-center justify-center px-4 bg-black/80"
      style={{ zIndex: "var(--z-overlay)" }}
    >
      {/* FIX: bg-[#000000] (#fff) → bg-[#111111] */}
      <div className="w-full max-w-sm border border-[#333333] rounded-sm bg-[#111111] p-8">
        <h2 id="reauth-title" className="font-sans text-base font-semibold text-white">
          Your session expired
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed" style={{ color: "#777777" }}>
          Sign back in to keep editing — nothing you've written here will be lost.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="reauth-email"
              className="block mb-2 font-sans text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#777777" }}
            >
              Email
            </label>
            {/* FIX: bg-[#000000] → bg-[#000000] (input field on dark elevated surface) */}
            <input
              ref={emailRef}
              id="reauth-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              disabled={status === "submitting"}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-[#333333] bg-[#000000] px-4 py-2.5 font-sans text-sm text-white placeholder:text-[#777777] transition-colors duration-fast hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
            />
          </div>

          <div>
            <label
              htmlFor="reauth-password"
              className="block mb-2 font-sans text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#777777" }}
            >
              Password
            </label>
            {/* FIX: bg-[#000000] → bg-[#000000] */}
            <input
              id="reauth-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              disabled={status === "submitting"}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-[#333333] bg-[#000000] px-4 py-2.5 font-sans text-sm text-white placeholder:text-[#777777] transition-colors duration-fast hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
            />
          </div>

          {status === "invalid" && (
            <p role="alert" aria-live="assertive" className="font-sans text-sm text-white">
              Incorrect email or password. Try again.
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-sm bg-[#000000] text-white px-5 py-3 font-sans text-sm font-semibold transition-colors duration-fast hover:bg-transparent hover:text-white border border-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {status === "submitting" ? "Signing in…" : "Sign in & resume editing"}
          </button>
        </form>
      </div>
    </div>
  );
}


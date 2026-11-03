// frontend/src/pages/auth/Login.jsx
//
// Admin login — dark theme (#000000 bg, #ffffff text, #333333 borders).

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api.js";

const RATE_LIMIT_FALLBACK_SECONDS = 15 * 60;

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getRetryAfterSeconds(error) {
  const headerVal = error?.response?.headers?.["retry-after"];
  if (headerVal && !isNaN(Number(headerVal))) return Number(headerVal);
  const bodyVal = error?.response?.data?.retryAfter ?? error?.response?.data?.msBeforeNext;
  if (typeof bodyVal === "number") return bodyVal > 1000 ? Math.ceil(bodyVal / 1000) : bodyVal;
  return RATE_LIMIT_FALLBACK_SECONDS;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Scale up the entire UI by 25%
    document.documentElement.style.fontSize = '135%';
    
    // Cleanup: Revert to default when leaving the admin panel
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, []);

  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // <-- Nayi state eye button ke liye
  const [shakeKey, setShakeKey] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const emailRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const callbackUrl = new URLSearchParams(location.search).get("callbackUrl") || "/admin";

  useEffect(() => {
    let cancelled = false;
    api.get("/api/auth/me")
      .then(() => { if (!cancelled) navigate(callbackUrl, { replace: true }); })
      .catch(() => { if (!cancelled) setStatus("idle"); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === "idle") emailRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (status !== "rate-limited") return;
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(countdownIntervalRef.current); setStatus("idle"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownIntervalRef.current);
  }, [status]);

  const triggerShake = useCallback(() => setShakeKey((k) => k + 1), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "submitting" || status === "rate-limited") return;
    setStatus("submitting");
    try {
      await api.post("/api/auth/login", { email, password });
      setStatus("success");
      navigate(callbackUrl, { replace: true });
    } catch (err) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 429) {
        setSecondsLeft(getRetryAfterSeconds(err));
        setStatus("rate-limited");
        return;
      }
      setStatus("invalid");
      setPassword("");
      triggerShake();
      emailRef.current?.focus();
    }
  };

  const isLocked = status === "submitting" || status === "rate-limited";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] px-4">
      <style>{`
        @keyframes fotographiya-shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .fotographiya-shake {
          animation: fotographiya-shake 500ms cubic-bezier(.36,.07,.19,.97) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .fotographiya-shake { animation: none; }
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-syne text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-[#777777]">Sign in to manage posts and settings</p>
        </div>

        {/* Rate-limited banner */}
        {status === "rate-limited" && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 border border-[#333333] bg-[#111111] px-4 py-3"
          >
            <p className="font-sans text-sm font-semibold text-ink-primary">
              Too many attempts
            </p>
            <p className="mt-1 font-sans text-sm" style={{ color: "#777777" }}>
              Blocked. Retry in{" "}
              <span className="font-semibold text-ink-primary tabular-nums">
                {formatCountdown(secondsLeft)}
              </span>.
            </p>
          </div>
        )}

        <form
          key={shakeKey}
          onSubmit={handleSubmit}
          noValidate
          className={shakeKey > 0 && status === "invalid" ? "fotographiya-shake" : ""}
        >
          <div className="border border-[#333333] bg-[#000000] p-8">
            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="login-email"
                className="block mb-2 font-sans text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#777777" }}
              >
                Username / Email
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="text"
                autoComplete="username"
                required
                value={email}
                disabled={isLocked}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={status === "invalid"}
                aria-describedby={status === "invalid" ? "login-error" : undefined}
                className="w-full border border-[#333333] bg-[#000000] px-4 py-3 font-sans text-sm text-white placeholder:text-[#777777] transition-colors duration-fast hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <label
                htmlFor="login-password"
                className="block mb-2 font-sans text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#777777" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"} // <-- Condition lagayi hai type ke liye
                  autoComplete="current-password"
                  required
                  value={password}
                  disabled={isLocked}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={status === "invalid"}
                  aria-describedby={status === "invalid" ? "login-error" : undefined}
                  className="w-full border border-[#333333] bg-[#000000] pl-4 pr-12 py-3 font-sans text-sm text-white placeholder:text-[#777777] transition-colors duration-fast hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed"
                />

                {/* Eye Button */}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-[#777777] transition-colors duration-fast hover:text-white focus-visible:outline-none focus-visible:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    // Eye slash icon (Hide)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    // Eye icon (Show)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {status === "invalid" && (
              <p
                id="login-error"
                role="alert"
                aria-live="assertive"
                className="mb-4 font-sans text-sm text-ink-primary"
              >
                Incorrect email or password. Try again.
              </p>
            )}

            <button
              type="submit"
              disabled={isLocked}
              className="mt-4 w-full px-5 py-3 font-sans text-sm font-bold text-white border border-white rounded-sm bg-transparent hover:bg-[#111111] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <span>{status === "submitting" ? "Authenticating…" : "Sign in"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

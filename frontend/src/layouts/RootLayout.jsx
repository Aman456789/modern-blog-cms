// frontend/src/layouts/RootLayout.jsx
//
// Top-level provider wrapper — QueryClient, ScrollRestoration, ErrorBoundary.
// Dark theme applied to the error boundary fallback screen.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools }               from "@tanstack/react-query-devtools";
import { useEffect, Component }             from "react";
import { useLocation }                      from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      gcTime:               5 * 60_000,
      refetchOnWindowFocus: false,
      retry:                1,
      retryDelay:           1_000,
    },
    mutations: { retry: 0 },
  },
});

function ScrollRestoration() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#000000] px-6"
        role="alert"
      >
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-syne text-4xl text-white">
            Something went wrong
          </h1>
          <p className="font-sans text-base leading-relaxed" style={{ color: "#777777" }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          <pre className="text-left text-xs bg-[#111111] border border-[#333333] p-4 overflow-auto max-h-40 text-white">
            {this.state.error?.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 font-sans text-sm font-bold bg-[#000000] text-white hover:bg-transparent hover:text-white border border-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

import SEOMeta from "../components/public/SEOMeta.jsx";

export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ScrollRestoration />
        <SEOMeta />
        {children}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom-left" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

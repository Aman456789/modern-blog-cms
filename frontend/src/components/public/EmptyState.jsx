// frontend/src/components/public/EmptyState.jsx
// Dark theme — #000000 bg, #777777 muted text.

const DEFAULT_MESSAGE = "Blogs coming soon. We are capturing beautiful moments.";

export default function EmptyState({ message = DEFAULT_MESSAGE }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center bg-surface-dark">
      <div className="w-12 h-px bg-[#333333] mb-8" aria-hidden="true" />
      <p className="font-sans text-base" style={{ color: "#777777" }}>
        {message}
      </p>
    </div>
  );
}

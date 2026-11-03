// frontend/src/components/public/AuthorBlock.jsx
// Dark theme — #333333 border, #ffffff name, #777777 label, #111111 avatar bg.

export default function AuthorBlock({ author }) {
  if (!author?.name) return null;

  const initial = author.name.trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 border-t border-[#333333] pt-6">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-[#111111] border border-[#333333] font-syne text-lg font-bold text-white"
      >
        {initial}
      </div>
      <div>
        <p className="font-sans text-sm font-semibold text-ink-primary">
          {author.name}
        </p>
        <p className="font-sans text-xs" style={{ color: "#777777" }}>
          Fotographiya
        </p>
      </div>
    </div>
  );
}

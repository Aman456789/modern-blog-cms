// frontend/src/components/ui/Skeleton.jsx
// Dark theme — #111111 skeleton fill (not light grey).

export default function Skeleton({ className = "", circle = false }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse bg-white/5",
        circle ? "rounded-pill" : "rounded-sm",
        className,
      ].join(" ")}
    />
  );
}

export function SkeletonText({ lines = 3, lastLineWidth = "w-2/3" }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? lastLineWidth : "w-full"}`}
        />
      ))}
    </div>
  );
}

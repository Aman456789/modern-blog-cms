// frontend/src/components/ui/Badge.jsx
// Dark theme — solid: white bg/black text; outline: #333 border, #777 text.

const VARIANT_CLASSES = {
  solid:   "border-white bg-white text-black",
  outline: "border-[#333333] text-[#777777]",
};

export default function Badge({ variant = "outline", className = "", children }) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-pill border px-2.5 py-0.5",
        "font-sans text-xs font-semibold uppercase tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

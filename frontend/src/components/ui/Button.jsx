// frontend/src/components/ui/Button.jsx
//
// Dark theme button primitive.
//
// Variants on a #000000 background:
//   primary   — white fill (#ffffff bg, #000000 text) — primary CTA
//   secondary — transparent, #333333 border, white text; hover fills white
//   ghost     — no border, white text; hover shows subtle #111 fill
//
// These are strict B&W — no colour enters this system.

import { forwardRef } from "react";

const VARIANT_CLASSES = {
  primary:
    "bg-white text-black border border-white hover:bg-transparent hover:text-white",
  secondary:
    "bg-transparent text-white border border-[#333333] hover:border-white hover:bg-white hover:text-black",
  ghost:
    "bg-transparent text-white border border-transparent hover:bg-[#111111]",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = forwardRef(function Button(
  {
    variant  = "primary",
    size     = "md",
    isLoading = false,
    disabled  = false,
    className = "",
    children,
    type      = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-semibold",
        "transition-colors duration-fast ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-pill border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

export default Button;

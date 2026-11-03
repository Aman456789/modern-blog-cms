// frontend/src/components/ui/Input.jsx
//
// Dark theme input primitive.
//   - bg #000000 (surface-dark), text #ffffff (ink-primary)
//   - border #333333 (surface-mid) at rest
//   - border #ffffff on focus/hover
//   - focus ring: 2px solid white
//   - error state: border #ffffff + role="alert" helper text

import { forwardRef, useId } from "react";

const Input = forwardRef(function Input(
  { label, helperText, error, className = "", id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = helperText || error ? `${inputId}-helper` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-sans text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#777777" }}
        >
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={helperId}
        className={[
          "w-full rounded-sm border bg-[#000000] px-3 py-2 font-sans text-base text-white",
          "placeholder:text-[#777777]",
          "transition-colors duration-fast",
          "hover:border-white",
          "focus:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black",
          error ? "border-white" : "border-[#333333]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className,
        ].join(" ")}
        {...rest}
      />

      {(helperText || error) && (
        <p
          id={helperId}
          role={error ? "alert" : undefined}
          className="font-sans text-sm"
          style={{ color: error ? "#ffffff" : "#777777" }}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

export default Input;

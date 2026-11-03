// frontend/src/components/ui/Dropdown.jsx
// Dark theme — #000000 panel, #333333 border, white hover state.
// shadow-sm intentionally removed: no generic shadows in dark theme.

import { useEffect, useId, useRef, useState } from "react";

export default function Dropdown({ isOpen, onClose, options, onSelect, trigger }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxId    = useId();

  useEffect(() => {
    if (!isOpen) setActiveIndex(-1);
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleKeyDown = (e) => {
    if (!isOpen || options.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        let next = prev;
        do { next = (next + 1) % options.length; }
        while (options[next]?.disabled && next !== prev);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        let next = prev;
        do { next = next <= 0 ? options.length - 1 : next - 1; }
        while (options[next]?.disabled && next !== prev);
        return next;
      });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && !options[activeIndex]?.disabled) {
        e.preventDefault();
        onSelect(options[activeIndex]);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const activeDescendant =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      {trigger({
        onKeyDown:               handleKeyDown,
        "aria-expanded":         isOpen,
        "aria-controls":         listboxId,
        "aria-activedescendant": activeDescendant,
        role:                    "combobox",
        "aria-autocomplete":     "list",
      })}

      {isOpen && options.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-drawer mt-1 w-full overflow-hidden border border-[#333333] bg-[#000000]"
        >
          {options.map((option, index) => {
            const isActive = index === activeIndex;
            return (
              <li
                key={option.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isActive}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                onMouseDown={(e) => {
                  if (option.disabled) return;
                  e.preventDefault();
                  onSelect(option);
                  onClose();
                }}
                className={[
                  "px-3 py-2 font-sans text-base transition-colors duration-instant",
                  option.disabled
                    ? "cursor-not-allowed text-[#777777]"
                    : "cursor-pointer text-ink-primary",
                  isActive && !option.disabled
                    ? "bg-white text-black"
                    : !option.disabled && "hover:bg-white hover:text-black",
                ].join(" ")}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

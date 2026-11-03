// frontend/src/components/editor/SmartSuggestions.jsx
//
// Debounced suggestions dropdown for tag metadata inputs.
// Trigger: typing in the field fires a 300ms-debounced GET
// /api/admin/suggestions call; the dropdown shows previously used tags.
// Fully keyboard-navigable (Up/Down/Enter) per accessibility best practices.

import { useEffect, useRef, useState } from "react";
import api from "../../services/api.js";

const DEBOUNCE_MS = 300;

/**
 * @param {object} props
 * @param {'tag'|'category'} props.kind - Which suggestion list to query
 * @param {string} props.value - Current input value (controlled by parent)
 * @param {(value: string) => void} props.onChange - Fired as the admin types
 * @param {(suggestion: { id: string, name: string }) => void} props.onSelect - Fired on selection (click or Enter)
 * @param {string} [props.placeholder]
 * @param {string} [props.label]
 */
export default function SmartSuggestions({
  kind,
  value,
  onChange,
  onSelect,
  placeholder,
  label,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value?.trim();
    if (!query) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (kind !== 'tag') {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      try {
        const { data } = await api.get("/api/admin/suggestions", {
          params: { kind, q: query },
        });

        // Discard stale responses that resolved out of order.
        if (seq !== requestSeqRef.current) return;

        const items = data?.suggestions ?? [];
        setSuggestions(items);
        setIsOpen(items.length > 0);
        setActiveIndex(-1);
      } catch {
        if (seq === requestSeqRef.current) {
          setSuggestions([]);
          setIsOpen(false);
        }
      } finally {
        if (seq === requestSeqRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [value, kind]);

  // Close the dropdown on outside click, without interfering with the
  // keyboard interaction path.
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = (suggestion) => {
    onSelect?.(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const listboxId = `smart-suggestions-${kind}`;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          htmlFor={listboxId}
          className="mb-1 block font-sans text-xs uppercase tracking-widest text-[#777777]"
        >
          {label}
        </label>
      )}

      <input
        id={listboxId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${listboxId}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        className="w-full rounded-sm border border-[#333333] bg-[#000000] px-3 py-2 font-sans text-base text-white placeholder:text-[#555555] focus-visible:outline-none"
      />

      {isOpen && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          className="absolute z-drawer mt-1 w-full overflow-hidden rounded-sm border border-[#333333] bg-[#000000] shadow-sm"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                // mousedown (not click) so this fires before the
                // outside-click handler can close the dropdown first.
                e.preventDefault();
                selectSuggestion(suggestion);
              }}
              className={[
                "cursor-pointer px-3 py-2 font-sans text-base transition-colors duration-instant",
                index === activeIndex
                  ? "bg-transparent text-white border-l-2 border-white pl-2.5"
                  : "text-[#A1A1AA] hover:text-white hover:border-l-2 hover:border-[#333333] border-l-2 border-transparent pl-2.5",
              ].join(" ")}
            >
              {suggestion.name}
            </li>
          ))}
        </ul>
      )}

      {isLoading && (
        <span className="sr-only" role="status">
          Loading suggestions
        </span>
      )}
    </div>
  );
}


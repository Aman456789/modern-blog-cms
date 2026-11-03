// frontend/src/components/ui/Tabs.jsx
// Dark theme tab strip — active: white bg/black text; inactive: #777 text.

import { useRef } from "react";

export default function Tabs({ tabs, activeId, onChange, label = "Filter" }) {
  const tabRefs = useRef([]);

  const focusAndActivate = (index) => {
    const tab = tabs[index];
    if (!tab) return;
    tabRefs.current[index]?.focus();
    onChange(tab.id);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusAndActivate((index + 1) % tabs.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusAndActivate(index === 0 ? tabs.length - 1 : index - 1);
    } else if (e.key === "Home") {
      e.preventDefault(); focusAndActivate(0);
    } else if (e.key === "End") {
      e.preventDefault(); focusAndActivate(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-2 border-b border-[#333333]"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              "border-b-2 px-4 py-2 font-sans text-sm font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
              isActive
                ? "border-white bg-white text-black"
                : "border-transparent text-[#777777] hover:text-ink-primary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

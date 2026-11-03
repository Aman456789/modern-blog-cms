import { useState, useEffect, useRef } from "react";
import api from "../../services/api.js";

export default function TagInput({ tags, onAddTag }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get("/api/posts/tags")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAvailableTags(res.data);
        }
      })
      .catch((err) => console.error("Failed to fetch tags", err));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = availableTags.filter(
    (t) => {
      const suggestionStr = t || '';
      const cleanSuggestion = suggestionStr.replace(/^#+/g, '').trim();
      return suggestionStr.toLowerCase().includes((inputValue || '').toLowerCase()) && 
             !(tags || []).includes(cleanSuggestion);
    }
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Sanitize tag before adding to state
      const rawTag = filteredTags.length > 0 && isOpen ? filteredTags[0] : inputValue;
      const cleanTag = rawTag.replace(/^#+/g, '').trim();
      
      if (cleanTag && !(tags || []).includes(cleanTag)) {
        onAddTag(cleanTag);
      }
      setInputValue("");
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1 block font-sans text-xs uppercase tracking-widest text-[#777777]">
        Tags
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
        className="w-full rounded-sm border border-[#333333] bg-[#000000] px-3 py-2 font-sans text-base text-white placeholder:text-[#555555] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        autoComplete="off"
      />
      {isOpen && inputValue && filteredTags.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-[#000000] border border-[#333333] rounded shadow-lg max-h-48 overflow-y-auto">
          {(Array.isArray(filteredTags) ? filteredTags : []).map((tag, index) => (
            <li
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                const cleanTag = tag.replace(/^#+/g, '').trim();
                if (!(tags || []).includes(cleanTag)) {
                  onAddTag(cleanTag);
                }
                setInputValue("");
                setIsOpen(false);
              }}
              className="p-2 cursor-pointer rounded-md border border-transparent hover:bg-white/10 hover:border-white/30 transition-all text-white"
            >
              #{tag.replace(/^#+/g, '')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

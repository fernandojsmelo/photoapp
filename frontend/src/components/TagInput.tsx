import { useMemo, useState } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}

export function TagInput({ tags, onChange, suggestions = [] }: Props) {
  const [draft, setDraft] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) return [];
    return suggestions
      .filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(query))
      .slice(0, 6);
  }, [draft, suggestions, tags]);

  function addTag(value: string) {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft("");
    setShowSuggestions(false);
  }

  return (
    <div className="tag-input" style={{ position: "relative" }}>
      <div className="tag-list">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remover tag ${tag}`}>
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={tags.length === 0 ? "Adicionar tag e pressionar Enter" : "Adicionar…"}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
              onChange(tags.slice(0, -1));
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 100);
            if (draft.trim()) addTag(draft);
          }}
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {filteredSuggestions.map((tag) => (
            <button key={tag} onMouseDown={(e) => e.preventDefault()} onClick={() => addTag(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

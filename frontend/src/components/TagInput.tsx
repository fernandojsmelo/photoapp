import { useState } from "react";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const value = draft.trim();
    if (value && !tags.includes(value)) {
      onChange([...tags, value]);
    }
    setDraft("");
  }

  return (
    <div className="tag-input">
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
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={commitDraft}
        />
      </div>
    </div>
  );
}

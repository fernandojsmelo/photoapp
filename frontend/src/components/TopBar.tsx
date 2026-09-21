import { useRef } from "react";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onImportFiles: (files: FileList) => void;
  title: string;
}

export function TopBar({ query, onQueryChange, onImportFiles, title }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <h1 className="view-title">{title}</h1>

      <div className="search-box">
        <span className="search-icon">⌕</span>
        <input
          type="search"
          placeholder="Buscar por nome ou tag…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onImportFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button className="primary-button" onClick={() => inputRef.current?.click()}>
        + Importar fotos
      </button>
    </header>
  );
}

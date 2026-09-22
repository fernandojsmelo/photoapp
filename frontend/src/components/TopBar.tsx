import { useRef } from "react";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  searchingAi: boolean;
  onImportFiles: (files: FileList) => void;
  title: string;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectionDisabled?: boolean;
}

export function TopBar({
  query,
  onQueryChange,
  onSearchSubmit,
  searchingAi,
  onImportFiles,
  title,
  selectionMode,
  onToggleSelectionMode,
  selectionDisabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <h1 className="view-title">{title}</h1>

      <div className="search-box">
        <span className="search-icon">{searchingAi ? "✨" : "⌕"}</span>
        <input
          type="search"
          placeholder="Buscar por nome/tag, ou pressione Enter para buscar com IA…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchSubmit(query);
          }}
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
      {!selectionDisabled && (
        <button className={`ghost-button ${selectionMode ? "active-toggle" : ""}`} onClick={onToggleSelectionMode}>
          {selectionMode ? "Concluir seleção" : "Selecionar"}
        </button>
      )}
      <button className="primary-button" onClick={() => inputRef.current?.click()}>
        + Importar fotos
      </button>
    </header>
  );
}

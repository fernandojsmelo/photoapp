import { useState } from "react";

interface Props {
  onCreate: (name: string) => void;
  onClose: () => void;
}

export function AlbumModal({ onCreate, onClose }: Props) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal small" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Novo álbum</h2>
        <input
          autoFocus
          type="text"
          placeholder="Nome do álbum"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={!name.trim()}>
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}

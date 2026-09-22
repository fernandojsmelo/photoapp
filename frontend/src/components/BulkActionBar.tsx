import { useState } from "react";
import type { AlbumRecord } from "../types/photo";

interface Props {
  count: number;
  albums: AlbumRecord[];
  onAddToAlbum: (albumId: string) => void;
  onCreateAlbumAndAdd: (name: string) => void;
  onAddTag: (tag: string) => void;
  onFavorite: () => void;
  onDelete: () => void;
  onSharePhotos: (username: string) => void;
  onCancel: () => void;
}

export function BulkActionBar({
  count,
  albums,
  onAddToAlbum,
  onCreateAlbumAndAdd,
  onAddTag,
  onFavorite,
  onDelete,
  onSharePhotos,
  onCancel,
}: Props) {
  const [openMenu, setOpenMenu] = useState<"album" | "tag" | "share" | null>(null);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [shareUsername, setShareUsername] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bulk-bar">
      <strong>{count} selecionada(s)</strong>

      <div className="dropdown">
        <button className="ghost-button" onClick={() => setOpenMenu(openMenu === "album" ? null : "album")}>
          + Álbum
        </button>
        {openMenu === "album" && (
          <div className="dropdown-menu" onMouseLeave={() => setOpenMenu(null)}>
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => {
                  onAddToAlbum(album.id);
                  setOpenMenu(null);
                }}
              >
                {album.name}
              </button>
            ))}
            {albums.length > 0 && <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />}
            <input
              placeholder="Novo álbum…"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newAlbumName.trim()) {
                  onCreateAlbumAndAdd(newAlbumName.trim());
                  setNewAlbumName("");
                  setOpenMenu(null);
                }
              }}
            />
          </div>
        )}
      </div>

      <div className="dropdown">
        <button className="ghost-button" onClick={() => setOpenMenu(openMenu === "tag" ? null : "tag")}>
          + Tag
        </button>
        {openMenu === "tag" && (
          <div className="dropdown-menu" onMouseLeave={() => setOpenMenu(null)}>
            <input
              placeholder="Nome da tag…"
              autoFocus
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagDraft.trim()) {
                  onAddTag(tagDraft.trim());
                  setTagDraft("");
                  setOpenMenu(null);
                }
              }}
            />
          </div>
        )}
      </div>

      <button className="ghost-button" onClick={onFavorite}>
        ★ Favoritar
      </button>

      <div className="dropdown">
        <button className="ghost-button" onClick={() => setOpenMenu(openMenu === "share" ? null : "share")}>
          ⇱ Compartilhar
        </button>
        {openMenu === "share" && (
          <div className="dropdown-menu" onMouseLeave={() => setOpenMenu(null)}>
            <input
              placeholder="Nome de usuário…"
              autoFocus
              value={shareUsername}
              onChange={(e) => setShareUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shareUsername.trim()) {
                  onSharePhotos(shareUsername.trim());
                  setShareUsername("");
                  setOpenMenu(null);
                }
              }}
            />
          </div>
        )}
      </div>

      {confirmDelete ? (
        <>
          <span className="muted small">Excluir {count} foto(s)?</span>
          <button className="ghost-button" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </button>
          <button className="danger-button" onClick={onDelete}>
            Confirmar
          </button>
        </>
      ) : (
        <button className="danger-link" onClick={() => setConfirmDelete(true)}>
          Excluir
        </button>
      )}

      <span className="spacer" />
      <button className="ghost-button" onClick={onCancel}>
        Cancelar seleção
      </button>
    </div>
  );
}

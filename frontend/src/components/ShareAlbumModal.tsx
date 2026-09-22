import { useEffect, useState } from "react";
import {
  ApiError,
  listAlbumSharesApi,
  shareAlbumApi,
  unshareAlbumApi,
  updateAlbumSharePhotosApi,
} from "../api/client";
import type { AlbumRecord, AlbumShare, PhotoRecord } from "../types/photo";

interface Props {
  album: AlbumRecord;
  albumPhotos: PhotoRecord[];
  onClose: () => void;
}

function PhotoChecklist({
  photos,
  selected,
  onToggle,
}: {
  photos: PhotoRecord[];
  selected: Set<string>;
  onToggle: (photoId: string) => void;
}) {
  if (photos.length === 0) {
    return <p className="muted small">Este álbum ainda não tem fotos.</p>;
  }
  return (
    <div className="album-checklist">
      {photos.map((photo) => (
        <label key={photo.id} className="checkbox-row">
          <input
            type="checkbox"
            checked={selected.has(photo.id)}
            onChange={() => onToggle(photo.id)}
          />
          {photo.fileName}
        </label>
      ))}
    </div>
  );
}

export function ShareAlbumModal({ album, albumPhotos, onClose }: Props) {
  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [newSelection, setNewSelection] = useState<Set<string>>(
    () => new Set(albumPhotos.map((p) => p.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editSelection, setEditSelection] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    listAlbumSharesApi(album.id)
      .then(({ shares }) => setShares(shares))
      .finally(() => setLoading(false));
  }, [album.id]);

  function toggleNewSelection(photoId: string) {
    setNewSelection((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSharing(true);
    try {
      const { shares } = await shareAlbumApi(album.id, username.trim(), [...newSelection]);
      setShares(shares);
      setUsername("");
      setNewSelection(new Set(albumPhotos.map((p) => p.id)));
    } catch (err) {
      if (err instanceof ApiError && err.message === "user_not_found") {
        setError("Não existe usuário com esse nome neste servidor.");
      } else if (err instanceof ApiError && err.message === "cannot_share_with_self") {
        setError("Você já é o dono deste álbum.");
      } else {
        setError("Não foi possível compartilhar. Tente novamente.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleUnshare(userId: string) {
    await unshareAlbumApi(album.id, userId);
    setShares((prev) => prev.filter((s) => s.userId !== userId));
    if (editingUserId === userId) setEditingUserId(null);
  }

  function startEditing(share: AlbumShare) {
    setEditingUserId(share.userId);
    setEditSelection(new Set(share.photoIds));
  }

  function toggleEditSelection(photoId: string) {
    setEditSelection((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function saveEdit(userId: string) {
    setSavingEdit(true);
    try {
      const { shares } = await updateAlbumSharePhotosApi(album.id, userId, [...editSelection]);
      setShares(shares);
      setEditingUserId(null);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <h2 className="truncate">Compartilhar "{album.name}"</h2>
          <button className="icon-button" onClick={onClose} title="Fechar">
            ×
          </button>
        </div>

        <p className="muted small">
          Escolha quais fotos deste álbum cada pessoa pode ver. Ela nunca poderá editar,
          remover fotos ou apagar o álbum.
        </p>

        {loading ? (
          <p className="muted small">Carregando…</p>
        ) : shares.length === 0 ? (
          <p className="muted small">Ainda não compartilhado com ninguém.</p>
        ) : (
          <ul className="users-list">
            {shares.map((s) => (
              <li key={s.userId} className="users-list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="truncate">
                    {s.username}{" "}
                    <span className="muted tiny">
                      ({s.photoIds.length}/{albumPhotos.length} fotos)
                    </span>
                  </span>
                  <div>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        editingUserId === s.userId ? setEditingUserId(null) : startEditing(s)
                      }
                    >
                      {editingUserId === s.userId ? "Fechar" : "Editar fotos"}
                    </button>
                    <button className="danger-link" onClick={() => handleUnshare(s.userId)}>
                      Remover
                    </button>
                  </div>
                </div>
                {editingUserId === s.userId && (
                  <div style={{ marginTop: 8 }}>
                    <PhotoChecklist
                      photos={albumPhotos}
                      selected={editSelection}
                      onToggle={toggleEditSelection}
                    />
                    <button
                      className="primary-button"
                      style={{ marginTop: 8 }}
                      onClick={() => saveEdit(s.userId)}
                      disabled={savingEdit}
                    >
                      {savingEdit ? "Salvando…" : "Salvar fotos visíveis"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <form className="users-create-form" onSubmit={handleShare} autoComplete="off">
          <h3 className="viewer-section-title">Compartilhar com</h3>
          <input
            type="text"
            name="share-username"
            placeholder="Nome de usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
            minLength={1}
          />
          <p className="muted tiny" style={{ marginTop: 8 }}>
            Fotos visíveis para essa pessoa:
          </p>
          <PhotoChecklist photos={albumPhotos} selected={newSelection} onToggle={toggleNewSelection} />
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="danger-button" onClick={onClose} disabled={sharing}>
              Fechar
            </button>
            <button className="primary-button" type="submit" disabled={sharing}>
              {sharing ? "Compartilhando…" : "Compartilhar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

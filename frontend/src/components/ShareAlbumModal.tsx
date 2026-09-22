import { useEffect, useState } from "react";
import { ApiError, listAlbumSharesApi, shareAlbumApi, unshareAlbumApi } from "../api/client";
import type { AlbumRecord, AlbumShare } from "../types/photo";

interface Props {
  album: AlbumRecord;
  onClose: () => void;
}

export function ShareAlbumModal({ album, onClose }: Props) {
  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    listAlbumSharesApi(album.id)
      .then(({ shares }) => setShares(shares))
      .finally(() => setLoading(false));
  }, [album.id]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSharing(true);
    try {
      const { shares } = await shareAlbumApi(album.id, username.trim());
      setShares(shares);
      setUsername("");
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
          Outras contas deste servidor poderão ver as fotos deste álbum, mas não editar,
          remover fotos ou apagá-lo.
        </p>

        {loading ? (
          <p className="muted small">Carregando…</p>
        ) : shares.length === 0 ? (
          <p className="muted small">Ainda não compartilhado com ninguém.</p>
        ) : (
          <ul className="users-list">
            {shares.map((s) => (
              <li key={s.userId} className="users-list-item">
                <span className="truncate">{s.username}</span>
                <button className="danger-link" onClick={() => handleUnshare(s.userId)}>
                  Remover
                </button>
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

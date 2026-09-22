import { useEffect, useState } from "react";
import { usePhotoBlob } from "../hooks/usePhotoBlob";
import { useDisplayUrl } from "../hooks/useDisplayUrl";
import { buildCssFilter, suggestTagsFromImage } from "../utils/imageProcessing";
import { TagInput } from "./TagInput";
import { ApiError, listPhotoSharesApi, sharePhotosApi, unsharePhotoApi } from "../api/client";
import type { AlbumRecord, PhotoRecord, PhotoShare } from "../types/photo";

interface Props {
  photo: PhotoRecord;
  albums: AlbumRecord[];
  allTags: string[];
  onClose: () => void;
  onToggleFavorite: () => void;
  onSetTags: (tags: string[]) => void;
  onToggleAlbum: (albumId: string) => void;
  onDelete: () => void;
  onOpenEditor: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PhotoViewer({
  photo,
  albums,
  allTags,
  onClose,
  onToggleFavorite,
  onSetTags,
  onToggleAlbum,
  onDelete,
  onOpenEditor,
}: Props) {
  const blob = usePhotoBlob(photo.id);
  const url = useDisplayUrl(blob, photo.edits.crop, photo.edits.rotation);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggested, setSuggested] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const readOnly = photo.readOnly;

  const [shares, setShares] = useState<PhotoShare[]>([]);
  const [shareUsername, setShareUsername] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (readOnly) return;
    listPhotoSharesApi(photo.id).then(({ shares }) => setShares(shares));
  }, [photo.id, readOnly]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setShareError(null);
    setSharing(true);
    try {
      await sharePhotosApi([photo.id], shareUsername.trim());
      const { shares: updated } = await listPhotoSharesApi(photo.id);
      setShares(updated);
      setShareUsername("");
    } catch (err) {
      if (err instanceof ApiError && err.message === "user_not_found") {
        setShareError("Não existe usuário com esse nome neste servidor.");
      } else if (err instanceof ApiError && err.message === "cannot_share_with_self") {
        setShareError("Você já é o dono desta foto.");
      } else {
        setShareError("Não foi possível compartilhar. Tente novamente.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleUnshare(userId: string) {
    await unsharePhotoApi(photo.id, userId);
    setShares((prev) => prev.filter((s) => s.userId !== userId));
  }

  async function handleSuggestTags() {
    if (!blob) return;
    setSuggesting(true);
    try {
      const tags = await suggestTagsFromImage(blob);
      setSuggested(tags.filter((tag) => !photo.tags.includes(tag)));
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal viewer" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-image">
          {url && (
            <img
              src={url}
              alt={photo.fileName}
              style={{
                filter: buildCssFilter(photo.edits),
                transform: photo.edits.crop ? undefined : `rotate(${photo.edits.rotation}deg)`,
              }}
            />
          )}
        </div>

        <div className="viewer-panel">
          <div className="viewer-header">
            <h2 className="truncate">{photo.fileName}</h2>
            <button className="icon-button" onClick={onClose} title="Fechar">
              ×
            </button>
          </div>

          {readOnly ? (
            <div className="viewer-actions">
              <span className="muted small">
                🔒 Compartilhado por {photo.sharedByUsername ?? "outro usuário"} — somente visualização
              </span>
            </div>
          ) : (
            <div className="viewer-actions">
              <button className="ghost-button" onClick={onToggleFavorite}>
                {photo.favorite ? "★ Favorita" : "☆ Favoritar"}
              </button>
              <button className="ghost-button" onClick={onOpenEditor}>
                ✎ Editar
              </button>
            </div>
          )}

          <section className="viewer-section">
            <h3>Tags</h3>
            {readOnly ? (
              <div className="tag-cloud">
                {photo.tags.length === 0 ? (
                  <span className="muted small">Sem tags</span>
                ) : (
                  photo.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            ) : (
              <>
                <TagInput tags={photo.tags} onChange={onSetTags} suggestions={allTags} />
                <div className="ai-suggest-row" style={{ marginTop: 8 }}>
                  <button className="ghost-button" onClick={handleSuggestTags} disabled={suggesting || !blob}>
                    {suggesting ? "Analisando…" : "✨ Sugerir tags com IA"}
                  </button>
                  {suggested?.map((tag) => (
                    <button
                      key={tag}
                      className="tag-pill"
                      onClick={() => {
                        onSetTags([...photo.tags, tag]);
                        setSuggested((prev) => prev?.filter((t) => t !== tag) ?? null);
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                  {suggested?.length === 0 && (
                    <span className="muted tiny">Nenhuma sugestão nova</span>
                  )}
                </div>
                <p className="muted tiny">
                  Sugestão por análise de cor local (sem enviar a foto para fora do navegador) —
                  placeholder até o reconhecimento de conteúdo por IA do backend (ver PRD).
                </p>
              </>
            )}
          </section>

          {!readOnly && (
            <section className="viewer-section">
              <h3>Álbuns</h3>
              {albums.length === 0 && <p className="muted small">Crie um álbum na barra lateral</p>}
              <div className="album-checklist">
                {albums.map((album) => (
                  <label key={album.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={photo.albumIds.includes(album.id)}
                      onChange={() => onToggleAlbum(album.id)}
                    />
                    {album.name}
                  </label>
                ))}
              </div>
            </section>
          )}

          {!readOnly && (
            <section className="viewer-section">
              <h3>Compartilhada com</h3>
              {shares.length === 0 ? (
                <p className="muted small">Ninguém, por enquanto.</p>
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
              <form onSubmit={handleShare} className="ai-suggest-row" style={{ marginTop: 8 }} autoComplete="off">
                <input
                  type="text"
                  placeholder="Compartilhar com usuário…"
                  value={shareUsername}
                  onChange={(e) => setShareUsername(e.target.value)}
                  autoComplete="off"
                  required
                  minLength={1}
                />
                <button className="ghost-button" type="submit" disabled={sharing}>
                  {sharing ? "…" : "Compartilhar"}
                </button>
              </form>
              {shareError && <p className="auth-error">{shareError}</p>}
            </section>
          )}

          <section className="viewer-section">
            <h3>Detalhes</h3>
            <dl className="meta-list">
              <div>
                <dt>Dimensões</dt>
                <dd>
                  {photo.width} × {photo.height}px
                </dd>
              </div>
              <div>
                <dt>Tamanho</dt>
                <dd>{formatBytes(photo.sizeBytes)}</dd>
              </div>
              <div>
                <dt>Importada em</dt>
                <dd>{new Date(photo.importedAt).toLocaleString("pt-BR")}</dd>
              </div>
              {photo.exif.takenAt && (
                <div>
                  <dt>Capturada em</dt>
                  <dd>{new Date(photo.exif.takenAt).toLocaleString("pt-BR")}</dd>
                </div>
              )}
              {photo.exif.cameraModel && (
                <div>
                  <dt>Câmera</dt>
                  <dd>{photo.exif.cameraModel}</dd>
                </div>
              )}
              {photo.exif.latitude != null && photo.exif.longitude != null && (
                <div>
                  <dt>Localização</dt>
                  <dd>
                    {photo.exif.latitude.toFixed(4)}, {photo.exif.longitude.toFixed(4)}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {!readOnly && (
            <div className="viewer-footer">
              {confirmDelete ? (
                <div className="confirm-row">
                  <span className="muted small">Excluir permanentemente?</span>
                  <button className="ghost-button" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </button>
                  <button className="danger-button" onClick={onDelete}>
                    Excluir
                  </button>
                </div>
              ) : (
                <button className="danger-link" onClick={() => setConfirmDelete(true)}>
                  Excluir foto
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

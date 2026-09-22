import { useState } from "react";
import { usePhotoBlob } from "../hooks/usePhotoBlob";
import { useDisplayUrl } from "../hooks/useDisplayUrl";
import { buildCssFilter, suggestTagsFromImage } from "../utils/imageProcessing";
import { TagInput } from "./TagInput";
import type { AlbumRecord, PhotoRecord } from "../types/photo";

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
  sharedByUsername?: string;
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
  sharedByUsername,
}: Props) {
  const blob = usePhotoBlob(photo.id);
  const url = useDisplayUrl(blob, photo.edits.crop, photo.edits.rotation);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggested, setSuggested] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const readOnly = photo.readOnly;

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
                🔒 Compartilhado por {sharedByUsername ?? "outro usuário"} — somente visualização
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

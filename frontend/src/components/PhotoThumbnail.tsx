import { photoThumbnailUrl } from "../api/client";
import { buildCssFilter } from "../utils/imageProcessing";
import type { PhotoRecord } from "../types/photo";

interface Props {
  photo: PhotoRecord;
  onClick: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function PhotoThumbnail({ photo, onClick, selectionMode, selected, onToggleSelect }: Props) {
  // A miniatura já vem do servidor com crop e rotação aplicados (ver
  // backend: buildThumbnailBuffer) — só os filtros de cor continuam no CSS.
  const cacheBust = `${photo.edits.rotation}:${JSON.stringify(photo.edits.crop)}`;

  return (
    <button
      className={`thumb ${selected ? "selected" : ""}`}
      onClick={() => (selectionMode ? onToggleSelect?.() : onClick())}
      title={photo.fileName}
    >
      <img
        src={photoThumbnailUrl(photo.id, cacheBust)}
        alt={photo.fileName}
        loading="lazy"
        style={{ filter: buildCssFilter(photo.edits) }}
      />
      {photo.favorite && <span className="thumb-favorite">★</span>}
      {selectionMode && (
        <span className={`thumb-check ${selected ? "checked" : ""}`}>{selected ? "✓" : ""}</span>
      )}
    </button>
  );
}

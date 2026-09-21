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
  return (
    <button
      className={`thumb ${selected ? "selected" : ""}`}
      onClick={() => (selectionMode ? onToggleSelect?.() : onClick())}
      title={photo.fileName}
    >
      <img
        src={photoThumbnailUrl(photo.id)}
        alt={photo.fileName}
        loading="lazy"
        style={{
          filter: buildCssFilter(photo.edits),
          transform: `rotate(${photo.edits.rotation}deg)`,
        }}
      />
      {photo.favorite && <span className="thumb-favorite">★</span>}
      {selectionMode && (
        <span className={`thumb-check ${selected ? "checked" : ""}`}>{selected ? "✓" : ""}</span>
      )}
    </button>
  );
}

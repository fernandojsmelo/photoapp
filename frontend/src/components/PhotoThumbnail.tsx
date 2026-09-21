import { useDisplayUrl } from "../hooks/useDisplayUrl";
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
  const url = useDisplayUrl(photo.original, photo.edits.crop, photo.edits.rotation);

  return (
    <button
      className={`thumb ${selected ? "selected" : ""}`}
      onClick={() => (selectionMode ? onToggleSelect?.() : onClick())}
      title={photo.fileName}
    >
      {url && (
        <img
          src={url}
          alt={photo.fileName}
          loading="lazy"
          style={{
            filter: buildCssFilter(photo.edits),
            transform: photo.edits.crop ? undefined : `rotate(${photo.edits.rotation}deg)`,
          }}
        />
      )}
      {photo.favorite && <span className="thumb-favorite">★</span>}
      {selectionMode && (
        <span className={`thumb-check ${selected ? "checked" : ""}`}>{selected ? "✓" : ""}</span>
      )}
    </button>
  );
}

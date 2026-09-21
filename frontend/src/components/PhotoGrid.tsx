import type { PhotoRecord } from "../types/photo";
import { PhotoThumbnail } from "./PhotoThumbnail";

interface Props {
  photos: PhotoRecord[];
  onSelect: (photoId: string) => void;
  emptyMessage: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (photoId: string) => void;
}

export function PhotoGrid({
  photos,
  onSelect,
  emptyMessage,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: Props) {
  if (photos.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <PhotoThumbnail
          key={photo.id}
          photo={photo}
          onClick={() => onSelect(photo.id)}
          selectionMode={selectionMode}
          selected={selectedIds?.has(photo.id)}
          onToggleSelect={() => onToggleSelect?.(photo.id)}
        />
      ))}
    </div>
  );
}

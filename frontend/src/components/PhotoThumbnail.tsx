import { useObjectUrl } from "../hooks/useObjectUrl";
import { buildCssFilter } from "../utils/imageProcessing";
import type { PhotoRecord } from "../types/photo";

interface Props {
  photo: PhotoRecord;
  onClick: () => void;
}

export function PhotoThumbnail({ photo, onClick }: Props) {
  const url = useObjectUrl(photo.original);

  return (
    <button className="thumb" onClick={onClick} title={photo.fileName}>
      {url && (
        <img
          src={url}
          alt={photo.fileName}
          loading="lazy"
          style={{
            filter: buildCssFilter(photo.edits),
            transform: `rotate(${photo.edits.rotation}deg)`,
          }}
        />
      )}
      {photo.favorite && <span className="thumb-favorite">★</span>}
    </button>
  );
}

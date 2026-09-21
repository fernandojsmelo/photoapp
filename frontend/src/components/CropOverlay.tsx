import { useRef, useState } from "react";
import type { CropRect } from "../types/photo";

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
}

type DragMode = "move" | "resize" | null;

const MIN_SIZE = 0.08;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CropOverlay({ imageUrl, width, height, crop, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  function beginDrag(mode: DragMode, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ mode, startX: e.clientX, startY: e.clientY, startCrop: crop });

    function handleMove(moveEvent: MouseEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = (moveEvent.clientX - e.clientX) / rect.width;
      const dy = (moveEvent.clientY - e.clientY) / rect.height;

      if (mode === "move") {
        const newX = clamp(crop.x + dx, 0, 1 - crop.width);
        const newY = clamp(crop.y + dy, 0, 1 - crop.height);
        onChange({ ...crop, x: newX, y: newY });
      } else {
        const newWidth = clamp(crop.width + dx, MIN_SIZE, 1 - crop.x);
        const newHeight = clamp(crop.height + dy, MIN_SIZE, 1 - crop.y);
        onChange({ ...crop, width: newWidth, height: newHeight });
      }
    }

    function handleUp() {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      setDrag(null);
    }

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }

  return (
    <div
      ref={containerRef}
      className="crop-stage"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <img src={imageUrl} alt="Área de recorte" draggable={false} />
      <div className="crop-mask" />
      <div
        className={`crop-box ${drag ? "dragging" : ""}`}
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.width * 100}%`,
          height: `${crop.height * 100}%`,
        }}
        onMouseDown={(e) => beginDrag("move", e)}
      >
        <div className="crop-handle" onMouseDown={(e) => beginDrag("resize", e)} />
      </div>
    </div>
  );
}

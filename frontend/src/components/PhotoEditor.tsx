import { useMemo, useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import {
  PRESET_LABELS,
  buildCssFilter,
  renderEditedImage,
  suggestAutoEnhanceEdits,
} from "../utils/imageProcessing";
import { DEFAULT_EDITS, type PhotoEdits, type PhotoRecord, type PresetId } from "../types/photo";

interface Props {
  photo: PhotoRecord;
  onSave: (edits: PhotoEdits) => void;
  onClose: () => void;
}

const PRESET_ORDER: PresetId[] = ["none", "vivid", "mono", "warm", "cool", "fade"];

export function PhotoEditor({ photo, onSave, onClose }: Props) {
  const [edits, setEdits] = useState<PhotoEdits>(photo.edits);
  const [enhancing, setEnhancing] = useState(false);
  const url = useObjectUrl(photo.original);
  const previewFilter = useMemo(() => buildCssFilter(edits), [edits]);

  function update<K extends keyof PhotoEdits>(key: K, value: PhotoEdits[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAutoEnhance() {
    setEnhancing(true);
    try {
      const suggestion = await suggestAutoEnhanceEdits(photo.original);
      setEdits((prev) => ({ ...prev, ...suggestion }));
    } finally {
      setEnhancing(false);
    }
  }

  async function handleExport() {
    const blob = await renderEditedImage(photo.original, edits, photo.mimeType || "image/jpeg");
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `editada-${photo.fileName}`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-preview">
          {url && (
            <img
              src={url}
              alt={photo.fileName}
              style={{ filter: previewFilter, transform: `rotate(${edits.rotation}deg)` }}
            />
          )}
        </div>

        <div className="editor-panel">
          <h2>Editar foto</h2>
          <p className="muted small truncate">{photo.fileName}</p>

          <button className="ai-button" onClick={handleAutoEnhance} disabled={enhancing}>
            {enhancing ? "Analisando…" : "✨ Aprimorar com IA"}
          </button>

          <div className="preset-row">
            {PRESET_ORDER.map((preset) => (
              <button
                key={preset}
                className={`preset-chip ${edits.preset === preset ? "active" : ""}`}
                onClick={() => update("preset", preset)}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>

          <label className="slider-field">
            <span>Brilho</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={edits.brightness}
              onChange={(e) => update("brightness", Number(e.target.value))}
            />
          </label>
          <label className="slider-field">
            <span>Contraste</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={edits.contrast}
              onChange={(e) => update("contrast", Number(e.target.value))}
            />
          </label>
          <label className="slider-field">
            <span>Saturação</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={edits.saturation}
              onChange={(e) => update("saturation", Number(e.target.value))}
            />
          </label>
          <label className="slider-field">
            <span>Exposição</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={edits.exposure}
              onChange={(e) => update("exposure", Number(e.target.value))}
            />
          </label>

          <div className="editor-row">
            <button className="ghost-button" onClick={() => update("rotation", (edits.rotation + 90) % 360)}>
              ⟳ Girar 90°
            </button>
            <button className="ghost-button" onClick={() => setEdits({ ...DEFAULT_EDITS })}>
              Restaurar original
            </button>
          </div>

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="ghost-button" onClick={handleExport}>
              Exportar
            </button>
            <button
              className="primary-button"
              onClick={() => {
                onSave(edits);
                onClose();
              }}
            >
              Salvar edição
            </button>
          </div>
          <p className="muted tiny">
            Não-destrutiva: o arquivo original é sempre preservado; você pode restaurar a
            qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}

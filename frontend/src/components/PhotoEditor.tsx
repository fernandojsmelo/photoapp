import { useEffect, useMemo, useState } from "react";
import { usePhotoBlob } from "../hooks/usePhotoBlob";
import { useDisplayUrl } from "../hooks/useDisplayUrl";
import { CropOverlay } from "./CropOverlay";
import {
  PRESET_LABELS,
  buildCssFilter,
  renderEditedImage,
  rotateOnlyBlob,
  suggestAutoEnhanceEdits,
} from "../utils/imageProcessing";
import { DEFAULT_EDITS, type CropRect, type PhotoEdits, type PhotoRecord, type PresetId } from "../types/photo";

interface Props {
  photo: PhotoRecord;
  onSave: (edits: PhotoEdits) => void;
  onClose: () => void;
}

const PRESET_ORDER: PresetId[] = ["none", "vivid", "mono", "warm", "cool", "fade"];
const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

export function PhotoEditor({ photo, onSave, onClose }: Props) {
  const [edits, setEdits] = useState<PhotoEdits>(photo.edits);
  const [enhancing, setEnhancing] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [workingCrop, setWorkingCrop] = useState<CropRect>(photo.edits.crop ?? FULL_CROP);
  const [rotatedUrl, setRotatedUrl] = useState<string | undefined>(undefined);

  const blob = usePhotoBlob(photo.id);
  const url = useDisplayUrl(blob, edits.crop, edits.rotation);
  const previewFilter = useMemo(() => buildCssFilter(edits), [edits]);
  const rotatedDims =
    edits.rotation % 180 !== 0
      ? { width: photo.height, height: photo.width }
      : { width: photo.width, height: photo.height };

  useEffect(() => {
    if (!cropMode || !blob) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    rotateOnlyBlob(blob, edits.rotation).then((rotated) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(rotated);
      setRotatedUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cropMode, blob, edits.rotation]);

  function update<K extends keyof PhotoEdits>(key: K, value: PhotoEdits[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAutoEnhance() {
    if (!blob) return;
    setEnhancing(true);
    try {
      const suggestion = await suggestAutoEnhanceEdits(blob);
      setEdits((prev) => ({ ...prev, ...suggestion }));
    } finally {
      setEnhancing(false);
    }
  }

  async function handleExport() {
    if (!blob) return;
    const exported = await renderEditedImage(blob, edits, photo.mimeType || "image/jpeg");
    const downloadUrl = URL.createObjectURL(exported);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `editada-${photo.fileName}`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  }

  function openCropMode() {
    setWorkingCrop(edits.crop ?? FULL_CROP);
    setCropMode(true);
  }

  function applyCrop() {
    const isFull =
      workingCrop.x < 0.01 && workingCrop.y < 0.01 && workingCrop.width > 0.98 && workingCrop.height > 0.98;
    update("crop", isFull ? null : workingCrop);
    setCropMode(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-preview">
          {!blob ? (
            <p className="muted">Carregando foto…</p>
          ) : cropMode ? (
            rotatedUrl && (
              <CropOverlay
                imageUrl={rotatedUrl}
                width={rotatedDims.width}
                height={rotatedDims.height}
                crop={workingCrop}
                onChange={setWorkingCrop}
              />
            )
          ) : (
            url && (
              <img
                src={url}
                alt={photo.fileName}
                style={{
                  filter: previewFilter,
                  transform: edits.crop ? undefined : `rotate(${edits.rotation}deg)`,
                }}
              />
            )
          )}
        </div>

        <div className="editor-panel">
          <h2>Editar foto</h2>
          <p className="muted small truncate">{photo.fileName}</p>

          {cropMode ? (
            <>
              <p className="muted small">
                Arraste para mover, use a alça no canto para redimensionar a área de recorte.
              </p>
              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setCropMode(false)}>
                  Cancelar
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    setWorkingCrop(FULL_CROP);
                  }}
                >
                  Redefinir
                </button>
                <button className="primary-button" onClick={applyCrop}>
                  Aplicar recorte
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="ai-button" onClick={handleAutoEnhance} disabled={enhancing || !blob}>
                {enhancing ? "Analisando…" : "✨ Aprimorar com IA"}
              </button>
              <p className="muted tiny" style={{ marginTop: -8 }}>
                Análise local de histograma (sem enviar a foto) — placeholder até o serviço de
                IA do backend (ver PRD).
              </p>

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
                <button className="ghost-button" onClick={openCropMode} disabled={!blob}>
                  ⬚ Recortar {edits.crop ? "(ativo)" : ""}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => update("rotation", (edits.rotation + 90) % 360)}
                >
                  ⟳ Girar 90°
                </button>
              </div>
              <div className="editor-row">
                <button className="ghost-button" onClick={() => setEdits({ ...DEFAULT_EDITS })}>
                  Restaurar original
                </button>
              </div>

              <div className="modal-actions">
                <button className="ghost-button" onClick={onClose}>
                  Cancelar
                </button>
                <button className="ghost-button" onClick={handleExport} disabled={!blob}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import type { PhotoEdits, PresetId } from "../types/photo";

const PRESET_FILTERS: Record<PresetId, string> = {
  none: "",
  vivid: "saturate(1.5) contrast(1.15)",
  mono: "grayscale(1) contrast(1.05)",
  warm: "sepia(0.25) saturate(1.2) hue-rotate(-8deg)",
  cool: "saturate(1.05) hue-rotate(12deg) brightness(1.02)",
  fade: "contrast(0.85) brightness(1.08) saturate(0.75)",
};

export const PRESET_LABELS: Record<PresetId, string> = {
  none: "Original",
  vivid: "Vívido",
  mono: "Preto e branco",
  warm: "Quente",
  cool: "Frio",
  fade: "Desbotado",
};

export function buildCssFilter(edits: PhotoEdits): string {
  const brightness = 1 + edits.brightness / 100 + edits.exposure / 150;
  const contrast = 1 + edits.contrast / 100;
  const saturate = Math.max(0, 1 + edits.saturation / 100);
  const base = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
  const preset = PRESET_FILTERS[edits.preset];
  return preset ? `${base} ${preset}` : base;
}

async function loadImage(source: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderEditedImage(
  source: Blob,
  edits: PhotoEdits,
  mimeType = "image/jpeg",
): Promise<Blob> {
  const img = await loadImage(source);
  const swapped = edits.rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? img.naturalHeight : img.naturalWidth;
  canvas.height = swapped ? img.naturalWidth : img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador");

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((edits.rotation * Math.PI) / 180);
  ctx.filter = buildCssFilter(edits);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      mimeType,
      0.92,
    );
  });
}

/**
 * Sugere brightness/contrast a partir de uma análise simples do histograma
 * (amostragem em baixa resolução). Funciona como aprimoramento automático
 * local enquanto o serviço de IA real do backend (ver PRD, seção
 * "IA — Aprimoramento") não está disponível — os valores retornados entram
 * no mesmo modelo de edição não-destrutiva usado pelos sliders manuais.
 */
export async function suggestAutoEnhanceEdits(
  source: Blob,
): Promise<{ brightness: number; contrast: number }> {
  const img = await loadImage(source);
  const sampleSize = 120;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador");

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  let min = 255;
  let max = 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
    sum += luminance;
    count++;
  }

  const avg = sum / count;
  const range = Math.max(1, max - min);

  const brightness = Math.max(-40, Math.min(40, ((128 - avg) / 255) * 100));
  const contrast = Math.max(0, Math.min(40, ((255 - range) / 255) * 60));

  return { brightness: Math.round(brightness), contrast: Math.round(contrast) };
}

export async function generateThumbnailUrl(source: Blob): Promise<string> {
  return URL.createObjectURL(source);
}

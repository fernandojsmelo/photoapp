import type { CropRect, PhotoEdits, PresetId } from "../types/photo";

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

function blobFromCanvas(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      mimeType,
      0.92,
    );
  });
}

/** Desenha a imagem já rotacionada num canvas (sem crop, sem filtro). */
function rotateToCanvas(img: HTMLImageElement, rotation: number): HTMLCanvasElement {
  const swapped = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? img.naturalHeight : img.naturalWidth;
  canvas.height = swapped ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
}

/**
 * Gera a imagem já rotacionada (sem crop nem filtro). Usada como base para
 * a interface de recorte no editor — o crop é definido em relação a este
 * espaço já rotacionado, que é o que o usuário efetivamente vê na tela.
 */
export async function rotateOnlyBlob(source: Blob, rotation: number): Promise<Blob> {
  if (rotation === 0) return source;
  const img = await loadImage(source);
  const canvas = rotateToCanvas(img, rotation);
  return blobFromCanvas(canvas, "image/jpeg");
}

export async function renderEditedImage(
  source: Blob,
  edits: PhotoEdits,
  mimeType = "image/jpeg",
): Promise<Blob> {
  const img = await loadImage(source);
  const rotated = rotateToCanvas(img, edits.rotation);

  const crop = edits.crop;
  const sx = crop ? crop.x * rotated.width : 0;
  const sy = crop ? crop.y * rotated.height : 0;
  const sw = crop ? crop.width * rotated.width : rotated.width;
  const sh = crop ? crop.height * rotated.height : rotated.height;

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador");
  ctx.filter = buildCssFilter(edits);
  ctx.drawImage(rotated, sx, sy, sw, sh, 0, 0, sw, sh);

  return blobFromCanvas(canvas, mimeType);
}

/**
 * Gera apenas o recorte (após rotação, sem filtros de cor), usado para
 * pré-visualizar o crop já aplicado nas miniaturas e no visualizador.
 */
export async function cropOnlyBlob(source: Blob, crop: CropRect, rotation = 0): Promise<Blob> {
  const img = await loadImage(source);
  const rotated = rotateToCanvas(img, rotation);
  const sx = crop.x * rotated.width;
  const sy = crop.y * rotated.height;
  const sw = crop.width * rotated.width;
  const sh = crop.height * rotated.height;

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador");
  ctx.drawImage(rotated, sx, sy, sw, sh, 0, 0, sw, sh);
  return blobFromCanvas(canvas, "image/jpeg");
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

const HUE_TAGS: Array<{ max: number; tag: string }> = [
  { max: 15, tag: "vermelho" },
  { max: 45, tag: "laranja" },
  { max: 70, tag: "amarelo" },
  { max: 160, tag: "verde" },
  { max: 200, tag: "ciano" },
  { max: 260, tag: "azul" },
  { max: 320, tag: "roxo" },
  { max: 345, tag: "rosa" },
  { max: 361, tag: "vermelho" },
];

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/**
 * Sugere tags a partir de cor dominante e luminosidade média da imagem
 * (amostragem em baixa resolução). Substituto local para o serviço de
 * reconhecimento de conteúdo por IA descrito no PRD, enquanto o backend
 * de busca semântica não existe — deixa claro na UI que é uma heurística,
 * não reconhecimento real de objetos/cenas.
 */
export async function suggestTagsFromImage(source: Blob): Promise<string[]> {
  const img = await loadImage(source);
  const sampleSize = 60;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador");

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  let sumH = 0;
  let sumS = 0;
  let sumL = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    sumH += h;
    sumS += s;
    sumL += l;
    count++;
  }

  const avgS = sumS / count;
  const avgL = sumL / count;
  const avgH = sumH / count;

  const tags: string[] = [];

  if (avgS < 0.12) {
    tags.push("preto e branco");
  } else {
    const hueTag = HUE_TAGS.find((entry) => avgH <= entry.max)?.tag;
    if (hueTag) tags.push(hueTag);
  }

  if (avgL < 0.25) tags.push("escura");
  else if (avgL > 0.75) tags.push("clara");

  return tags;
}

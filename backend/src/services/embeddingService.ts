import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  type PreTrainedTokenizer,
  type Processor,
} from "@huggingface/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

let tokenizer: Promise<PreTrainedTokenizer> | null = null;
let textModel: Promise<CLIPTextModelWithProjection> | null = null;
let processor: Promise<Processor> | null = null;
let visionModel: Promise<CLIPVisionModelWithProjection> | null = null;

function getTokenizer() {
  if (!tokenizer) tokenizer = AutoTokenizer.from_pretrained(MODEL_ID);
  return tokenizer;
}

function getTextModel() {
  if (!textModel) textModel = CLIPTextModelWithProjection.from_pretrained(MODEL_ID);
  return textModel;
}

function getProcessor() {
  if (!processor) processor = AutoProcessor.from_pretrained(MODEL_ID);
  return processor;
}

function getVisionModel() {
  if (!visionModel) visionModel = CLIPVisionModelWithProjection.from_pretrained(MODEL_ID);
  return visionModel;
}

/** Pré-carrega o modelo CLIP (texto + visão) para não pagar o custo de download/init na primeira request. */
export async function warmUpEmbeddingModel(): Promise<void> {
  await Promise.all([getTokenizer(), getTextModel(), getProcessor(), getVisionModel()]);
}

export async function embedText(text: string): Promise<Float32Array> {
  const [tok, model] = await Promise.all([getTokenizer(), getTextModel()]);
  const inputs = tok([text], { padding: true, truncation: true });
  const { text_embeds } = await model(inputs);
  return Float32Array.from(text_embeds.data as Float32Array);
}

export async function embedImageFile(filePath: string): Promise<Float32Array> {
  const [proc, model] = await Promise.all([getProcessor(), getVisionModel()]);
  const image = await RawImage.read(filePath);
  const inputs = await proc(image);
  const { image_embeds } = await model(inputs);
  return Float32Array.from(image_embeds.data as Float32Array);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function embeddingToBuffer(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
}

export function bufferToEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

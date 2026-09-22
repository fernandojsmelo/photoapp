import sharp from "sharp";
import { pipeline, RawImage, type ImageToImagePipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/swin2SR-lightweight-x2-64";

let upscaler: Promise<ImageToImagePipeline> | null = null;

function getUpscaler() {
  if (!upscaler) {
    upscaler = pipeline("image-to-image", MODEL_ID, { dtype: "fp32" });
  }
  return upscaler;
}

/** Pré-carrega o modelo de aprimoramento (super-resolution) local. */
export async function warmUpUpscaleModel(): Promise<void> {
  await getUpscaler();
}

/**
 * Aprimora uma foto com um modelo de super-resolução real (Swin2SR, 2x)
 * rodando localmente — sem enviar a imagem para nenhum serviço externo.
 * Retorna PNG (sem perdas) já que a saída é gerada pixel a pixel pelo modelo.
 */
export async function upscaleImageFile(filePath: string): Promise<Buffer> {
  const model = await getUpscaler();
  const image = await RawImage.read(filePath);
  const output = await model(image);
  return sharp(Buffer.from(output.data), {
    raw: { width: output.width, height: output.height, channels: output.channels as 1 | 2 | 3 | 4 },
  })
    .png()
    .toBuffer();
}

// Baixa e cacheia os modelos de IA locais (busca semântica e aprimoramento)
// durante o build da imagem Docker, para que o container não dependa de
// acesso à internet na primeira request em runtime.
import { warmUpEmbeddingModel } from "../dist/services/embeddingService.js";
import { warmUpUpscaleModel } from "../dist/services/upscaleService.js";

console.log("Baixando modelo de busca semântica (CLIP)...");
await warmUpEmbeddingModel();
console.log("Baixando modelo de aprimoramento (Swin2SR)...");
await warmUpUpscaleModel();
console.log("Modelos prontos e em cache.");

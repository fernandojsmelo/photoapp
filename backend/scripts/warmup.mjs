// Baixa e cacheia o modelo de busca semântica (CLIP) durante o build da
// imagem Docker, para que o container não dependa de acesso à internet
// na primeira request em runtime.
import { warmUpEmbeddingModel } from "../dist/services/embeddingService.js";

console.log("Baixando modelo de busca semântica (CLIP)...");
await warmUpEmbeddingModel();
console.log("Modelo pronto e em cache.");

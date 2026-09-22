import { app } from "./app.js";
import { config } from "./config.js";
import { warmUpEmbeddingModel } from "./services/embeddingService.js";
import { warmUpUpscaleModel } from "./services/upscaleService.js";

app.listen(config.port, () => {
  console.log(`PhotoApp backend rodando em http://localhost:${config.port}`);
});

warmUpEmbeddingModel()
  .then(() => console.log("Modelo de busca semântica (CLIP) carregado."))
  .catch((err) => console.error("Falha ao carregar o modelo de busca semântica:", err));

warmUpUpscaleModel()
  .then(() => console.log("Modelo de aprimoramento (Swin2SR) carregado."))
  .catch((err) => console.error("Falha ao carregar o modelo de aprimoramento:", err));

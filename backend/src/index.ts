import { app } from "./app.js";
import { config } from "./config.js";
import { warmUpEmbeddingModel } from "./services/embeddingService.js";

app.listen(config.port, () => {
  console.log(`PhotoApp backend rodando em http://localhost:${config.port}`);
});

warmUpEmbeddingModel()
  .then(() => console.log("Modelo de busca semântica (CLIP) carregado."))
  .catch((err) => console.error("Falha ao carregar o modelo de busca semântica:", err));

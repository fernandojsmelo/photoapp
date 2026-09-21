import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.routes.js";
import { photosRouter } from "./routes/photos.routes.js";
import { albumsRouter } from "./routes/albums.routes.js";

export const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/photos", photosRouter);
app.use("/api/albums", albumsRouter);

/**
 * Em produção (imagem Docker), o build do frontend é copiado para ./public
 * ao lado do backend e servido pelo mesmo processo — um único container,
 * uma única porta, sem CORS a configurar. Em desenvolvimento essa pasta não
 * existe e cada serviço roda separado (ver docs/README).
 */
const publicDir = path.resolve(config.staticDir);
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof Error && err.message.includes("File too large")) {
    res.status(413).json({ error: "file_too_large" });
    return;
  }
  res.status(500).json({ error: "internal_error" });
});

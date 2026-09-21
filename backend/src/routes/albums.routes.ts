import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../utils/params.js";
import { createAlbum, deleteAlbum, listAlbums } from "../services/albumService.js";

export const albumsRouter = Router();
albumsRouter.use(requireAuth);

albumsRouter.get("/", (req: AuthedRequest, res) => {
  res.json({ albums: listAlbums(req.userId!) });
});

const createSchema = z.object({ name: z.string().min(1).max(120) });

albumsRouter.post("/", (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  const album = createAlbum(req.userId!, parsed.data.name);
  res.status(201).json({ album });
});

albumsRouter.delete("/:id", (req: AuthedRequest, res) => {
  deleteAlbum(req.userId!, param(req, "id"));
  res.status(204).end();
});

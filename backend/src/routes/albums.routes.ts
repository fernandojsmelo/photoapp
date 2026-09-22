import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../utils/params.js";
import {
  createAlbum,
  deleteAlbum,
  listAlbumShares,
  listAlbums,
  shareAlbum,
  unshareAlbum,
} from "../services/albumService.js";

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

albumsRouter.get("/:id/shares", (req: AuthedRequest, res) => {
  const shares = listAlbumShares(req.userId!, param(req, "id"));
  if (shares === null) {
    res.status(404).end();
    return;
  }
  res.json({ shares });
});

const shareSchema = z.object({ username: z.string().min(1) });

albumsRouter.post("/:id/shares", (req: AuthedRequest, res) => {
  const parsed = shareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  const result = shareAlbum(req.userId!, param(req, "id"), parsed.data.username.trim());
  if (!result.ok) {
    const status = result.error === "album_not_found" ? 404 : 400;
    res.status(status).json({ error: result.error });
    return;
  }
  res.status(201).json({ shares: listAlbumShares(req.userId!, param(req, "id")) });
});

albumsRouter.delete("/:id/shares/:userId", (req: AuthedRequest, res) => {
  const ok = unshareAlbum(req.userId!, param(req, "id"), param(req, "userId"));
  if (!ok) {
    res.status(404).end();
    return;
  }
  res.status(204).end();
});

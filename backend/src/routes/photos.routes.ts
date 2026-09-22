import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../utils/params.js";
import { getOriginalPath, getThumbnailPath } from "../storage/fileStorage.js";
import {
  bulkAddTag,
  bulkAddToAlbum,
  bulkDelete,
  bulkSetFavorite,
  createPhoto,
  deletePhoto,
  getOriginalExt,
  getPhotoRow,
  listPhotos,
  listTagCounts,
  searchPhotosBySimilarity,
  togglePhotoAlbum,
  updatePhoto,
} from "../services/photoService.js";
import { albumBelongsToUser } from "../services/albumService.js";
import { embedText } from "../services/embeddingService.js";
import { upscaleImageFile } from "../services/upscaleService.js";

export const photosRouter = Router();
photosRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

photosRouter.get("/", (req: AuthedRequest, res) => {
  const { albumId, tag, favorite, q } = req.query;
  const photos = listPhotos(req.userId!, {
    albumId: typeof albumId === "string" ? albumId : undefined,
    tag: typeof tag === "string" ? tag : undefined,
    favorite: favorite === "true",
    q: typeof q === "string" ? q : undefined,
  });
  res.json({ photos });
});

photosRouter.get("/tags", (req: AuthedRequest, res) => {
  res.json({ tags: listTagCounts(req.userId!) });
});

photosRouter.get("/search", async (req: AuthedRequest, res) => {
  const q = req.query.q;
  if (typeof q !== "string" || !q.trim()) {
    res.status(400).json({ error: "missing_query" });
    return;
  }
  try {
    const queryEmbedding = await embedText(q.trim());
    const photos = searchPhotosBySimilarity(req.userId!, queryEmbedding);
    res.json({ photos });
  } catch (err) {
    console.error("Falha na busca semântica", err);
    res.status(503).json({ error: "search_unavailable" });
  }
});

photosRouter.post("/", upload.array("files", 30), async (req: AuthedRequest, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  let imported = 0;
  let duplicates = 0;
  const photos = [];

  for (const file of files) {
    const result = await createPhoto(req.userId!, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
    if (result.duplicate) {
      duplicates++;
    } else {
      imported++;
      photos.push(result.photo);
    }
  }

  res.status(201).json({ imported, duplicates, photos });
});

photosRouter.get("/:id/file", (req: AuthedRequest, res) => {
  const row = getPhotoRow(req.userId!, param(req, "id"));
  if (!row) {
    res.status(404).end();
    return;
  }
  const filePath = getOriginalPath(row.id, row.original_ext);
  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }
  res.type(row.mime_type);
  res.sendFile(filePath);
});

photosRouter.post("/:id/enhance", async (req: AuthedRequest, res) => {
  const row = getPhotoRow(req.userId!, param(req, "id"));
  if (!row) {
    res.status(404).end();
    return;
  }
  const filePath = getOriginalPath(row.id, row.original_ext);
  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }
  try {
    const enhanced = await upscaleImageFile(filePath);
    res.type("image/png");
    res.setHeader("Content-Disposition", `attachment; filename="aprimorada-${row.file_name}.png"`);
    res.send(enhanced);
  } catch (err) {
    console.error("Falha ao aprimorar foto", row.id, err);
    res.status(503).json({ error: "enhance_unavailable" });
  }
});

photosRouter.get("/:id/thumbnail", (req: AuthedRequest, res) => {
  const photoId = param(req, "id");
  const ext = getOriginalExt(req.userId!, photoId);
  if (!ext) {
    res.status(404).end();
    return;
  }
  const filePath = getThumbnailPath(photoId);
  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }
  res.type("image/jpeg");
  res.sendFile(filePath);
});

const editsSchema = z.object({
  brightness: z.number(),
  contrast: z.number(),
  saturation: z.number(),
  exposure: z.number(),
  rotation: z.number(),
  preset: z.enum(["none", "vivid", "mono", "warm", "cool", "fade"]),
  crop: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .nullable(),
});

const patchSchema = z.object({
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  edits: editsSchema.optional(),
});

photosRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  const photo = await updatePhoto(req.userId!, param(req, "id"), parsed.data);
  if (!photo) {
    res.status(404).end();
    return;
  }
  res.json({ photo });
});

photosRouter.post("/:id/albums/:albumId", (req: AuthedRequest, res) => {
  const albumId = param(req, "albumId");
  if (!albumBelongsToUser(req.userId!, albumId)) {
    res.status(404).end();
    return;
  }
  const photo = togglePhotoAlbum(req.userId!, param(req, "id"), albumId);
  if (!photo) {
    res.status(404).end();
    return;
  }
  res.json({ photo });
});

photosRouter.delete("/:id", (req: AuthedRequest, res) => {
  const ok = deletePhoto(req.userId!, param(req, "id"));
  if (!ok) {
    res.status(404).end();
    return;
  }
  res.status(204).end();
});

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["addToAlbum", "addTag", "favorite", "delete"]),
  albumId: z.string().optional(),
  tag: z.string().optional(),
});

photosRouter.post("/bulk", (req: AuthedRequest, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }
  const { ids, action, albumId, tag } = parsed.data;
  const userId = req.userId!;

  if (action === "addToAlbum") {
    if (!albumId || !albumBelongsToUser(userId, albumId)) {
      res.status(400).json({ error: "invalid_album" });
      return;
    }
    bulkAddToAlbum(userId, ids, albumId);
  } else if (action === "addTag") {
    if (!tag) {
      res.status(400).json({ error: "invalid_tag" });
      return;
    }
    bulkAddTag(userId, ids, tag);
  } else if (action === "favorite") {
    bulkSetFavorite(userId, ids, true);
  } else if (action === "delete") {
    bulkDelete(userId, ids);
  }

  res.json({ photos: listPhotos(userId, {}) });
});

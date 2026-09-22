import { v4 as uuid } from "uuid";
import exifr from "exifr";
import sharp, { type Sharp } from "sharp";
import { db } from "../db/client.js";
import { deletePhotoFiles, getOriginalPath, saveOriginal, saveThumbnail } from "../storage/fileStorage.js";
import { sha256 } from "../utils/hash.js";
import { DEFAULT_EDITS, type PhotoDTO, type PhotoEdits, type PhotoShareDTO } from "../types/index.js";
import { bufferToEmbedding, cosineSimilarity, embedImageFile, embeddingToBuffer } from "./embeddingService.js";
import { resolveAlbumAccess } from "./albumService.js";

interface PhotoRow {
  id: string;
  user_id: string;
  file_name: string;
  mime_type: string;
  imported_at: string;
  hash: string;
  width: number;
  height: number;
  size_bytes: number;
  favorite: number;
  edits_json: string;
  exif_taken_at: string | null;
  exif_camera_model: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  original_ext: string;
  embedding: Buffer | null;
}

export interface PhotoListFilters {
  albumId?: string;
  tag?: string;
  favorite?: boolean;
  q?: string;
}

// Mesma tabela de ajustes por preset usada no frontend (utils/imageProcessing.ts,
// PRESET_FILTERS), reimplementada com as operações equivalentes do sharp para
// a miniatura do servidor ficar visualmente consistente com o preview do editor.
const PRESET_ADJUST: Record<
  PhotoEdits["preset"],
  { saturation: number; contrast: number; brightness: number; hue: number; grayscale: boolean }
> = {
  none: { saturation: 1, contrast: 1, brightness: 1, hue: 0, grayscale: false },
  vivid: { saturation: 1.5, contrast: 1.15, brightness: 1, hue: 0, grayscale: false },
  mono: { saturation: 1, contrast: 1.05, brightness: 1, hue: 0, grayscale: true },
  warm: { saturation: 1.2, contrast: 1, brightness: 1, hue: -8, grayscale: false },
  cool: { saturation: 1.05, contrast: 1, brightness: 1.02, hue: 12, grayscale: false },
  fade: { saturation: 0.75, contrast: 0.85, brightness: 1.08, hue: 0, grayscale: false },
};

/** Aplica brilho/contraste/saturação/exposição/preset no pipeline do sharp. */
function applyColorAdjustments(pipeline: Sharp, edits: PhotoEdits): Sharp {
  const preset = PRESET_ADJUST[edits.preset];
  const brightness = Math.max(0, (1 + edits.brightness / 100 + edits.exposure / 150) * preset.brightness);
  const contrast = (1 + edits.contrast / 100) * preset.contrast;
  const saturation = Math.max(0, (1 + edits.saturation / 100) * preset.saturation);

  let result = pipeline
    .modulate({ brightness })
    .linear(contrast, 128 * (1 - contrast))
    .modulate({ saturation, hue: preset.hue });

  if (preset.grayscale) {
    result = result.grayscale();
  }
  return result;
}

/**
 * Gera o buffer da thumbnail já com os ajustes do usuário aplicados
 * (auto-orientação EXIF, rotação, recorte e cor), para que a miniatura da
 * grade reflita a edição sem o frontend precisar baixar o arquivo original.
 */
async function buildThumbnailBuffer(originalPath: string, edits: PhotoEdits): Promise<Buffer> {
  let rotatedBuffer = await sharp(originalPath).rotate().toBuffer();
  if (edits.rotation !== 0) {
    rotatedBuffer = await sharp(rotatedBuffer).rotate(edits.rotation).toBuffer();
  }

  let pipeline = sharp(rotatedBuffer);
  if (edits.crop) {
    const { width, height } = await sharp(rotatedBuffer).metadata();
    if (width && height) {
      const left = Math.min(width - 1, Math.max(0, Math.round(edits.crop.x * width)));
      const top = Math.min(height - 1, Math.max(0, Math.round(edits.crop.y * height)));
      const cropWidth = Math.max(1, Math.min(width - left, Math.round(edits.crop.width * width)));
      const cropHeight = Math.max(1, Math.min(height - top, Math.round(edits.crop.height * height)));
      pipeline = pipeline.extract({ left, top, width: cropWidth, height: cropHeight });
    }
  }

  pipeline = pipeline.resize(480, 480, { fit: "cover" });
  pipeline = applyColorAdjustments(pipeline, edits);

  return pipeline.jpeg({ quality: 78 }).toBuffer();
}

function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/heic": "heic",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] ?? "bin";
}

function tagsForPhotos(photoIds: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (photoIds.length === 0) return map;
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT photo_id, tag FROM photo_tags WHERE photo_id IN (${placeholders})`)
    .all(...photoIds) as Array<{ photo_id: string; tag: string }>;
  for (const row of rows) {
    const list = map.get(row.photo_id) ?? [];
    list.push(row.tag);
    map.set(row.photo_id, list);
  }
  return map;
}

function albumIdsForPhotos(photoIds: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (photoIds.length === 0) return map;
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT photo_id, album_id FROM photo_albums WHERE photo_id IN (${placeholders})`)
    .all(...photoIds) as Array<{ photo_id: string; album_id: string }>;
  for (const row of rows) {
    const list = map.get(row.photo_id) ?? [];
    list.push(row.album_id);
    map.set(row.photo_id, list);
  }
  return map;
}

const usernameCache = new Map<string, string>();
function usernameFor(userId: string): string {
  if (!usernameCache.has(userId)) {
    const row = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as
      | { username: string }
      | undefined;
    usernameCache.set(userId, row?.username ?? "outro usuário");
  }
  return usernameCache.get(userId)!;
}

function toDTO(row: PhotoRow, tags: string[], albumIds: string[], requestingUserId: string): PhotoDTO {
  const readOnly = row.user_id !== requestingUserId;
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    importedAt: row.imported_at,
    hash: row.hash,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    favorite: Boolean(row.favorite),
    tags,
    albumIds,
    edits: JSON.parse(row.edits_json) as PhotoEdits,
    exif: {
      takenAt: row.exif_taken_at ?? undefined,
      cameraModel: row.exif_camera_model ?? undefined,
      latitude: row.exif_latitude ?? undefined,
      longitude: row.exif_longitude ?? undefined,
    },
    readOnly,
    sharedByUsername: readOnly ? usernameFor(row.user_id) : undefined,
  };
}

function rowsToDTOs(rows: PhotoRow[], requestingUserId: string): PhotoDTO[] {
  const ids = rows.map((r) => r.id);
  const tagsMap = tagsForPhotos(ids);
  const albumsMap = albumIdsForPhotos(ids);
  return rows.map((row) =>
    toDTO(row, tagsMap.get(row.id) ?? [], albumsMap.get(row.id) ?? [], requestingUserId),
  );
}

/**
 * Lista fotos visíveis para `userId`. Quando `filters.albumId` aponta para um
 * álbum compartilhado com ele (não é o dono), resolve o dono real do álbum e
 * mostra as fotos dele naquele álbum — a listagem geral (sem albumId) nunca
 * mistura fotos de outra conta.
 */
export function listPhotos(userId: string, filters: PhotoListFilters): PhotoDTO[] {
  let ownerScope = userId;
  if (filters.albumId) {
    const access = resolveAlbumAccess(userId, filters.albumId);
    if (!access) return [];
    ownerScope = access.ownerId;
  }

  const clauses = ["p.user_id = ?"];
  const params: unknown[] = [ownerScope];

  let joins = "";
  if (filters.albumId) {
    joins += " JOIN photo_albums pa ON pa.photo_id = p.id";
    clauses.push("pa.album_id = ?");
    params.push(filters.albumId);

    // Quando quem pede não é o dono, só entram as fotos que o dono marcou
    // como visíveis para ele nesse álbum — compartilhar não libera tudo.
    // O parâmetro dessa condição vai em `clauses` (WHERE), não dentro do
    // JOIN, porque o texto de `joins` é montado antes do WHERE na consulta
    // final — um `?` dentro do JOIN ficaria fora de ordem com os params.
    if (ownerScope !== userId) {
      joins += " JOIN album_share_photos asp ON asp.album_id = pa.album_id AND asp.photo_id = p.id";
      clauses.push("asp.shared_with_user_id = ?");
      params.push(userId);
    }
  }
  if (filters.tag) {
    joins += " JOIN photo_tags pt ON pt.photo_id = p.id";
    clauses.push("pt.tag = ?");
    params.push(filters.tag);
  }
  if (filters.favorite) {
    clauses.push("p.favorite = 1");
  }
  if (filters.q) {
    clauses.push(
      "(p.file_name LIKE ? OR EXISTS (SELECT 1 FROM photo_tags t WHERE t.photo_id = p.id AND t.tag LIKE ?))",
    );
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }

  const sql = `SELECT DISTINCT p.* FROM photos p${joins} WHERE ${clauses.join(" AND ")} ORDER BY p.imported_at DESC`;
  const rows = db.prepare(sql).all(...params) as PhotoRow[];
  return rowsToDTOs(rows, userId);
}

export function getPhotoDTO(userId: string, photoId: string): PhotoDTO | null {
  const row = db.prepare("SELECT * FROM photos WHERE id = ? AND user_id = ?").get(photoId, userId) as
    | PhotoRow
    | undefined;
  if (!row) return null;
  return toDTO(
    row,
    tagsForPhotos([row.id]).get(row.id) ?? [],
    albumIdsForPhotos([row.id]).get(row.id) ?? [],
    userId,
  );
}

/**
 * Busca uma foto para leitura (servir arquivo/thumbnail), permitindo acesso
 * se o requisitante é o dono, a foto foi liberada para ele dentro de um
 * álbum compartilhado, ou foi compartilhada avulsa (sem álbum). Ações de
 * escrita continuam usando getPhotoRow (só dono).
 */
export function getPhotoRowForViewing(requestingUserId: string, photoId: string): PhotoRow | null {
  const own = db.prepare("SELECT * FROM photos WHERE id = ? AND user_id = ?").get(
    photoId,
    requestingUserId,
  ) as PhotoRow | undefined;
  if (own) return own;

  const viaAlbumShare = db
    .prepare(
      `SELECT p.* FROM photos p
       JOIN album_share_photos asp ON asp.photo_id = p.id
       WHERE p.id = ? AND asp.shared_with_user_id = ?
       LIMIT 1`,
    )
    .get(photoId, requestingUserId) as PhotoRow | undefined;
  if (viaAlbumShare) return viaAlbumShare;

  const viaStandaloneShare = db
    .prepare(
      `SELECT p.* FROM photos p
       JOIN photo_shares ps ON ps.photo_id = p.id
       WHERE p.id = ? AND ps.shared_with_user_id = ?
       LIMIT 1`,
    )
    .get(photoId, requestingUserId) as PhotoRow | undefined;
  return viaStandaloneShare ?? null;
}

export function getPhotoRow(userId: string, photoId: string): PhotoRow | null {
  const row = db.prepare("SELECT * FROM photos WHERE id = ? AND user_id = ?").get(photoId, userId) as
    | PhotoRow
    | undefined;
  return row ?? null;
}

export function findByHash(userId: string, hash: string): boolean {
  const row = db.prepare("SELECT 1 FROM photos WHERE user_id = ? AND hash = ?").get(userId, hash);
  return Boolean(row);
}

export async function createPhoto(
  userId: string,
  file: { buffer: Buffer; originalName: string; mimeType: string },
): Promise<{ duplicate: true } | { duplicate: false; photo: PhotoDTO }> {
  const hash = sha256(file.buffer);
  if (findByHash(userId, hash)) {
    return { duplicate: true };
  }

  const id = uuid();
  const ext = extFromMime(file.mimeType);

  const [metadata, exif] = await Promise.all([
    sharp(file.buffer).metadata(),
    exifr.parse(file.buffer, { gps: true }).catch(() => null),
  ]);

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  saveOriginal(id, ext, file.buffer);
  const thumbnail = await buildThumbnailBuffer(getOriginalPath(id, ext), DEFAULT_EDITS);
  saveThumbnail(id, thumbnail);

  const importedAt = new Date().toISOString();
  const takenAt = exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null;
  const cameraModel = exif ? [exif.Make, exif.Model].filter(Boolean).join(" ") || null : null;

  // Embedding para busca semântica (modelo CLIP local). Se falhar por algum
  // motivo, a foto ainda é salva normalmente — só não aparece em buscas por IA.
  let embeddingBuffer: Buffer | null = null;
  try {
    const embedding = await embedImageFile(getOriginalPath(id, ext));
    embeddingBuffer = embeddingToBuffer(embedding);
  } catch (err) {
    console.error("Falha ao gerar embedding da foto", id, err);
  }

  db.prepare(
    `INSERT INTO photos (
      id, user_id, file_name, mime_type, imported_at, hash, width, height, size_bytes,
      favorite, edits_json, exif_taken_at, exif_camera_model, exif_latitude, exif_longitude,
      original_ext, embedding
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    file.originalName,
    file.mimeType,
    importedAt,
    hash,
    width,
    height,
    file.buffer.length,
    JSON.stringify(DEFAULT_EDITS),
    takenAt,
    cameraModel,
    exif?.latitude ?? null,
    exif?.longitude ?? null,
    ext,
    embeddingBuffer,
  );

  return { duplicate: false, photo: getPhotoDTO(userId, id)! };
}

/**
 * Busca semântica: compara o embedding de texto da query com o embedding de
 * cada foto do usuário (gerado no upload) por similaridade de cosseno.
 * Calculado em memória — viável para bibliotecas pessoais (até dezenas de
 * milhares de fotos); um volume muito maior pediria um índice vetorial.
 */
export function searchPhotosBySimilarity(
  userId: string,
  queryEmbedding: Float32Array,
  limit = 60,
): Array<PhotoDTO & { score: number }> {
  const rows = db
    .prepare("SELECT * FROM photos WHERE user_id = ? AND embedding IS NOT NULL")
    .all(userId) as PhotoRow[];

  const scored = rows
    .map((row) => ({
      row,
      score: cosineSimilarity(queryEmbedding, bufferToEmbedding(row.embedding!)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const dtos = rowsToDTOs(scored.map((s) => s.row), userId);
  return dtos.map((dto, i) => ({ ...dto, score: scored[i].score }));
}

export interface PhotoPatch {
  favorite?: boolean;
  tags?: string[];
  edits?: PhotoEdits;
}

function cropEquals(a: PhotoEdits["crop"], b: PhotoEdits["crop"]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function editsEqual(a: PhotoEdits, b: PhotoEdits): boolean {
  return (
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.saturation === b.saturation &&
    a.exposure === b.exposure &&
    a.rotation === b.rotation &&
    a.preset === b.preset &&
    cropEquals(a.crop, b.crop)
  );
}

export async function updatePhoto(
  userId: string,
  photoId: string,
  patch: PhotoPatch,
): Promise<PhotoDTO | null> {
  const row = getPhotoRow(userId, photoId);
  if (!row) return null;

  if (patch.favorite !== undefined) {
    db.prepare("UPDATE photos SET favorite = ? WHERE id = ?").run(patch.favorite ? 1 : 0, photoId);
  }
  if (patch.edits !== undefined) {
    db.prepare("UPDATE photos SET edits_json = ? WHERE id = ?").run(
      JSON.stringify(patch.edits),
      photoId,
    );

    // A miniatura é regenerada sempre que algo realmente muda — crop, rotação
    // e agora também cor (brilho/contraste/saturação/exposição/preset), para
    // a grade ficar fiel ao que foi salvo no editor sem custo desnecessário
    // quando o PATCH não alterou nada (ex.: salvar sem mexer em nada).
    const previousEdits = JSON.parse(row.edits_json) as PhotoEdits;
    if (!editsEqual(previousEdits, patch.edits)) {
      try {
        const thumbnail = await buildThumbnailBuffer(
          getOriginalPath(photoId, row.original_ext),
          patch.edits,
        );
        saveThumbnail(photoId, thumbnail);
      } catch (err) {
        console.error("Falha ao regenerar thumbnail da foto", photoId, err);
      }
    }
  }
  if (patch.tags !== undefined) {
    const tx = db.transaction((tags: string[]) => {
      db.prepare("DELETE FROM photo_tags WHERE photo_id = ?").run(photoId);
      const insert = db.prepare("INSERT INTO photo_tags (photo_id, tag) VALUES (?, ?)");
      for (const tag of tags) insert.run(photoId, tag);
    });
    tx(patch.tags);
  }

  return getPhotoDTO(userId, photoId);
}

export function deletePhoto(userId: string, photoId: string): boolean {
  const row = getPhotoRow(userId, photoId);
  if (!row) return false;
  db.prepare("DELETE FROM photos WHERE id = ?").run(photoId);
  deletePhotoFiles(photoId, row.original_ext);
  return true;
}

function ownedPhotoIds(userId: string, photoIds: string[]): string[] {
  if (photoIds.length === 0) return [];
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT id FROM photos WHERE user_id = ? AND id IN (${placeholders})`)
    .all(userId, ...photoIds) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

export function bulkAddToAlbum(userId: string, photoIds: string[], albumId: string): void {
  const ids = ownedPhotoIds(userId, photoIds);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO photo_albums (photo_id, album_id) VALUES (?, ?)",
  );
  const tx = db.transaction(() => {
    for (const id of ids) insert.run(id, albumId);
  });
  tx();
}

export function bulkAddTag(userId: string, photoIds: string[], tag: string): void {
  const ids = ownedPhotoIds(userId, photoIds);
  const insert = db.prepare("INSERT OR IGNORE INTO photo_tags (photo_id, tag) VALUES (?, ?)");
  const tx = db.transaction(() => {
    for (const id of ids) insert.run(id, tag);
  });
  tx();
}

export function bulkSetFavorite(userId: string, photoIds: string[], value: boolean): void {
  const ids = ownedPhotoIds(userId, photoIds);
  const update = db.prepare("UPDATE photos SET favorite = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (const id of ids) update.run(value ? 1 : 0, id);
  });
  tx();
}

export function bulkDelete(userId: string, photoIds: string[]): void {
  const ids = ownedPhotoIds(userId, photoIds);
  for (const id of ids) deletePhoto(userId, id);
}

export function togglePhotoAlbum(userId: string, photoId: string, albumId: string): PhotoDTO | null {
  const row = getPhotoRow(userId, photoId);
  if (!row) return null;
  const existing = db
    .prepare("SELECT 1 FROM photo_albums WHERE photo_id = ? AND album_id = ?")
    .get(photoId, albumId);
  if (existing) {
    db.prepare("DELETE FROM photo_albums WHERE photo_id = ? AND album_id = ?").run(photoId, albumId);
  } else {
    db.prepare("INSERT INTO photo_albums (photo_id, album_id) VALUES (?, ?)").run(photoId, albumId);
  }
  return getPhotoDTO(userId, photoId);
}

export function listTagCounts(userId: string): Array<{ tag: string; count: number }> {
  const rows = db
    .prepare(
      `SELECT pt.tag as tag, COUNT(*) as count
       FROM photo_tags pt
       JOIN photos p ON p.id = pt.photo_id
       WHERE p.user_id = ?
       GROUP BY pt.tag
       ORDER BY count DESC, tag ASC`,
    )
    .all(userId) as Array<{ tag: string; count: number }>;
  return rows;
}

/** Fotos avulsas (sem álbum) que outras pessoas compartilharam com `userId`. */
export function listSharedPhotos(userId: string): PhotoDTO[] {
  const rows = db
    .prepare(
      `SELECT p.* FROM photos p
       JOIN photo_shares ps ON ps.photo_id = p.id
       WHERE ps.shared_with_user_id = ?
       ORDER BY p.imported_at DESC`,
    )
    .all(userId) as PhotoRow[];
  return rowsToDTOs(rows, userId);
}

/** Compartilha fotos avulsas (sem vínculo de álbum) com outro usuário do servidor. */
export function sharePhotos(
  ownerId: string,
  photoIds: string[],
  targetUsername: string,
): { ok: true } | { ok: false; error: "user_not_found" | "cannot_share_with_self" } {
  const target = db.prepare("SELECT id FROM users WHERE username = ?").get(targetUsername) as
    | { id: string }
    | undefined;
  if (!target) return { ok: false, error: "user_not_found" };
  if (target.id === ownerId) return { ok: false, error: "cannot_share_with_self" };

  const ids = ownedPhotoIds(ownerId, photoIds);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO photo_shares (photo_id, shared_with_user_id, created_at) VALUES (?, ?, ?)",
  );
  const createdAt = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const id of ids) insert.run(id, target.id, createdAt);
  });
  tx();
  return { ok: true };
}

export function unsharePhoto(ownerId: string, photoId: string, targetUserId: string): boolean {
  if (!getPhotoRow(ownerId, photoId)) return false;
  db.prepare("DELETE FROM photo_shares WHERE photo_id = ? AND shared_with_user_id = ?").run(
    photoId,
    targetUserId,
  );
  return true;
}

/** Com quem uma foto (avulsa) do próprio usuário está compartilhada. */
export function listPhotoShares(ownerId: string, photoId: string): PhotoShareDTO[] | null {
  if (!getPhotoRow(ownerId, photoId)) return null;
  const rows = db
    .prepare(
      `SELECT u.id as user_id, u.username
       FROM photo_shares ps
       JOIN users u ON u.id = ps.shared_with_user_id
       WHERE ps.photo_id = ?
       ORDER BY u.username ASC`,
    )
    .all(photoId) as Array<{ user_id: string; username: string }>;
  return rows.map((r) => ({ userId: r.user_id, username: r.username }));
}

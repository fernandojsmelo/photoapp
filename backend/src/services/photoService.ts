import { v4 as uuid } from "uuid";
import exifr from "exifr";
import sharp from "sharp";
import { db } from "../db/client.js";
import { deletePhotoFiles, saveOriginal, saveThumbnail } from "../storage/fileStorage.js";
import { sha256 } from "../utils/hash.js";
import { DEFAULT_EDITS, type PhotoDTO, type PhotoEdits } from "../types/index.js";

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
}

export interface PhotoListFilters {
  albumId?: string;
  tag?: string;
  favorite?: boolean;
  q?: string;
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

function toDTO(row: PhotoRow, tags: string[], albumIds: string[]): PhotoDTO {
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
  };
}

function rowsToDTOs(rows: PhotoRow[]): PhotoDTO[] {
  const ids = rows.map((r) => r.id);
  const tagsMap = tagsForPhotos(ids);
  const albumsMap = albumIdsForPhotos(ids);
  return rows.map((row) => toDTO(row, tagsMap.get(row.id) ?? [], albumsMap.get(row.id) ?? []));
}

export function listPhotos(userId: string, filters: PhotoListFilters): PhotoDTO[] {
  const clauses = ["p.user_id = ?"];
  const params: unknown[] = [userId];

  let joins = "";
  if (filters.albumId) {
    joins += " JOIN photo_albums pa ON pa.photo_id = p.id";
    clauses.push("pa.album_id = ?");
    params.push(filters.albumId);
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
  return rowsToDTOs(rows);
}

export function getPhotoDTO(userId: string, photoId: string): PhotoDTO | null {
  const row = db.prepare("SELECT * FROM photos WHERE id = ? AND user_id = ?").get(photoId, userId) as
    | PhotoRow
    | undefined;
  if (!row) return null;
  return toDTO(row, tagsForPhotos([row.id]).get(row.id) ?? [], albumIdsForPhotos([row.id]).get(row.id) ?? []);
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
  const thumbnail = await sharp(file.buffer)
    .rotate()
    .resize(480, 480, { fit: "cover" })
    .jpeg({ quality: 78 })
    .toBuffer();
  saveThumbnail(id, thumbnail);

  const importedAt = new Date().toISOString();
  const takenAt = exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null;
  const cameraModel = exif ? [exif.Make, exif.Model].filter(Boolean).join(" ") || null : null;

  db.prepare(
    `INSERT INTO photos (
      id, user_id, file_name, mime_type, imported_at, hash, width, height, size_bytes,
      favorite, edits_json, exif_taken_at, exif_camera_model, exif_latitude, exif_longitude, original_ext
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
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
  );

  return { duplicate: false, photo: getPhotoDTO(userId, id)! };
}

export interface PhotoPatch {
  favorite?: boolean;
  tags?: string[];
  edits?: PhotoEdits;
}

export function updatePhoto(userId: string, photoId: string, patch: PhotoPatch): PhotoDTO | null {
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

export function getOriginalExt(userId: string, photoId: string): string | null {
  const row = getPhotoRow(userId, photoId);
  return row?.original_ext ?? null;
}

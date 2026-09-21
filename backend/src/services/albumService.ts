import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import type { AlbumDTO } from "../types/index.js";

interface AlbumRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

function toDTO(row: AlbumRow): AlbumDTO {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function listAlbums(userId: string): AlbumDTO[] {
  const rows = db
    .prepare("SELECT * FROM albums WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as AlbumRow[];
  return rows.map(toDTO);
}

export function createAlbum(userId: string, name: string): AlbumDTO {
  const id = uuid();
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO albums (id, user_id, name, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    name,
    createdAt,
  );
  return { id, name, createdAt };
}

export function deleteAlbum(userId: string, albumId: string): void {
  db.prepare("DELETE FROM albums WHERE id = ? AND user_id = ?").run(albumId, userId);
}

export function albumBelongsToUser(userId: string, albumId: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM albums WHERE id = ? AND user_id = ?")
    .get(albumId, userId);
  return Boolean(row);
}

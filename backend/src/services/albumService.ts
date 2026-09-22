import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import type { AlbumDTO, AlbumShareDTO } from "../types/index.js";

interface AlbumRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  photo_count: number;
}

function toOwnDTO(row: AlbumRow): AlbumDTO {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    isOwner: true,
    photoCount: row.photo_count,
  };
}

/** Álbuns do próprio usuário + álbuns que outras pessoas compartilharam com ele. */
export function listAlbums(userId: string): AlbumDTO[] {
  const own = db
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM photo_albums pa WHERE pa.album_id = a.id) as photo_count
       FROM albums a
       WHERE a.user_id = ?
       ORDER BY a.created_at ASC`,
    )
    .all(userId) as AlbumRow[];

  const shared = db
    .prepare(
      `SELECT a.*, u.username as owner_username,
              (SELECT COUNT(*) FROM album_share_photos asp
                WHERE asp.album_id = a.id AND asp.shared_with_user_id = ?) as photo_count
       FROM album_shares s
       JOIN albums a ON a.id = s.album_id
       JOIN users u ON u.id = a.user_id
       WHERE s.shared_with_user_id = ?
       ORDER BY s.created_at ASC`,
    )
    .all(userId, userId) as Array<AlbumRow & { owner_username: string }>;

  return [
    ...own.map(toOwnDTO),
    ...shared.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      isOwner: false,
      ownerUsername: row.owner_username,
      photoCount: row.photo_count,
    })),
  ];
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
  return { id, name, createdAt, isOwner: true, photoCount: 0 };
}

export function deleteAlbum(userId: string, albumId: string): void {
  db.prepare("DELETE FROM albums WHERE id = ? AND user_id = ?").run(albumId, userId);
}

export function albumBelongsToUser(userId: string, albumId: string): boolean {
  const row = db.prepare("SELECT 1 FROM albums WHERE id = ? AND user_id = ?").get(albumId, userId);
  return Boolean(row);
}

/**
 * Resolve se `requestingUserId` pode ver o conteúdo de um álbum — como dono
 * ou por compartilhamento — e retorna o dono real (as fotos do álbum
 * pertencem sempre a quem o criou, não a quem só o visualiza).
 */
export function resolveAlbumAccess(
  requestingUserId: string,
  albumId: string,
): { ownerId: string } | null {
  const row = db.prepare("SELECT user_id FROM albums WHERE id = ?").get(albumId) as
    | { user_id: string }
    | undefined;
  if (!row) return null;
  if (row.user_id === requestingUserId) return { ownerId: row.user_id };

  const shared = db
    .prepare("SELECT 1 FROM album_shares WHERE album_id = ? AND shared_with_user_id = ?")
    .get(albumId, requestingUserId);
  return shared ? { ownerId: row.user_id } : null;
}

/** Substitui as fotos visíveis de um compartilhamento já existente (album_id, targetUserId). */
function setSharePhotos(albumId: string, targetUserId: string, photoIds: string[]): void {
  const validIds = photoIds.length
    ? (db
        .prepare(
          `SELECT id FROM photos WHERE id IN (${photoIds.map(() => "?").join(",")}) AND EXISTS (
             SELECT 1 FROM photo_albums pa WHERE pa.photo_id = photos.id AND pa.album_id = ?
           )`,
        )
        .all(...photoIds, albumId) as Array<{ id: string }>).map((r) => r.id)
    : [];

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM album_share_photos WHERE album_id = ? AND shared_with_user_id = ?").run(
      albumId,
      targetUserId,
    );
    const insert = db.prepare(
      "INSERT OR IGNORE INTO album_share_photos (album_id, shared_with_user_id, photo_id) VALUES (?, ?, ?)",
    );
    for (const photoId of validIds) insert.run(albumId, targetUserId, photoId);
  });
  tx();
}

export function shareAlbum(
  ownerId: string,
  albumId: string,
  targetUsername: string,
  photoIds: string[],
): { ok: true } | { ok: false; error: "album_not_found" | "user_not_found" | "cannot_share_with_self" } {
  if (!albumBelongsToUser(ownerId, albumId)) {
    return { ok: false, error: "album_not_found" };
  }
  const target = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(targetUsername) as { id: string } | undefined;
  if (!target) {
    return { ok: false, error: "user_not_found" };
  }
  if (target.id === ownerId) {
    return { ok: false, error: "cannot_share_with_self" };
  }
  db.prepare(
    "INSERT OR IGNORE INTO album_shares (album_id, shared_with_user_id, created_at) VALUES (?, ?, ?)",
  ).run(albumId, target.id, new Date().toISOString());
  setSharePhotos(albumId, target.id, photoIds);
  return { ok: true };
}

/** Atualiza quais fotos do álbum ficam visíveis para um compartilhamento já existente. */
export function updateAlbumSharePhotos(
  ownerId: string,
  albumId: string,
  targetUserId: string,
  photoIds: string[],
): boolean {
  if (!albumBelongsToUser(ownerId, albumId)) return false;
  const exists = db
    .prepare("SELECT 1 FROM album_shares WHERE album_id = ? AND shared_with_user_id = ?")
    .get(albumId, targetUserId);
  if (!exists) return false;
  setSharePhotos(albumId, targetUserId, photoIds);
  return true;
}

export function unshareAlbum(ownerId: string, albumId: string, targetUserId: string): boolean {
  if (!albumBelongsToUser(ownerId, albumId)) return false;
  db.prepare("DELETE FROM album_shares WHERE album_id = ? AND shared_with_user_id = ?").run(
    albumId,
    targetUserId,
  );
  return true;
}

export function listAlbumShares(ownerId: string, albumId: string): AlbumShareDTO[] | null {
  if (!albumBelongsToUser(ownerId, albumId)) return null;
  const rows = db
    .prepare(
      `SELECT u.id as user_id, u.username
       FROM album_shares s
       JOIN users u ON u.id = s.shared_with_user_id
       WHERE s.album_id = ?
       ORDER BY u.username ASC`,
    )
    .all(albumId) as Array<{ user_id: string; username: string }>;

  const photoRows = db
    .prepare("SELECT shared_with_user_id, photo_id FROM album_share_photos WHERE album_id = ?")
    .all(albumId) as Array<{ shared_with_user_id: string; photo_id: string }>;
  const photosByUser = new Map<string, string[]>();
  for (const row of photoRows) {
    const list = photosByUser.get(row.shared_with_user_id) ?? [];
    list.push(row.photo_id);
    photosByUser.set(row.shared_with_user_id, list);
  }

  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    photoIds: photosByUser.get(r.user_id) ?? [],
  }));
}

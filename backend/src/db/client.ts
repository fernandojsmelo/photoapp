import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(path.join(config.dataDir, "originals"), { recursive: true });
fs.mkdirSync(path.join(config.dataDir, "thumbnails"), { recursive: true });

export const db = new Database(path.join(config.dataDir, "photoapp.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    hash TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    edits_json TEXT NOT NULL,
    exif_taken_at TEXT,
    exif_camera_model TEXT,
    exif_latitude REAL,
    exif_longitude REAL,
    original_ext TEXT NOT NULL,
    embedding BLOB
  );

  CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_user_hash ON photos(user_id, hash);

  CREATE TABLE IF NOT EXISTS photo_tags (
    photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (photo_id, tag)
  );

  CREATE TABLE IF NOT EXISTS photo_albums (
    photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    PRIMARY KEY (photo_id, album_id)
  );

  CREATE TABLE IF NOT EXISTS album_shares (
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    shared_with_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (album_id, shared_with_user_id)
  );
`);

// Migração leve: bancos criados antes do recurso de busca semântica não têm
// a coluna `embedding`. CREATE TABLE IF NOT EXISTS não adiciona colunas a
// tabelas já existentes, então checamos e aplicamos ALTER TABLE se preciso.
const photoColumns = db.prepare("PRAGMA table_info(photos)").all() as Array<{ name: string }>;
if (!photoColumns.some((c) => c.name === "embedding")) {
  db.exec("ALTER TABLE photos ADD COLUMN embedding BLOB");
}

// Migração leve: bancos criados antes do multiusuário não têm `is_admin`.
// O(s) usuário(s) já existentes viram admin, para não travar quem já tinha
// um servidor rodando (single-user) sem ninguém habilitado a gerenciar contas.
const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!userColumns.some((c) => c.name === "is_admin")) {
  db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
  db.exec("UPDATE users SET is_admin = 1");
}

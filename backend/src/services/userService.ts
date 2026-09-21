import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import type { UserDTO } from "../types/index.js";

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export function hasAnyUser(): boolean {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count > 0;
}

export function createUser(username: string, password: string): UserDTO {
  if (hasAnyUser()) {
    throw new Error("Já existe um usuário configurado neste servidor.");
  }
  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, username, passwordHash, new Date().toISOString());
  return { id, username };
}

export function verifyUser(username: string, password: string): UserDTO | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | UserRow
    | undefined;
  if (!row) return null;
  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) return null;
  return { id: row.id, username: row.username };
}

export function getUserById(id: string): UserDTO | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  return { id: row.id, username: row.username };
}

import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db/client.js";
import type { UserDTO } from "../types/index.js";

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  is_admin: number;
  created_at: string;
}

function toDTO(row: UserRow): UserDTO {
  return { id: row.id, username: row.username, isAdmin: Boolean(row.is_admin), createdAt: row.created_at };
}

export function hasAnyUser(): boolean {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count > 0;
}

/** Primeiro usuário do servidor (fluxo de setup inicial) — sempre vira admin. */
export function createUser(username: string, password: string): UserDTO {
  if (hasAnyUser()) {
    throw new Error("Já existe um usuário configurado neste servidor.");
  }
  return insertUser(username, password, true);
}

/** Novo usuário criado por um admin já autenticado — nunca é admin. */
export function createUserByAdmin(username: string, password: string): UserDTO {
  return insertUser(username, password, false);
}

function insertUser(username: string, password: string, isAdmin: boolean): UserDTO {
  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 12);
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, username, passwordHash, isAdmin ? 1 : 0, createdAt);
  return { id, username, isAdmin, createdAt };
}

export function verifyUser(username: string, password: string): UserDTO | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | UserRow
    | undefined;
  if (!row) return null;
  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) return null;
  return toDTO(row);
}

export function getUserById(id: string): UserDTO | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  return toDTO(row);
}

export function isUsernameTaken(username: string): boolean {
  const row = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  return Boolean(row);
}

export function listUsers(): UserDTO[] {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as UserRow[];
  return rows.map(toDTO);
}

export function countAdmins(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1").get() as {
    count: number;
  };
  return row.count;
}

export function deleteUser(id: string): boolean {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return result.changes > 0;
}

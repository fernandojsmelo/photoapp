import type { AlbumRecord, PhotoEdits, PhotoRecord } from "../types/photo";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
        : init?.headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // corpo não era JSON, mantém statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth ---

export interface AuthUser {
  id: string;
  username: string;
}

export function getAuthStatus() {
  return request<{ hasUser: boolean }>("/api/auth/status");
}

export function setupAccount(username: string, password: string) {
  return request<{ user: AuthUser }>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string) {
  return request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export function getMe() {
  return request<{ user: AuthUser }>("/api/auth/me");
}

// --- Photos ---

export interface PhotoListFilters {
  albumId?: string;
  tag?: string;
  favorite?: boolean;
  q?: string;
}

export function listPhotos(filters: PhotoListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.albumId) params.set("albumId", filters.albumId);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.favorite) params.set("favorite", "true");
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return request<{ photos: PhotoRecord[] }>(`/api/photos${qs ? `?${qs}` : ""}`);
}

export function uploadPhotos(files: File[]) {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  return request<{ imported: number; duplicates: number; photos: PhotoRecord[] }>("/api/photos", {
    method: "POST",
    body: form,
  });
}

export function patchPhoto(
  id: string,
  patch: Partial<{ favorite: boolean; tags: string[]; edits: PhotoEdits }>,
) {
  return request<{ photo: PhotoRecord }>(`/api/photos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deletePhotoApi(id: string) {
  return request<void>(`/api/photos/${id}`, { method: "DELETE" });
}

export function togglePhotoAlbumApi(photoId: string, albumId: string) {
  return request<{ photo: PhotoRecord }>(`/api/photos/${photoId}/albums/${albumId}`, {
    method: "POST",
  });
}

export type BulkAction =
  | { action: "addToAlbum"; albumId: string }
  | { action: "addTag"; tag: string }
  | { action: "favorite" }
  | { action: "delete" };

export function bulkPhotoAction(ids: string[], action: BulkAction) {
  return request<{ photos: PhotoRecord[] }>("/api/photos/bulk", {
    method: "POST",
    body: JSON.stringify({ ids, ...action }),
  });
}

export function listTagCounts() {
  return request<{ tags: Array<{ tag: string; count: number }> }>("/api/photos/tags");
}

export type PhotoSearchResult = PhotoRecord & { score: number };

/** Busca semântica: modelo de IA local (CLIP) rankeia fotos por relevância ao texto. */
export function searchPhotosSemantic(query: string) {
  return request<{ photos: PhotoSearchResult[] }>(
    `/api/photos/search?q=${encodeURIComponent(query)}`,
  );
}

export function photoFileUrl(photoId: string): string {
  return `${API_BASE}/api/photos/${photoId}/file`;
}

export function photoThumbnailUrl(photoId: string): string {
  return `${API_BASE}/api/photos/${photoId}/thumbnail`;
}

export async function fetchPhotoBlob(photoId: string): Promise<Blob> {
  const res = await fetch(photoFileUrl(photoId), { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, "Falha ao baixar a foto original");
  return res.blob();
}

// --- Albums ---

export function listAlbums() {
  return request<{ albums: AlbumRecord[] }>("/api/albums");
}

export function createAlbumApi(name: string) {
  return request<{ album: AlbumRecord }>("/api/albums", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteAlbumApi(id: string) {
  return request<void>(`/api/albums/${id}`, { method: "DELETE" });
}

import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

function originalPath(photoId: string, ext: string): string {
  return path.join(config.dataDir, "originals", `${photoId}.${ext}`);
}

function thumbnailPath(photoId: string): string {
  return path.join(config.dataDir, "thumbnails", `${photoId}.jpg`);
}

export function saveOriginal(photoId: string, ext: string, buffer: Buffer): string {
  const filePath = originalPath(photoId, ext);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function saveThumbnail(photoId: string, buffer: Buffer): string {
  const filePath = thumbnailPath(photoId);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getOriginalPath(photoId: string, ext: string): string {
  return originalPath(photoId, ext);
}

export function getThumbnailPath(photoId: string): string {
  return thumbnailPath(photoId);
}

export function deletePhotoFiles(photoId: string, ext: string): void {
  for (const p of [originalPath(photoId, ext), thumbnailPath(photoId)]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

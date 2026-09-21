import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AlbumRecord, PhotoRecord } from "../types/photo";

interface PhotoAppDB extends DBSchema {
  photos: {
    key: string;
    value: PhotoRecord;
    indexes: { "by-importedAt": string; "by-hash": string };
  };
  albums: {
    key: string;
    value: AlbumRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<PhotoAppDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PhotoAppDB>("photoapp", 1, {
      upgrade(db) {
        const photos = db.createObjectStore("photos", { keyPath: "id" });
        photos.createIndex("by-importedAt", "importedAt");
        photos.createIndex("by-hash", "hash");
        db.createObjectStore("albums", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function putPhoto(photo: PhotoRecord) {
  const db = await getDB();
  await db.put("photos", photo);
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("photos", "by-importedAt");
  return all.reverse();
}

export async function findPhotoByHash(hash: string): Promise<PhotoRecord | undefined> {
  const db = await getDB();
  return db.getFromIndex("photos", "by-hash", hash);
}

export async function deletePhoto(id: string) {
  const db = await getDB();
  await db.delete("photos", id);
}

export async function putAlbum(album: AlbumRecord) {
  const db = await getDB();
  await db.put("albums", album);
}

export async function getAllAlbums(): Promise<AlbumRecord[]> {
  const db = await getDB();
  return db.getAll("albums");
}

export async function deleteAlbum(id: string) {
  const db = await getDB();
  await db.delete("albums", id);
}

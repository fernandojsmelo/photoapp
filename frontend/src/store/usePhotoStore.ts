import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  deleteAlbum as dbDeleteAlbum,
  deletePhoto as dbDeletePhoto,
  findPhotoByHash,
  getAllAlbums,
  getAllPhotos,
  putAlbum,
  putPhoto,
} from "../db/db";
import { readExif, getImageDimensions } from "../utils/exif";
import { hashFile } from "../utils/hash";
import { DEFAULT_EDITS, type AlbumRecord, type PhotoEdits, type PhotoRecord } from "../types/photo";

interface ImportResult {
  imported: number;
  duplicates: number;
}

interface PhotoStoreState {
  photos: PhotoRecord[];
  albums: AlbumRecord[];
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<ImportResult>;
  toggleFavorite: (photoId: string) => Promise<void>;
  setTags: (photoId: string, tags: string[]) => Promise<void>;
  updateEdits: (photoId: string, edits: PhotoEdits) => Promise<void>;
  removePhoto: (photoId: string) => Promise<void>;
  createAlbum: (name: string) => Promise<AlbumRecord>;
  removeAlbum: (albumId: string) => Promise<void>;
  togglePhotoInAlbum: (photoId: string, albumId: string) => Promise<void>;
}

export const usePhotoStore = create<PhotoStoreState>((set, get) => ({
  photos: [],
  albums: [],
  loading: false,
  initialized: false,

  async init() {
    if (get().initialized) return;
    set({ loading: true });
    const [photos, albums] = await Promise.all([getAllPhotos(), getAllAlbums()]);
    set({ photos, albums, loading: false, initialized: true });
  },

  async importFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    let imported = 0;
    let duplicates = 0;

    for (const file of list) {
      const hash = await hashFile(file);
      const existing = await findPhotoByHash(hash);
      if (existing) {
        duplicates++;
        continue;
      }

      const [exif, dims] = await Promise.all([readExif(file), getImageDimensions(file)]);
      const record: PhotoRecord = {
        id: uuid(),
        fileName: file.name,
        mimeType: file.type,
        importedAt: new Date().toISOString(),
        hash,
        width: dims.width,
        height: dims.height,
        favorite: false,
        tags: [],
        albumIds: [],
        edits: { ...DEFAULT_EDITS },
        exif,
        original: file,
      };
      await putPhoto(record);
      imported++;
      set((state) => ({ photos: [record, ...state.photos] }));
    }

    return { imported, duplicates };
  },

  async toggleFavorite(photoId) {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;
    const updated = { ...photo, favorite: !photo.favorite };
    await putPhoto(updated);
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async setTags(photoId, tags) {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;
    const updated = { ...photo, tags };
    await putPhoto(updated);
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async updateEdits(photoId, edits) {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;
    const updated = { ...photo, edits };
    await putPhoto(updated);
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async removePhoto(photoId) {
    await dbDeletePhoto(photoId);
    set((state) => ({ photos: state.photos.filter((p) => p.id !== photoId) }));
  },

  async createAlbum(name) {
    const album: AlbumRecord = { id: uuid(), name, createdAt: new Date().toISOString() };
    await putAlbum(album);
    set((state) => ({ albums: [...state.albums, album] }));
    return album;
  },

  async removeAlbum(albumId) {
    await dbDeleteAlbum(albumId);
    const affected = get().photos.filter((p) => p.albumIds.includes(albumId));
    for (const photo of affected) {
      const updated = { ...photo, albumIds: photo.albumIds.filter((id) => id !== albumId) };
      await putPhoto(updated);
    }
    set((state) => ({
      albums: state.albums.filter((a) => a.id !== albumId),
      photos: state.photos.map((p) =>
        p.albumIds.includes(albumId)
          ? { ...p, albumIds: p.albumIds.filter((id) => id !== albumId) }
          : p,
      ),
    }));
  },

  async togglePhotoInAlbum(photoId, albumId) {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;
    const has = photo.albumIds.includes(albumId);
    const updated = {
      ...photo,
      albumIds: has ? photo.albumIds.filter((id) => id !== albumId) : [...photo.albumIds, albumId],
    };
    await putPhoto(updated);
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },
}));

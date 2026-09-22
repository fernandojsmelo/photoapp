import { create } from "zustand";
import {
  bulkPhotoAction,
  createAlbumApi,
  deleteAlbumApi,
  deletePhotoApi,
  listAlbums,
  listPhotos,
  patchPhoto,
  togglePhotoAlbumApi,
  uploadPhotos,
} from "../api/client";
import type { AlbumRecord, PhotoEdits, PhotoRecord } from "../types/photo";

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
  reset: () => void;
  importFiles: (files: FileList | File[]) => Promise<ImportResult>;
  toggleFavorite: (photoId: string) => Promise<void>;
  setTags: (photoId: string, tags: string[]) => Promise<void>;
  updateEdits: (photoId: string, edits: PhotoEdits) => Promise<void>;
  removePhoto: (photoId: string) => Promise<void>;
  createAlbum: (name: string) => Promise<AlbumRecord>;
  removeAlbum: (albumId: string) => Promise<void>;
  togglePhotoInAlbum: (photoId: string, albumId: string) => Promise<void>;
  addPhotosToAlbum: (photoIds: string[], albumId: string) => Promise<void>;
  addTagToPhotos: (photoIds: string[], tag: string) => Promise<void>;
  setFavoriteMany: (photoIds: string[]) => Promise<void>;
  removePhotosMany: (photoIds: string[]) => Promise<void>;
  /**
   * Busca as fotos de um álbum específico sob demanda, sem tocar no estado
   * `photos` global — necessário para álbuns compartilhados, cujas fotos
   * pertencem a outra conta e nunca entram na listagem geral do usuário.
   */
  fetchAlbumPhotos: (albumId: string) => Promise<PhotoRecord[]>;
}

export const usePhotoStore = create<PhotoStoreState>((set, get) => ({
  photos: [],
  albums: [],
  loading: false,
  initialized: false,

  async init() {
    if (get().initialized) return;
    set({ loading: true });
    const [{ photos }, { albums }] = await Promise.all([listPhotos(), listAlbums()]);
    set({ photos, albums, loading: false, initialized: true });
  },

  reset() {
    set({ photos: [], albums: [], loading: false, initialized: false });
  },

  async importFiles(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return { imported: 0, duplicates: 0 };
    const result = await uploadPhotos(list);
    set((state) => ({ photos: [...result.photos, ...state.photos] }));
    return { imported: result.imported, duplicates: result.duplicates };
  },

  async toggleFavorite(photoId) {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;
    const { photo: updated } = await patchPhoto(photoId, { favorite: !photo.favorite });
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async setTags(photoId, tags) {
    const { photo: updated } = await patchPhoto(photoId, { tags });
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async updateEdits(photoId, edits) {
    const { photo: updated } = await patchPhoto(photoId, { edits });
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async removePhoto(photoId) {
    await deletePhotoApi(photoId);
    set((state) => ({ photos: state.photos.filter((p) => p.id !== photoId) }));
  },

  async createAlbum(name) {
    const { album } = await createAlbumApi(name);
    set((state) => ({ albums: [...state.albums, album] }));
    return album;
  },

  async removeAlbum(albumId) {
    await deleteAlbumApi(albumId);
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
    const { photo: updated } = await togglePhotoAlbumApi(photoId, albumId);
    set((state) => ({ photos: state.photos.map((p) => (p.id === photoId ? updated : p)) }));
  },

  async addPhotosToAlbum(photoIds, albumId) {
    const { photos } = await bulkPhotoAction(photoIds, { action: "addToAlbum", albumId });
    set({ photos });
  },

  async addTagToPhotos(photoIds, tag) {
    const { photos } = await bulkPhotoAction(photoIds, { action: "addTag", tag });
    set({ photos });
  },

  async setFavoriteMany(photoIds) {
    const { photos } = await bulkPhotoAction(photoIds, { action: "favorite" });
    set({ photos });
  },

  async removePhotosMany(photoIds) {
    const { photos } = await bulkPhotoAction(photoIds, { action: "delete" });
    set({ photos });
  },

  async fetchAlbumPhotos(albumId) {
    const { photos } = await listPhotos({ albumId });
    return photos;
  },
}));

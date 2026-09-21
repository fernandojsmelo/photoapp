export interface CropRect {
  x: number; // 0..1, relativo à largura original
  y: number; // 0..1, relativo à altura original
  width: number; // 0..1
  height: number; // 0..1
}

export interface PhotoEdits {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  exposure: number; // -100..100
  rotation: number; // 0, 90, 180, 270
  preset: PresetId;
  crop: CropRect | null;
}

export type PresetId = "none" | "vivid" | "mono" | "warm" | "cool" | "fade";

export interface PhotoRecord {
  id: string;
  fileName: string;
  mimeType: string;
  importedAt: string;
  hash: string;
  width: number;
  height: number;
  favorite: boolean;
  tags: string[];
  albumIds: string[];
  edits: PhotoEdits;
  exif: PhotoExif;
  original: Blob;
}

export interface PhotoExif {
  takenAt?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
}

export interface AlbumRecord {
  id: string;
  name: string;
  createdAt: string;
  coverPhotoId?: string;
}

export const DEFAULT_EDITS: PhotoEdits = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  rotation: 0,
  preset: "none",
  crop: null,
};

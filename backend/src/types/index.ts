export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PresetId = "none" | "vivid" | "mono" | "warm" | "cool" | "fade";

export interface PhotoEdits {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  rotation: number;
  preset: PresetId;
  crop: CropRect | null;
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

export interface PhotoExif {
  takenAt?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
}

export interface PhotoDTO {
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
  sizeBytes: number;
}

export interface AlbumDTO {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

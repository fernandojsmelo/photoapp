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
  sizeBytes: number;
  favorite: boolean;
  tags: string[];
  albumIds: string[];
  edits: PhotoEdits;
  exif: PhotoExif;
  /** true quando a foto é de outra conta (vista via compartilhamento) — somente leitura. */
  readOnly: boolean;
  /** username de quem compartilhou, presente só quando readOnly é true. */
  sharedByUsername?: string;
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
  /** false quando o álbum foi compartilhado com você (não é o dono). */
  isOwner: boolean;
  /** username de quem compartilhou, presente só quando isOwner é false. */
  ownerUsername?: string;
  photoCount: number;
}

export interface AlbumShare {
  userId: string;
  username: string;
  /** ids das fotos do álbum visíveis para esta pessoa. */
  photoIds: string[];
}

export interface PhotoShare {
  userId: string;
  username: string;
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

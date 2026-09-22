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
  /** true quando a foto pertence a outro usuário (vista via compartilhamento) — somente leitura. */
  readOnly: boolean;
  /** username de quem compartilhou, presente só quando readOnly é true. */
  sharedByUsername?: string;
}

export interface AlbumDTO {
  id: string;
  name: string;
  createdAt: string;
  /** false quando o álbum foi compartilhado com o usuário atual (não é o dono). */
  isOwner: boolean;
  /** username de quem compartilhou, presente só quando isOwner é false. */
  ownerUsername?: string;
  photoCount: number;
}

export interface AlbumShareDTO {
  userId: string;
  username: string;
  /** ids das fotos do álbum visíveis para esta pessoa (nem todo o álbum precisa estar liberado). */
  photoIds: string[];
}

export interface PhotoShareDTO {
  userId: string;
  username: string;
}

export interface UserDTO {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

import exifr from "exifr";
import type { PhotoExif } from "../types/photo";

export async function readExif(file: File): Promise<PhotoExif> {
  try {
    const data = await exifr.parse(file, { gps: true });
    if (!data) return {};
    return {
      takenAt: data.DateTimeOriginal
        ? new Date(data.DateTimeOriginal).toISOString()
        : undefined,
      cameraModel: [data.Make, data.Model].filter(Boolean).join(" ") || undefined,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch {
    return {};
  }
}

export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

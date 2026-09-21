import { useEffect, useState } from "react";
import { fetchPhotoBlob } from "../api/client";

const cache = new Map<string, Promise<Blob>>();

function getCachedBlob(photoId: string): Promise<Blob> {
  let promise = cache.get(photoId);
  if (!promise) {
    promise = fetchPhotoBlob(photoId);
    cache.set(photoId, promise);
    promise.catch(() => cache.delete(photoId));
  }
  return promise;
}

export function invalidatePhotoBlob(photoId: string): void {
  cache.delete(photoId);
}

/** Baixa (e cacheia em memória) o arquivo original de uma foto para processamento em canvas. */
export function usePhotoBlob(photoId: string | undefined): Blob | undefined {
  const [blob, setBlob] = useState<Blob | undefined>(undefined);

  useEffect(() => {
    if (!photoId) {
      setBlob(undefined);
      return;
    }
    let cancelled = false;
    setBlob(undefined);
    getCachedBlob(photoId).then((result) => {
      if (!cancelled) setBlob(result);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  return blob;
}

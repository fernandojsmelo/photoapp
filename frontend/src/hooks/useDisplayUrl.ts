import { useEffect, useState } from "react";
import { cropOnlyBlob } from "../utils/imageProcessing";
import type { CropRect } from "../types/photo";

/**
 * URL de exibição de uma foto. Quando há crop salvo, a rotação já vem
 * embutida na imagem gerada (o crop é definido no espaço rotacionado) —
 * nesse caso o chamador NÃO deve aplicar `transform: rotate()` de novo.
 * Sem crop, a URL é o blob original e a rotação continua sendo aplicada
 * via CSS pelo chamador (mais leve, sem reprocessar canvas).
 */
export function useDisplayUrl(
  original: Blob | undefined | null,
  crop: CropRect | null,
  rotation: number,
): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!original) {
      setUrl(undefined);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    if (!crop) {
      objectUrl = URL.createObjectURL(original);
      setUrl(objectUrl);
    } else {
      cropOnlyBlob(original, crop, rotation).then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, crop?.x, crop?.y, crop?.width, crop?.height, rotation]);

  return url;
}

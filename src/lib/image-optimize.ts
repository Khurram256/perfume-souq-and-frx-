// Admin uploads came straight off a phone/desktop as full-size PNGs — the
// first two product photos uploaded were 2.3MB and 1.9MB each, which made
// the storefront crawl once a few products had images. Supabase Storage
// image transformation is a paid add-on, so the resize happens here in the
// browser before the bytes ever leave the admin's machine.
//
// 1400px on the long edge covers the largest on-site render (~500px) at 2x
// DPR with headroom; WebP keeps transparency (bottle cut-outs) while being
// far smaller than PNG for photographic content.
const MAX_EDGE = 1400;
const QUALITY = 0.86;

export type OptimizedImage = {
  base64: string;
  contentType: string;
  fileName: string;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image file."));
    };
    img.src = url;
  });
}

function toBase64(canvas: HTMLCanvasElement, type: string, quality: number) {
  const dataUrl = canvas.toDataURL(type, quality);
  // A browser that can't encode the requested type silently returns PNG.
  const actualType = dataUrl.slice(5, dataUrl.indexOf(";"));
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), actualType };
}

// Falls back to the original file whenever anything is unsupported or the
// re-encode would actually be larger (already-optimized small images, or
// formats the canvas can't round-trip such as animated GIFs).
export async function optimizeImageForUpload(file: File): Promise<OptimizedImage> {
  const passthrough = async (): Promise<OptimizedImage> => ({
    base64: await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }),
    contentType: file.type,
    fileName: file.name,
  });

  if (file.type === "image/gif" || typeof document === "undefined") return passthrough();

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return passthrough();
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const { base64, actualType } = toBase64(canvas, "image/webp", QUALITY);
    if (base64.length * 0.75 >= file.size) return passthrough();

    const ext = actualType === "image/webp" ? "webp" : "png";
    return {
      base64,
      contentType: actualType,
      fileName: file.name.replace(/\.[^.]+$/, "") + "." + ext,
    };
  } catch {
    return passthrough();
  }
}

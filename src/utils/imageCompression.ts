/**
 * imageCompression.ts — Downscale + re-encode images before upload.
 *
 * Why: a VisionCamera capture or a 12 MP gallery photo can be several MB. We
 * downscale to a sane long-edge cap and re-encode, which (a) keeps uploads fast
 * on mobile data, (b) keeps files under the 10 MB server cap, and (c) strips
 * EXIF/GPS (keepMeta=false) as defence-in-depth alongside the server-side strip.
 *
 * Design rules:
 *  - PDFs and any non-image MIME pass through untouched (resizer can't read them).
 *  - Source format is preserved (PNG keeps transparency; WebP stays WebP).
 *  - If compression fails OR yields a larger file, the original is used. Upload
 *    must never be blocked by a compression hiccup.
 */
import ImageResizer from '@bam.tech/react-native-image-resizer';

const MAX_DIMENSION = 2200; // long-edge cap — keeps ID/document text legible
const IMAGE_QUALITY = 80;   // 0–100; applies to JPEG/WebP, ignored for PNG

const MIME_TO_FORMAT: Record<string, 'JPEG' | 'PNG' | 'WEBP'> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
};

export interface CompressedImage {
  uri: string;
  sizeBytes: number;
}

export async function compressImageForUpload(
  uri: string,
  mime: string,
  originalSize: number,
): Promise<CompressedImage> {
  const format = MIME_TO_FORMAT[mime];
  if (!format) return { uri, sizeBytes: originalSize }; // not a compressible image (e.g. PDF)

  try {
    const out = await ImageResizer.createResizedImage(
      uri,
      MAX_DIMENSION,
      MAX_DIMENSION,
      format,
      IMAGE_QUALITY,
      0, // rotation — native layer auto-orients
      undefined, // outputPath — defaults to cache dir
      false, // keepMeta=false — strip EXIF/GPS
      { mode: 'contain', onlyScaleDown: true },
    );

    // Guard: if the re-encode produced a bigger file (tiny source), keep original.
    if (originalSize > 0 && out.size >= originalSize) {
      return { uri, sizeBytes: originalSize };
    }

    const outUri =
      out.uri.startsWith('file://') || out.uri.startsWith('content://')
        ? out.uri
        : `file://${out.path}`;
    return { uri: outUri, sizeBytes: out.size };
  } catch {
    // Never block upload on a compression failure — fall back to the original.
    return { uri, sizeBytes: originalSize };
  }
}

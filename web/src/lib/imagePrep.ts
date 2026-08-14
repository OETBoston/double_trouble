// Downscales/recompresses a photo before it's stored as base64 in Postgres
// (see server/prisma/schema.prisma) — phone camera photos routinely run
// several MB, and that would bloat both the request body and every row.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/** Raw file size cap enforced before any processing — keeps a truly huge
 * upload (e.g. an unedited RAW/HEIC-derived export) from tying up the
 * browser trying to decode it at all. */
export const MAX_PHOTO_FILE_BYTES = 6 * 1024 * 1024;

export class PhotoTooLargeError extends Error {
  constructor() {
    super(`Photo exceeds the ${MAX_PHOTO_FILE_BYTES / (1024 * 1024)}MB limit.`);
    this.name = "PhotoTooLargeError";
  }
}

export class InvalidPhotoTypeError extends Error {
  constructor() {
    super("File is not an image.");
    this.name = "InvalidPhotoTypeError";
  }
}

/**
 * Validates and prepares a user-selected photo for upload: rejects
 * non-images and oversized files, then downscales to at most
 * MAX_DIMENSION on the long edge and re-encodes as JPEG to keep the
 * resulting base64 payload reasonably small. Falls back to the original
 * file's raw data URL if resizing isn't available in this environment
 * (e.g. no canvas support) so the upload still works either way.
 */
export async function prepareImageForUpload(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new InvalidPhotoTypeError();
  }
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    throw new PhotoTooLargeError();
  }

  try {
    return await resizeImage(file);
  } catch {
    return readFileAsDataUrl(file);
  }
}

async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

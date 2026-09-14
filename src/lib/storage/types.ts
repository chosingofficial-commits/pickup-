export type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export interface StorageAdapter {
  /** Stores the file under `folder` and returns a publicly reachable URL. */
  upload(input: UploadInput, folder: string): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

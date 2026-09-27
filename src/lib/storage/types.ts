export type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export type StorageOptions = {
  /** Store/read from the private bucket (never returns a publicly reachable URL). */
  private?: boolean;
};

export interface StorageAdapter {
  /** Stores the file under `folder`. For a private upload, `url` is empty — only `key` is usable. */
  upload(input: UploadInput, folder: string, opts?: StorageOptions): Promise<{ url: string; key: string }>;
  delete(key: string, opts?: StorageOptions): Promise<void>;
  /** Fetches a private object's bytes for server-side streaming. Returns null if it doesn't exist. */
  getObject(key: string, opts?: StorageOptions): Promise<{ body: Buffer; contentType: string } | null>;
}

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

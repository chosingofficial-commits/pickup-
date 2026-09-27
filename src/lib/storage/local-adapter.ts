import "server-only";
import { writeFile, mkdir, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { publicEnv } from "@/lib/env/public";
import type { StorageAdapter, StorageOptions, UploadInput } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "dev");
// Outside `public/` — never served directly by Next.js, mirroring the private
// bucket's "public access OFF" behavior in dev.
const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), "private-uploads", "dev");

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Development-only fallback that writes to the local filesystem. Never use
 * this in production — Hostinger's filesystem (like most PaaS/App hosting)
 * is not guaranteed persistent across deploys/restarts. Set
 * STORAGE_PROVIDER=s3 and configure the S3_* variables instead.
 */
export class LocalStorageAdapter implements StorageAdapter {
  async upload(input: UploadInput, folder: string, opts?: StorageOptions): Promise<{ url: string; key: string }> {
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
    const ext = path.extname(input.filename).slice(0, 10);
    const key = `${safeFolder}/${randomUUID()}${ext}`;
    const root = opts?.private ? PRIVATE_UPLOAD_ROOT : UPLOAD_ROOT;
    const destPath = path.join(root, key);

    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, input.buffer);

    if (opts?.private) return { url: "", key };
    return { url: `${publicEnv.appUrl}/uploads/dev/${key}`, key };
  }

  async delete(key: string, opts?: StorageOptions): Promise<void> {
    const root = opts?.private ? PRIVATE_UPLOAD_ROOT : UPLOAD_ROOT;
    try {
      await unlink(path.join(root, key));
    } catch {
      // Already gone — nothing to do.
    }
  }

  async getObject(key: string, opts?: StorageOptions): Promise<{ body: Buffer; contentType: string } | null> {
    const root = opts?.private ? PRIVATE_UPLOAD_ROOT : UPLOAD_ROOT;
    try {
      const body = await readFile(path.join(root, key));
      const contentType = EXT_TO_MIME[path.extname(key).toLowerCase()] ?? "application/octet-stream";
      return { body, contentType };
    } catch {
      return null;
    }
  }
}

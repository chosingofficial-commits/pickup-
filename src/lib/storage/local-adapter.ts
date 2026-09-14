import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { publicEnv } from "@/lib/env/public";
import type { StorageAdapter, UploadInput } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "dev");

/**
 * Development-only fallback that writes to the local filesystem. Never use
 * this in production — Hostinger's filesystem (like most PaaS/App hosting)
 * is not guaranteed persistent across deploys/restarts. Set
 * STORAGE_PROVIDER=s3 and configure the S3_* variables instead.
 */
export class LocalStorageAdapter implements StorageAdapter {
  async upload(input: UploadInput, folder: string): Promise<{ url: string; key: string }> {
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
    const ext = path.extname(input.filename).slice(0, 10);
    const key = `${safeFolder}/${randomUUID()}${ext}`;
    const destPath = path.join(UPLOAD_ROOT, key);

    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, input.buffer);

    return { url: `${publicEnv.appUrl}/uploads/dev/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(path.join(UPLOAD_ROOT, key));
    } catch {
      // Already gone — nothing to do.
    }
  }
}

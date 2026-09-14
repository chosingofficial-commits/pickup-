import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { serverEnv } from "@/lib/env/server";
import type { StorageAdapter, UploadInput } from "./types";

/**
 * S3-compatible object storage — works with AWS S3, Cloudflare R2, Wasabi,
 * Backblaze B2, MinIO, or Hostinger Object Storage by pointing S3_ENDPOINT
 * at the right host. This is the adapter Pick Up should use in production
 * so uploads survive redeploys/restarts.
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!serverEnv.S3_BUCKET || !serverEnv.S3_ACCESS_KEY_ID || !serverEnv.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 storage is not configured — set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
    }
    this.bucket = serverEnv.S3_BUCKET;
    this.client = new S3Client({
      region: serverEnv.S3_REGION || "auto",
      endpoint: serverEnv.S3_ENDPOINT,
      forcePathStyle: serverEnv.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: serverEnv.S3_ACCESS_KEY_ID, secretAccessKey: serverEnv.S3_SECRET_ACCESS_KEY },
    });
  }

  async upload(input: UploadInput, folder: string): Promise<{ url: string; key: string }> {
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
    const ext = path.extname(input.filename).slice(0, 10);
    const key = `${safeFolder}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    const base = serverEnv.S3_PUBLIC_URL_BASE?.replace(/\/$/, "") ?? `${serverEnv.S3_ENDPOINT?.replace(/\/$/, "")}/${this.bucket}`;
    return { url: `${base}/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

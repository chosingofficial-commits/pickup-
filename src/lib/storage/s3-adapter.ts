import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { serverEnv } from "@/lib/env/server";
import type { StorageAdapter, StorageOptions, UploadInput } from "./types";

/**
 * S3-compatible object storage — works with AWS S3, Cloudflare R2, Wasabi,
 * Backblaze B2, MinIO, or Hostinger Object Storage by pointing S3_ENDPOINT
 * at the right host. This is the adapter Pick Up should use in production
 * so uploads survive redeploys/restarts.
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private privateBucket?: string;

  constructor() {
    if (!serverEnv.S3_BUCKET || !serverEnv.S3_ACCESS_KEY_ID || !serverEnv.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 storage is not configured — set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
    }
    this.bucket = serverEnv.S3_BUCKET;
    this.privateBucket = serverEnv.S3_PRIVATE_BUCKET;
    this.client = new S3Client({
      region: serverEnv.S3_REGION || "auto",
      endpoint: serverEnv.S3_ENDPOINT,
      forcePathStyle: serverEnv.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: serverEnv.S3_ACCESS_KEY_ID, secretAccessKey: serverEnv.S3_SECRET_ACCESS_KEY },
    });
  }

  private resolveBucket(opts?: StorageOptions): string {
    if (!opts?.private) return this.bucket;
    if (!this.privateBucket) throw new Error("Private S3 storage is not configured — set S3_PRIVATE_BUCKET.");
    return this.privateBucket;
  }

  async upload(input: UploadInput, folder: string, opts?: StorageOptions): Promise<{ url: string; key: string }> {
    const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
    const ext = path.extname(input.filename).slice(0, 10);
    const key = `${safeFolder}/${randomUUID()}${ext}`;
    const bucket = this.resolveBucket(opts);

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    if (opts?.private) return { url: "", key };

    const base = serverEnv.S3_PUBLIC_URL_BASE?.replace(/\/$/, "") ?? `${serverEnv.S3_ENDPOINT?.replace(/\/$/, "")}/${bucket}`;
    return { url: `${base}/${key}`, key };
  }

  async delete(key: string, opts?: StorageOptions): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.resolveBucket(opts), Key: key }));
  }

  async getObject(key: string, opts?: StorageOptions): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.resolveBucket(opts), Key: key }));
      if (!result.Body) return null;
      const bytes = await result.Body.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: result.ContentType ?? "application/octet-stream" };
    } catch (err) {
      if (err instanceof Error && (err.name === "NoSuchKey" || err.name === "NotFound")) return null;
      throw err;
    }
  }
}

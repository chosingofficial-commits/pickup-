import "server-only";
import { serverEnv } from "@/lib/env/server";
import { LocalStorageAdapter } from "./local-adapter";
import { S3StorageAdapter } from "./s3-adapter";
import type { StorageAdapter } from "./types";

let cached: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;
  cached = serverEnv.STORAGE_PROVIDER === "s3" ? new S3StorageAdapter() : new LocalStorageAdapter();
  return cached;
}

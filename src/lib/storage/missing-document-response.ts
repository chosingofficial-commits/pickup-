import { NextResponse } from "next/server";

/**
 * A document key exists on the record but the file itself isn't retrievable
 * (deleted, a stale pre-S3-migration reference, or a storage error) — shown
 * when an admin opens a trade licence/NID document link, instead of a raw
 * JSON error response or an uncaught exception.
 */
export function missingDocumentResponse(subject: "vendor" | "rider" = "vendor"): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>File missing</title></head><body style="font-family: system-ui, sans-serif; padding: 2.5rem; color: #1f2937;"><h1 style="margin: 0 0 0.5rem; font-size: 1.25rem;">File missing</h1><p>This document could not be found in storage. Ask the ${subject} to re-upload it.</p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

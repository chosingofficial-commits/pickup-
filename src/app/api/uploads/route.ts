import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage/registry";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage/types";

const ALLOWED_FOLDERS = ["vendor-logos", "vendor-covers", "vendor-documents", "products", "menu-items", "ads", "hero"];
const PRIVATE_FOLDERS = ["vendor-documents"];

// The client-supplied `file.type` is just a request header the caller
// controls — for the private, sensitive-document folder we additionally
// check the actual file bytes so a renamed/relabeled SVG or HTML file can't
// slip past the MIME allowlist.
const MAGIC_BYTES: Record<string, (buf: Buffer) => boolean> = {
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

function matchesDeclaredType(buffer: Buffer, declaredType: string): boolean {
  const check = MAGIC_BYTES[declaredType];
  return check ? check(buffer) : false;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_FOLDERS.includes(folder)) return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WebP, or PDF." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8MB)." }, { status: 400 });
  }

  const isPrivate = PRIVATE_FOLDERS.includes(folder);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isPrivate && !matchesDeclaredType(buffer, file.type)) {
    return NextResponse.json({ error: "File content doesn't match its declared type." }, { status: 400 });
  }

  const adapter = getStorageAdapter();
  const result = await adapter.upload({ buffer, filename: file.name, contentType: file.type }, `${folder}/${user.id}`, { private: isPrivate });

  // Private uploads never get a usable `url` — only the caller's own record
  // of the key can ever be used to fetch the file back, through the
  // authenticated document route.
  return NextResponse.json(isPrivate ? { key: result.key } : { url: result.url, key: result.key });
}

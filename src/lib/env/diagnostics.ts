import "server-only";
import fs from "node:fs";

// The 10 vars the app has no safe guessable default for — see server.ts's
// comments on APP_URL/STORAGE_PROVIDER/S3_*/WEB_PUSH_SECRET for why every
// other var was trimmed off this list. Read straight off `process.env`
// (not the parsed serverEnv singleton) so this reflects exactly what THIS
// request's running process actually has, independent of any default a
// schema might apply.
const REQUIRED_VARS = [
  "DATABASE_URL",
  "DATABASE_POOL_URL",
  "AUTH_SECRET",
  "ENABLE_SUBDOMAIN_ROUTING",
  "NEXT_PUBLIC_APP_URL",
  "S3_ENDPOINT",
  "S3_PUBLIC_URL_BASE",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "WEB_PUSH_SECRET",
] as const;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/** Names only, never values. A var counts as missing whether it's unset or present-but-blank — see server.ts/public.ts's blankToUndefined for why blank can't be treated as "set". */
export function getMissingRequiredVars(): string[] {
  return REQUIRED_VARS.filter((name) => isBlank(process.env[name]));
}

/**
 * Names only, never contents. A stray `.env*` file sitting in the app's
 * working directory at runtime would be loaded by Next's own env loader
 * and could shadow — or outlive — whatever hPanel's panel is supposed to
 * be setting, which is exactly the kind of mismatch reported ("deleted
 * vars still show up, added ones don't"). This never found one in this
 * repo's own deploy path (nothing here writes one — see the Hostinger env
 * investigation), but it costs nothing to keep checking directly on the
 * live server.
 */
export function getEnvFilesOnServer(): string[] {
  try {
    return fs.readdirSync(process.cwd()).filter((name) => name.startsWith(".env"));
  } catch {
    return [];
  }
}

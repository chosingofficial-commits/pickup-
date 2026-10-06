// `next build` with `output: "standalone"` (next.config.mjs) does not copy
// `public/` or `.next/static/` into `.next/standalone/` — Next.js expects
// deployers to do that themselves. The Dockerfile already does this copy
// manually; this script does the same for a plain `npm run build`, so
// `node .next/standalone/server.js` (Hostinger's Node.js Web App "startup
// file" option) serves correctly without a manual step.
import { cpSync, existsSync } from "node:fs";

const copies = [
  ["public", ".next/standalone/public"],
  [".next/static", ".next/standalone/.next/static"],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  cpSync(from, to, { recursive: true, force: true });
  console.log(`Copied ${from} -> ${to}`);
}

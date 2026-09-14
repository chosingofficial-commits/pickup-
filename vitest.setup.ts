import "dotenv/config";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// The real "server-only" package throws outside Next's RSC bundler (which
// is the only place that resolves its safe "react-server" export) — stub it
// so server-only-guarded modules (db.ts, env/server.ts, etc.) can be
// imported directly in tests.
vi.mock("server-only", () => ({}));

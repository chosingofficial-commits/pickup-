import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "./client";

describe("urlBase64ToUint8Array", () => {
  it("decodes a URL-safe base64 VAPID key into the expected byte length", () => {
    // Real VAPID public keys are always 65 bytes (an uncompressed P-256 point).
    const sampleKey = "BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLuxazjK5UTuiHgDQWTCMC3VhNEphYsKjd6I_DALrCtxVXeKeu0dJI";
    const bytes = urlBase64ToUint8Array(sampleKey);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
  });

  it("handles URL-safe characters (- and _) that plain base64 would use +/ for", () => {
    const withUrlSafeChars = "AA-_AA";
    expect(() => urlBase64ToUint8Array(withUrlSafeChars)).not.toThrow();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();
const deleteMock = vi.fn();
const sendNotificationMock = vi.fn();
const setVapidDetailsMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: { pushSubscription: { findMany: findManyMock, delete: deleteMock } },
}));
vi.mock("web-push", () => ({
  default: { setVapidDetails: setVapidDetailsMock, sendNotification: sendNotificationMock },
}));
vi.mock("@/lib/env/server", () => ({
  serverEnv: { WEB_PUSH_SECRET: "A".repeat(43), VAPID_SUBJECT: "mailto:test@example.com" },
}));
vi.mock("@/lib/env/public", () => ({
  // 87 base64url chars decodes to exactly 65 bytes, matching a real VAPID
  // public key's length — see send.ts's checkKeyLength.
  publicEnv: { vapidPublicKey: "B".repeat(87) },
}));

// Imported after the mocks above so the module under test picks them up.
const { sendPushToUser } = await import("./send");

describe("sendPushToUser", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    deleteMock.mockReset();
    sendNotificationMock.mockReset();
    setVapidDetailsMock.mockReset();
  });

  const payload = { title: "New order", body: "Tk 100 · 1 item", url: "/vendor/orders/1", tag: "order:1" };

  it("never throws even when the subscription lookup itself rejects", async () => {
    // This is the exact bug found in production: only the per-subscription
    // webpush.sendNotification() call was guarded, not this query — a
    // transient DB error here used to propagate straight up through
    // placeOrderAction's own try/catch, making a successfully-placed order
    // look like a failed one to the customer.
    findManyMock.mockRejectedValue(new Error("connection reset"));
    await expect(sendPushToUser("user-1", payload)).resolves.toBeUndefined();
  });

  it("never throws when the push service itself rejects", async () => {
    findManyMock.mockResolvedValue([{ id: "sub-1", endpoint: "https://fcm.example/x", p256dh: "p", auth: "a" }]);
    sendNotificationMock.mockRejectedValue(new Error("network error"));
    await expect(sendPushToUser("user-1", payload)).resolves.toBeUndefined();
  });

  it("deletes a subscription the push service reports as gone (410)", async () => {
    findManyMock.mockResolvedValue([{ id: "sub-1", endpoint: "https://fcm.example/x", p256dh: "p", auth: "a" }]);
    const err = Object.assign(new Error("gone"), { statusCode: 410 });
    sendNotificationMock.mockRejectedValue(err);
    await sendPushToUser("user-1", payload);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "sub-1" } });
  });

  it("keeps a subscription after a non-410/404 failure (treated as possibly transient)", async () => {
    findManyMock.mockResolvedValue([{ id: "sub-1", endpoint: "https://fcm.example/x", p256dh: "p", auth: "a" }]);
    sendNotificationMock.mockRejectedValue(Object.assign(new Error("server error"), { statusCode: 500 }));
    await sendPushToUser("user-1", payload);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("does nothing when the user has no subscriptions", async () => {
    findManyMock.mockResolvedValue([]);
    await sendPushToUser("user-1", payload);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("only sends to subscriptions returned for this exact userId — never a client-supplied id", async () => {
    findManyMock.mockResolvedValue([{ id: "sub-1", endpoint: "https://fcm.example/x", p256dh: "p", auth: "a" }]);
    sendNotificationMock.mockResolvedValue({ statusCode: 201 });
    await sendPushToUser("user-42", payload);
    expect(findManyMock).toHaveBeenCalledWith({ where: { userId: "user-42" } });
  });
});

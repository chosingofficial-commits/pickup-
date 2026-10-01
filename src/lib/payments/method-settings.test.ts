import { describe, it, expect, vi } from "vitest";
import { isPaymentMethodEnabled, enabledPaymentMethods, paymentMethodSettingKey } from "./method-settings";

// BKASH is "live" in this mock, NAGAD is not — stands in for a real gateway
// whose credentials are (or aren't) actually configured.
vi.mock("./gateway-status", () => ({
  isGatewayLive: (provider: string) => provider === "COD" || provider === "BKASH",
}));

describe("isPaymentMethodEnabled", () => {
  it("is enabled only when BOTH the stored switch is on and the gateway is live", () => {
    expect(isPaymentMethodEnabled("BKASH", { [paymentMethodSettingKey("BKASH")]: "1" })).toBe(true);
  });

  // Regression guard: the admin switch alone must never be trusted — if
  // credentials are pulled (or the mode is flipped back to sandbox) after a
  // method was enabled, it must go back off automatically, not stay "on"
  // just because nobody remembered to also flip the switch.
  it("stays off when the switch is on but the gateway isn't live", () => {
    expect(isPaymentMethodEnabled("NAGAD", { [paymentMethodSettingKey("NAGAD")]: "1" })).toBe(false);
  });

  it("stays off when the gateway is live but the admin switch is off", () => {
    expect(isPaymentMethodEnabled("BKASH", { [paymentMethodSettingKey("BKASH")]: "0" })).toBe(false);
  });

  it("defaults to off when the setting key is missing entirely", () => {
    expect(isPaymentMethodEnabled("BKASH", {})).toBe(false);
  });
});

describe("enabledPaymentMethods", () => {
  it("returns only providers that are both switched on and live", () => {
    const settings = {
      [paymentMethodSettingKey("COD")]: "1",
      [paymentMethodSettingKey("BKASH")]: "1",
      [paymentMethodSettingKey("NAGAD")]: "1", // switched on but not live — must be excluded
    };
    expect(enabledPaymentMethods(settings)).toEqual(["COD", "BKASH"]);
  });

  it("returns an empty list when nothing is enabled", () => {
    expect(enabledPaymentMethods({})).toEqual([]);
  });
});

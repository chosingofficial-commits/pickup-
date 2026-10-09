// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { recordAdClickForVisitor, recordAdImpressionsForVisitor } from "./queries";
import { AD_DEDUPE_WINDOW_MS } from "./visitor-fingerprint";

/**
 * recordAdClick/recordAdImpressions derive the visitor hash from the real
 * request (next/headers), which isn't available outside a request scope —
 * these tests exercise the underlying *ForVisitor functions directly with an
 * explicit hash instead, same workaround as the request-scoped-session
 * tests elsewhere in this codebase.
 */
describe("ad click/impression deduplication", () => {
  let campaignIds: string[] = [];
  let advertiserIds: string[] = [];

  afterEach(async () => {
    if (campaignIds.length > 0) {
      await db.adClick.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await db.adImpression.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await db.adCampaign.deleteMany({ where: { id: { in: campaignIds } } });
    }
    if (advertiserIds.length > 0) {
      await db.advertisement.deleteMany({ where: { advertiserId: { in: advertiserIds } } });
      await db.advertiser.deleteMany({ where: { id: { in: advertiserIds } } });
    }
    campaignIds = [];
    advertiserIds = [];
  });

  async function createCampaign() {
    const placement = await db.adPlacement.findFirstOrThrow();
    const advertiser = await db.advertiser.create({
      data: { advertiserName: "Test Advertiser", businessName: "Test Business", phone: `+883${Date.now()}` },
    });
    advertiserIds.push(advertiser.id);
    const ad = await db.advertisement.create({
      data: {
        advertiserId: advertiser.id,
        title: "Test ad",
        description: "Test ad description",
        targetUrl: "https://example.com",
        preferredPlacementCode: placement.code,
        budget: 1000,
        paymentMethod: "COD",
      },
    });
    const campaign = await db.adCampaign.create({
      data: {
        advertisementId: ad.id,
        placementId: placement.id,
        status: "ACTIVE",
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
      },
    });
    campaignIds.push(campaign.id);
    return campaign.id;
  }

  it("a second click from the same visitor within the window is not counted again", async () => {
    const campaignId = await createCampaign();
    await recordAdClickForVisitor(campaignId, "visitor-a");
    await recordAdClickForVisitor(campaignId, "visitor-a");
    const count = await db.adClick.count({ where: { campaignId } });
    expect(count).toBe(1);
  });

  it("a click from a different visitor is counted separately", async () => {
    const campaignId = await createCampaign();
    await recordAdClickForVisitor(campaignId, "visitor-a");
    await recordAdClickForVisitor(campaignId, "visitor-b");
    const count = await db.adClick.count({ where: { campaignId } });
    expect(count).toBe(2);
  });

  it("a click from the same visitor outside the window is counted again", async () => {
    const campaignId = await createCampaign();
    await db.adClick.create({
      data: { campaignId, visitorHash: "visitor-a", occurredAt: new Date(Date.now() - AD_DEDUPE_WINDOW_MS - 60000) },
    });
    await recordAdClickForVisitor(campaignId, "visitor-a");
    const count = await db.adClick.count({ where: { campaignId } });
    expect(count).toBe(2);
  });

  it("repeated impressions of the same ads for one visitor only count once each", async () => {
    const campaignId = await createCampaign();
    await recordAdImpressionsForVisitor([campaignId], "visitor-a");
    await recordAdImpressionsForVisitor([campaignId], "visitor-a");
    await recordAdImpressionsForVisitor([campaignId], "visitor-a");
    const count = await db.adImpression.count({ where: { campaignId } });
    expect(count).toBe(1);
  });

  it("never stores a raw IP — only the opaque visitorHash string is persisted", async () => {
    const campaignId = await createCampaign();
    await recordAdClickForVisitor(campaignId, "visitor-a");
    const row = await db.adClick.findFirstOrThrow({ where: { campaignId } });
    expect(row.visitorHash).toBe("visitor-a");
    expect(Object.keys(row)).not.toContain("ip");
    expect(Object.keys(row)).not.toContain("ipAddress");
  });
});

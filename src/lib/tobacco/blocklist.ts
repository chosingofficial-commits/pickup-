/**
 * Products this marketplace never allows, under any category, tobacco
 * module state, or admin override — only plain cigarettes and smoking
 * accessories (lighters, ashtrays, rolling papers) can ever be listed.
 * Checked against both category names (admin-categories.ts) and product
 * name/description (vendor-products.ts) so a vendor can't route around it
 * by mis-categorizing one of these as something else.
 */
const BLOCKED_KEYWORDS = /e-?cigarette|\bvape\b|vaping|\be-?cig\b|heated tobacco|heat-not-burn|nicotine pouch|nicotine salt|\bjuul\b/i;

export function containsBlockedTobaccoProduct(text: string): boolean {
  return BLOCKED_KEYWORDS.test(text);
}

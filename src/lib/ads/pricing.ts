export type AdPricingTiers = { daily: number; weekly: number; monthly: number };

export type AdPriceEstimate = { total: number; months: number; weeks: number; days: number };

const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
// Defensive cap on the DP array size — no real campaign runs anywhere near
// this long, and it keeps a malformed/huge date range from allocating an
// unbounded array.
const MAX_DP_DAYS = 400;

/**
 * Cheapest combination of monthly/weekly/daily billing that covers exactly
 * `totalDays`, via dynamic programming rather than a greedy
 * months-then-weeks-then-days walk — greedy isn't guaranteed optimal if an
 * admin sets prices that don't scale neatly (e.g. a weekly rate that's
 * actually worse value than 7 daily rates). Used both for the live estimate
 * on /advertise and by admin when confirming a campaign's price, so they
 * can never disagree.
 */
export function cheapestAdPrice(totalDays: number, pricing: AdPricingTiers): AdPriceEstimate {
  if (totalDays <= 0) return { total: 0, months: 0, weeks: 0, days: 0 };

  if (totalDays > MAX_DP_DAYS) {
    return { total: pricing.daily * totalDays, months: 0, weeks: 0, days: totalDays };
  }

  const cost = new Array<number>(totalDays + 1).fill(Infinity);
  const step = new Array<number>(totalDays + 1).fill(0);
  cost[0] = 0;

  for (let i = 1; i <= totalDays; i++) {
    if (pricing.daily > 0 && cost[i - 1] + pricing.daily < cost[i]) {
      cost[i] = cost[i - 1] + pricing.daily;
      step[i] = 1;
    }
    if (pricing.weekly > 0 && i >= WEEK_DAYS && cost[i - WEEK_DAYS] + pricing.weekly < cost[i]) {
      cost[i] = cost[i - WEEK_DAYS] + pricing.weekly;
      step[i] = WEEK_DAYS;
    }
    if (pricing.monthly > 0 && i >= MONTH_DAYS && cost[i - MONTH_DAYS] + pricing.monthly < cost[i]) {
      cost[i] = cost[i - MONTH_DAYS] + pricing.monthly;
      step[i] = MONTH_DAYS;
    }
  }

  let i = totalDays;
  let months = 0;
  let weeks = 0;
  let days = 0;
  while (i > 0) {
    const s = step[i] || 1; // guards against an unreachable cell (e.g. daily price missing) looping forever
    if (s === MONTH_DAYS) months++;
    else if (s === WEEK_DAYS) weeks++;
    else days++;
    i -= s;
  }

  const total = Number.isFinite(cost[totalDays]) ? cost[totalDays] : pricing.daily * totalDays;
  return { total, months, weeks, days };
}

export function formatAdPriceBreakdown(estimate: AdPriceEstimate): string {
  const parts: string[] = [];
  if (estimate.months > 0) parts.push(`${estimate.months} month${estimate.months === 1 ? "" : "s"}`);
  if (estimate.weeks > 0) parts.push(`${estimate.weeks} week${estimate.weeks === 1 ? "" : "s"}`);
  if (estimate.days > 0) parts.push(`${estimate.days} day${estimate.days === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" + ") : "0 days";
}

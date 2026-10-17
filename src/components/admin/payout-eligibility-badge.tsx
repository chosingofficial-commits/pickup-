import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import type { PayoutEligibility } from "@/lib/admin/vendor-payouts";

/** Only meaningful for PENDING/APPROVED requests — PAID and REJECTED are history, not a live eligibility question. */
export function PayoutEligibilityBadge({ eligibility }: { eligibility: PayoutEligibility | null }) {
  if (!eligibility) return null;
  return eligibility.canBePaid ? (
    <Badge variant="success">Can be paid</Badge>
  ) : (
    <Badge variant="danger">Not enough balance: short by {formatBDT(eligibility.shortByTk)}</Badge>
  );
}

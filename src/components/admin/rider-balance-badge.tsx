import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { getRiderBalanceStatus } from "@/lib/rider/balance";

export function RiderBalanceBadge({ balancePoisha }: { balancePoisha: number }) {
  const status = getRiderBalanceStatus(balancePoisha);
  if (status === "paidUp") return <Badge variant="success">Paid up</Badge>;
  if (status === "owes") return <Badge variant="danger">Owes you {formatBDT(balancePoisha / 100)}</Badge>;
  return <Badge variant="warning">You owe {formatBDT(Math.abs(balancePoisha) / 100)}</Badge>;
}

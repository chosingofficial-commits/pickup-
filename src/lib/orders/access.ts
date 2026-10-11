/**
 * Who may view an order/order-group's confirmation or detail page — a
 * plain id match against the logged-in User, deliberately role-agnostic.
 * A VENDOR or RIDER account is still a User row with its own id, and can
 * place an order as a customer the same as anyone else (their vendor/rider
 * profile is a separate, optional relation on the same User) — this must
 * never require a CustomerProfile to exist or check `role`, only that the
 * order's customerId is this exact user's id.
 */
export function canViewOrderGroup(orderGroup: { customerId: string } | null | undefined, user: { id: string } | null | undefined): boolean {
  return !!orderGroup && !!user && orderGroup.customerId === user.id;
}

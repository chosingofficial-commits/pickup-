import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiderBalanceBadge } from "./rider-balance-badge";

describe("RiderBalanceBadge", () => {
  it("shows a green 'Paid up' badge for a zero balance", () => {
    render(<RiderBalanceBadge balancePoisha={0} />);
    expect(screen.getByText("Paid up")).toBeInTheDocument();
  });

  it("shows a red 'Owes you' badge with the formatted amount for a positive balance", () => {
    render(<RiderBalanceBadge balancePoisha={20625} />);
    expect(screen.getByText("Owes you Tk 206.25")).toBeInTheDocument();
  });

  it("shows an amber 'You owe' badge with the formatted amount for a negative balance", () => {
    render(<RiderBalanceBadge balancePoisha={-5000} />);
    expect(screen.getByText("You owe Tk 50")).toBeInTheDocument();
  });
});

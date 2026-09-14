import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders its label and responds to clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add to cart</Button>);

    const button = screen.getByRole("button", { name: "Add to cart" });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows a loading spinner and disables itself while isLoading", () => {
    render(<Button isLoading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("respects an explicit disabled prop", () => {
    render(<Button disabled>Checkout</Button>);
    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
  });
});

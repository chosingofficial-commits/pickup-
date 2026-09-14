import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldError, Input, Label } from "./input";

describe("FieldError", () => {
  it("renders a validation message with an alert role when present", () => {
    render(<FieldError>Enter a valid Bangladeshi mobile number</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid Bangladeshi mobile number");
  });

  it("renders nothing when there is no message", () => {
    const { container } = render(<FieldError>{undefined}</FieldError>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Input", () => {
  it("associates with its label and reflects an invalid state", () => {
    render(
      <>
        <Label htmlFor="phone">Mobile number</Label>
        <Input id="phone" aria-invalid aria-describedby="phone-error" />
        <FieldError>Enter a valid Bangladeshi mobile number</FieldError>
      </>,
    );

    const input = screen.getByLabelText("Mobile number");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

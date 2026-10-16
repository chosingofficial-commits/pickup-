import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "./login-form";

// Regression coverage for per-subdomain login pages: admin.pickupn.com must
// never show "Create an account" or a vendor/rider sign-up link (admin
// accounts are never self-registered), and each role subdomain's login page
// must point to its own sign-up flow, not the generic customer one.
describe("LoginForm", () => {
  it("shows the generic customer login with both sign-up links when no section is given", () => {
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: "Log in to Pick Up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register a shop or restaurant" })).toBeInTheDocument();
  });

  it("shows 'Vendor login' with a shop/restaurant sign-up link, no customer sign-up link", () => {
    render(<LoginForm section="vendor" />);
    expect(screen.getByRole("heading", { name: "Vendor login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register your shop or restaurant" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("shows 'Rider login' with a 'Become a rider' link, no customer sign-up link", () => {
    render(<LoginForm section="rider" />);
    expect(screen.getByRole("heading", { name: "Rider login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Become a rider" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("shows 'Admin login' with no sign-up links at all", () => {
    render(<LoginForm section="admin" />);
    expect(screen.getByRole("heading", { name: "Admin login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /register/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /become a rider/i })).not.toBeInTheDocument();
  });
});

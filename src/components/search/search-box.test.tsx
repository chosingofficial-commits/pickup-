import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "./search-box";

const replace = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/marketplace",
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe("SearchBox", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    replace.mockClear();
    currentSearch = "";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces typing before updating the URL", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBox placeholder="Search products" />);

    await user.type(screen.getByPlaceholderText("Search products"), "rice");
    expect(replace).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(350);
    expect(replace).toHaveBeenCalledWith("/marketplace?q=rice", { scroll: false });
  });

  it("resets pagination when a new search is made", async () => {
    currentSearch = "q=old&page=3&category=snacks";
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBox placeholder="Search products" />);

    const input = screen.getByPlaceholderText("Search products");
    await user.clear(input);
    await user.type(input, "chick");
    await vi.advanceTimersByTimeAsync(350);

    const calledWith = replace.mock.calls.at(-1)?.[0] as string;
    const params = new URLSearchParams(calledWith.split("?")[1]);
    expect(params.get("q")).toBe("chick");
    expect(params.get("page")).toBeNull();
    expect(params.get("category")).toBe("snacks");
  });

  it("submitting the form (Enter) searches immediately, bypassing the debounce", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBox placeholder="Search products" />);

    await user.type(screen.getByPlaceholderText("Search products"), "rice{Enter}");
    expect(replace).toHaveBeenCalledWith("/marketplace?q=rice", { scroll: false });
  });

  it("shows a clear button once text is entered, and clearing empties the query", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBox placeholder="Search products" />);

    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Search products"), "rice");
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Clear search"));
    expect(screen.getByPlaceholderText("Search products")).toHaveValue("");
    expect(replace).toHaveBeenCalledWith("/marketplace?", { scroll: false });
  });
});

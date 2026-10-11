import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyHoursPicker, type DayHours } from "./weekly-hours-picker";

// The exact production crash this guards against: a grocery vendor whose
// shop has no VendorWeeklyHours rows yet (every shop, until it sets real
// hours) renders /vendor/hours with `defaultHours={[]}` — not undefined.
describe("WeeklyHoursPicker — no hours yet (0 rows)", () => {
  it("renders without crashing and defaults to the 'same every day' editor", () => {
    render(<WeeklyHoursPicker defaultHours={[]} />);
    expect(screen.getByLabelText("Same hours every day")).toBeChecked();
    expect(screen.getByLabelText("Opens")).toHaveValue("10:00");
    expect(screen.getByLabelText("Closes")).toHaveValue("22:00");
  });

  it("still renders without crashing when switched to the per-day editor", async () => {
    render(<WeeklyHoursPicker defaultHours={[]} />);
    await userEvent.click(screen.getByLabelText("Same hours every day"));
    // All 7 days must render with a sane default, not throw on a missing row.
    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });
});

describe("WeeklyHoursPicker — only some days set", () => {
  // Realistically shouldn't happen (every write path upserts all 7 days or
  // none), but the picker must not crash on it regardless — it indexes by
  // dayOfWeek, so a missing day must fall back to a default row rather than
  // throwing on a null-dereference, the same bug class as the 0-rows case.
  const partialHoursNonUniform: DayHours[] = [
    { dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    { dayOfWeek: 3, opensAt: "14:00", closesAt: "22:00", isClosed: false },
  ];

  it("renders without crashing and fills in missing days with a default row", () => {
    render(<WeeklyHoursPicker defaultHours={partialHoursNonUniform} />);
    // The two present days have different hours, so it correctly starts in
    // the per-day editor rather than collapsing to "same every day".
    expect(screen.getByLabelText("Same hours every day")).not.toBeChecked();
    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });

  it("treats days that happen to share identical hours as uniform (same every day)", () => {
    const partialHoursUniform: DayHours[] = [
      { dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { dayOfWeek: 3, opensAt: "09:00", closesAt: "18:00", isClosed: false },
    ];
    render(<WeeklyHoursPicker defaultHours={partialHoursUniform} />);
    expect(screen.getByLabelText("Same hours every day")).toBeChecked();
    expect(screen.getByLabelText("Opens")).toHaveValue("09:00");
  });
});

describe("WeeklyHoursPicker — all 7 days set", () => {
  const fullHours: DayHours[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: "08:00",
    closesAt: "20:00",
    isClosed: false,
  }));

  it("detects the already-uniform schedule and starts in 'same every day' view", () => {
    render(<WeeklyHoursPicker defaultHours={fullHours} />);
    expect(screen.getByLabelText("Same hours every day")).toBeChecked();
    expect(screen.getByLabelText("Opens")).toHaveValue("08:00");
    expect(screen.getByLabelText("Closes")).toHaveValue("20:00");
  });

  it("starts in the per-day editor when hours genuinely differ by day", () => {
    const mixedHours = fullHours.map((h, i) => (i === 2 ? { ...h, opensAt: "11:00" } : h));
    render(<WeeklyHoursPicker defaultHours={mixedHours} />);
    expect(screen.getByLabelText("Same hours every day")).not.toBeChecked();
  });
});

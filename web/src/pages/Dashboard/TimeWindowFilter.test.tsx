import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeWindowFilter } from "./TimeWindowFilter";

function renderFilter(overrides: Partial<Parameters<typeof TimeWindowFilter>[0]> = {}) {
  const props = {
    preset: "today" as const,
    onPresetChange: vi.fn(),
    customStart: "",
    customEnd: "",
    onCustomChange: vi.fn(),
    live: true,
    onLiveChange: vi.fn(),
    ...overrides,
  };
  render(<TimeWindowFilter {...props} />);
  return props;
}

describe("TimeWindowFilter", () => {
  it("marks the active preset as pressed", () => {
    renderFilter({ preset: "week" });
    expect(screen.getByRole("button", { name: "Past 7 days" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onPresetChange when a preset button is clicked", async () => {
    const user = userEvent.setup();
    const props = renderFilter();

    await user.click(screen.getByRole("button", { name: "Past 30 days" }));
    expect(props.onPresetChange).toHaveBeenCalledWith("month");
  });

  it("only shows custom date inputs when preset is custom", () => {
    renderFilter({ preset: "today" });
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();

    renderFilter({ preset: "custom" });
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("calls onCustomChange with both dates when either input changes", async () => {
    const user = userEvent.setup();
    const props = renderFilter({ preset: "custom", customStart: "2026-01-01" });

    await user.type(screen.getByLabelText("To"), "2026-01-15");
    // Called once per keystroke; the important thing is customStart is
    // preserved alongside whatever customEnd is being typed.
    expect(props.onCustomChange).toHaveBeenCalledWith("2026-01-01", expect.any(String));
  });

  it("toggles live updates and reflects the label", async () => {
    const user = userEvent.setup();
    const props = renderFilter({ live: false });

    expect(screen.getByRole("checkbox", { name: /live updates/i })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: /live updates/i }));
    expect(props.onLiveChange).toHaveBeenCalledWith(true);
  });
});

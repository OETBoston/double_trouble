import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocationMethodPicker } from "./LocationMethodPicker";

describe("LocationMethodPicker", () => {
  it("renders all three location methods", () => {
    render(<LocationMethodPicker onChoose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /use my current location/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /drop a pin on the map/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search for an address/i })).toBeInTheDocument();
  });

  it.each([
    [/use my current location/i, "GPS"],
    [/drop a pin on the map/i, "MAP_PIN"],
    [/search for an address/i, "ADDRESS_SEARCH"],
  ] as const)("calls onChoose(%s) -> %s when that card is clicked", async (name, method) => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<LocationMethodPicker onChoose={onChoose} />);

    await user.click(screen.getByRole("button", { name }));

    expect(onChoose).toHaveBeenCalledWith(method);
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});

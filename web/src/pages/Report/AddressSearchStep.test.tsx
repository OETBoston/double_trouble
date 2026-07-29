import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forwardGeocode } from "../../lib/mapboxGeocoding";
import { AddressSearchStep } from "./AddressSearchStep";

vi.mock("../../lib/mapboxGeocoding", () => ({
  forwardGeocode: vi.fn(),
}));

const SUGGESTIONS = [
  { id: "1", placeName: "1 City Hall Square, Boston, MA", latitude: 42.36, longitude: -71.06 },
  { id: "2", placeName: "1 City Hall Avenue, Boston, MA", latitude: 42.361, longitude: -71.061 },
];

beforeEach(() => {
  vi.mocked(forwardGeocode).mockReset();
});

async function typeQuery(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("combobox"), text);
}

describe("AddressSearchStep", () => {
  it("does not query Mapbox until at least 3 characters are entered", async () => {
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={vi.fn()} onBack={vi.fn()} />);

    await typeQuery(user, "1");
    await typeQuery(user, "2");
    expect(forwardGeocode).not.toHaveBeenCalled();
  });

  it("queries Mapbox and renders suggestions once 3+ characters are entered", async () => {
    vi.mocked(forwardGeocode).mockResolvedValue(SUGGESTIONS);
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={vi.fn()} onBack={vi.fn()} />);

    await typeQuery(user, "1 City Hall");

    await waitFor(() => expect(forwardGeocode).toHaveBeenCalledWith("1 City Hall"));
    expect(await screen.findAllByRole("option")).toHaveLength(2);
  });

  it("selects a suggestion on click and resolves the location", async () => {
    vi.mocked(forwardGeocode).mockResolvedValue(SUGGESTIONS);
    const onResolved = vi.fn();
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={onResolved} onBack={vi.fn()} />);

    await typeQuery(user, "1 City Hall");
    const option = await screen.findByText("1 City Hall Square, Boston, MA");
    await user.click(option);

    expect(onResolved).toHaveBeenCalledWith({
      latitude: 42.36,
      longitude: -71.06,
      address: "1 City Hall Square, Boston, MA",
      method: "ADDRESS_SEARCH",
    });
  });

  it("navigates suggestions with arrow keys and selects with Enter", async () => {
    vi.mocked(forwardGeocode).mockResolvedValue(SUGGESTIONS);
    const onResolved = vi.fn();
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={onResolved} onBack={vi.fn()} />);

    await typeQuery(user, "1 City Hall");
    await screen.findAllByRole("option");

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // Two ArrowDowns from index -1 land on index 1 (wraps only past the end).
    expect(onResolved).toHaveBeenCalledWith({
      latitude: 42.361,
      longitude: -71.061,
      address: "1 City Hall Avenue, Boston, MA",
      method: "ADDRESS_SEARCH",
    });
  });

  it("clears suggestions on Escape", async () => {
    vi.mocked(forwardGeocode).mockResolvedValue(SUGGESTIONS);
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={vi.fn()} onBack={vi.fn()} />);

    await typeQuery(user, "1 City Hall");
    await screen.findAllByRole("option");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("shows an error message when the geocoding request fails", async () => {
    vi.mocked(forwardGeocode).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={vi.fn()} onBack={vi.fn()} />);

    await typeQuery(user, "1 City Hall");

    expect(
      await screen.findByText(/address lookup failed/i)
    ).toBeInTheDocument();
  });

  it('calls onBack when "Choose a different method" is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<AddressSearchStep onResolved={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /choose a different method/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

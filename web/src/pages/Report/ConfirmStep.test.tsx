import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmStep } from "./ConfirmStep";

const LOCATION_WITH_ADDRESS = {
  latitude: 42.3601,
  longitude: -71.0589,
  address: "1 City Hall Square, Boston, MA",
  method: "MAP_PIN" as const,
};

const LOCATION_WITHOUT_ADDRESS = {
  latitude: 42.3601,
  longitude: -71.0589,
  address: null,
  method: "GPS" as const,
};

describe("ConfirmStep", () => {
  it("shows the resolved address when one is available", () => {
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText("1 City Hall Square, Boston, MA")).toBeInTheDocument();
  });

  it("falls back to raw coordinates when there is no address", () => {
    render(
      <ConfirmStep
        location={LOCATION_WITHOUT_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText("42.36010, -71.05890")).toBeInTheDocument();
  });

  it("disables both buttons and shows a submitting label while submitting", () => {
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={true}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /change location method/i })).toBeDisabled();
  });

  it("shows an alert with the error message when submission fails", () => {
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error="We couldn't submit your report."
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't submit your report.");
  });

  it("calls onConfirm and onBack from their respective buttons", async () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onBack={onBack}
      />
    );

    await user.click(screen.getByRole("button", { name: /submit anonymously/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /change location method/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

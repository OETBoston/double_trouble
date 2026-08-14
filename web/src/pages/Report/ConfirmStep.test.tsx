import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvalidPhotoTypeError, PhotoTooLargeError, prepareImageForUpload } from "../../lib/imagePrep";
import { ConfirmStep } from "./ConfirmStep";

vi.mock("../../lib/imagePrep", async () => {
  const actual = await vi.importActual<typeof import("../../lib/imagePrep")>(
    "../../lib/imagePrep"
  );
  return { ...actual, prepareImageForUpload: vi.fn() };
});

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

  it("submits with every optional field left unset when nothing is filled in", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /submit anonymously/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      blockedType: undefined,
      blockedTypeOther: undefined,
      vehicleType: undefined,
      vehicleTypeOther: undefined,
      photo: undefined,
    });
  });

  it("collapses the blocked-type and vehicle-type questions by default", () => {
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // The radio options exist in the DOM (native <details> content isn't
    // removed, just hidden) but aren't visible until expanded.
    expect(screen.getByRole("radio", { name: /bike lane/i })).not.toBeVisible();
    expect(screen.getByRole("radio", { name: /commercial vehicle/i })).not.toBeVisible();
  });

  it("includes the picked blocked-type and vehicle-type in the submitted details", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByText(/what's being blocked/i, { selector: "summary" }));
    await user.click(screen.getByRole("radio", { name: /fire hydrant/i }));
    await user.click(screen.getByText(/type of vehicle/i, { selector: "summary" }));
    await user.click(screen.getByRole("radio", { name: /rideshare/i }));
    await user.click(screen.getByRole("button", { name: /submit anonymously/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ blockedType: "FIRE_HYDRANT", vehicleType: "RIDESHARE_DELIVERY" })
    );
  });

  it('reveals a free-text field when "Other" is picked and includes it in the submission', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByText(/what's being blocked/i, { selector: "summary" }));
    // Both disclosures have their own "Other" option; the blocked-type one
    // is the first in the DOM.
    await user.click(screen.getAllByRole("radio", { name: /^other$/i })[0]);
    await user.type(screen.getByLabelText(/describe what's blocked/i), "Loading zone");
    await user.click(screen.getByRole("button", { name: /submit anonymously/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ blockedType: "OTHER", blockedTypeOther: "Loading zone" })
    );
  });

  it("lets the user add a photo, preview it, and includes it in the submission", async () => {
    vi.mocked(prepareImageForUpload).mockResolvedValue("data:image/jpeg;base64,fakedata");
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={onConfirm}
        onBack={vi.fn()}
      />
    );

    const file = new File(["fake"], "car.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/choose a file/i), file);

    expect(await screen.findByAltText(/preview of the photo/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /submit anonymously/i }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ photo: "data:image/jpeg;base64,fakedata" })
    );
  });

  it("lets the user remove a photo after adding one", async () => {
    vi.mocked(prepareImageForUpload).mockResolvedValue("data:image/jpeg;base64,fakedata");
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const file = new File(["fake"], "car.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/choose a file/i), file);
    expect(await screen.findByAltText(/preview of the photo/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove photo/i }));
    expect(screen.queryByAltText(/preview of the photo/i)).not.toBeInTheDocument();
  });

  it("shows an inline error and skips the preview when the photo is rejected", async () => {
    vi.mocked(prepareImageForUpload).mockRejectedValue(new InvalidPhotoTypeError());
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // userEvent.upload filters files against the input's own accept="image/*"
    // before the change handler ever sees them, so this has to be an
    // image-typed file — the rejection under test comes from
    // prepareImageForUpload (mocked above), which real browsers can still
    // hit for a format they can't decode even though its MIME type is
    // image/*.
    const file = new File(["fake"], "photo.heic", { type: "image/heic" });
    await user.upload(screen.getByLabelText(/choose a file/i), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(/choose an image file/i);
    expect(screen.queryByAltText(/preview of the photo/i)).not.toBeInTheDocument();
  });

  it("shows a size-specific error when the photo is too large", async () => {
    vi.mocked(prepareImageForUpload).mockRejectedValue(new PhotoTooLargeError());
    const user = userEvent.setup();
    render(
      <ConfirmStep
        location={LOCATION_WITH_ADDRESS}
        submitting={false}
        error={null}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const file = new File(["fake"], "huge.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/choose a file/i), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
  });
});

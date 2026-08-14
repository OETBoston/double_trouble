import { describe, expect, it } from "vitest";
import { InvalidPhotoTypeError, PhotoTooLargeError, prepareImageForUpload } from "./imagePrep";

// jsdom has no real canvas/createImageBitmap support, so these exercise the
// validation guards and the FileReader fallback path rather than the actual
// resize — that part is trusted to browser behavior and covered by manual
// verification instead.
describe("prepareImageForUpload", () => {
  it("rejects a non-image file", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(prepareImageForUpload(file)).rejects.toBeInstanceOf(InvalidPhotoTypeError);
  });

  it("rejects a file over the 6MB cap", async () => {
    const huge = new Uint8Array(6 * 1024 * 1024 + 1);
    const file = new File([huge], "big.jpg", { type: "image/jpeg" });
    await expect(prepareImageForUpload(file)).rejects.toBeInstanceOf(PhotoTooLargeError);
  });

  it("resolves to a data URL for a valid image under the cap", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "photo.jpg", { type: "image/jpeg" });
    const result = await prepareImageForUpload(file);
    expect(result.startsWith("data:")).toBe(true);
  });
});

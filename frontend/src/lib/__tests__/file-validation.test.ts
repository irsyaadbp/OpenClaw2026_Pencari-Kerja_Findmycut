import { describe, it, expect } from "vitest";
import { validateFile } from "../file-validation";

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("validateFile", () => {
  it("accepts a valid JPEG file under 10 MB", () => {
    const file = createMockFile("photo.jpg", 5 * 1024 * 1024, "image/jpeg");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a valid PNG file under 10 MB", () => {
    const file = createMockFile("photo.png", 1024, "image/png");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a valid WebP file under 10 MB", () => {
    const file = createMockFile("photo.webp", 2 * 1024 * 1024, "image/webp");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a file exactly at 10 MB", () => {
    const file = createMockFile("photo.jpg", 10 * 1024 * 1024, "image/jpeg");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects a file exceeding 10 MB", () => {
    const file = createMockFile("large.jpg", 10 * 1024 * 1024 + 1, "image/jpeg");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("10 MB");
  });

  it("rejects an unsupported MIME type (GIF)", () => {
    const file = createMockFile("anim.gif", 1024, "image/gif");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported file format");
  });

  it("rejects an unsupported MIME type (PDF)", () => {
    const file = createMockFile("doc.pdf", 1024, "application/pdf");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported file format");
  });

  it("rejects an unsupported MIME type with valid size", () => {
    const file = createMockFile("video.mp4", 500, "video/mp4");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("JPEG, PNG, or WebP");
  });

  it("prioritizes type error over size error when both are invalid", () => {
    const file = createMockFile("big.gif", 20 * 1024 * 1024, "image/gif");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    // Type check happens first
    expect(result.error).toContain("Unsupported file format");
  });
});

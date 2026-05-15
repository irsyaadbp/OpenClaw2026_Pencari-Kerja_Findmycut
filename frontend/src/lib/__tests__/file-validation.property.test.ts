// Feature: frontend-api-integration, Property 2: File validation rejects invalid uploads
// **Validates: Requirements 5.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateFile } from "../file-validation";

const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function createMockFile(size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], "test-file", { type });
}

describe("Property 2: File validation rejects invalid uploads", () => {
  it("accepts files with valid MIME type and size <= 10 MB", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_MIME_TYPES),
        fc.integer({ min: 0, max: MAX_FILE_SIZE }),
        (mimeType, size) => {
          const file = createMockFile(size, mimeType);
          const result = validateFile(file);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects files with invalid MIME type regardless of size", () => {
    const invalidMimeArb = fc
      .string({ minLength: 1 })
      .filter((s) => !VALID_MIME_TYPES.includes(s));

    fc.assert(
      fc.property(
        invalidMimeArb,
        fc.integer({ min: 0, max: MAX_FILE_SIZE * 3 }),
        (mimeType, size) => {
          const file = createMockFile(size, mimeType);
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain("Unsupported file format");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects files exceeding 10 MB even with valid MIME type", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_MIME_TYPES),
        fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 5 }),
        (mimeType, size) => {
          const file = createMockFile(size, mimeType);
          const result = validateFile(file);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain("10 MB");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("for any random MIME type and size, accepts only valid JPEG/PNG/WebP under 10 MB", () => {
    const mimeArb = fc.oneof(
      fc.constantFrom(...VALID_MIME_TYPES),
      fc.string({ minLength: 0, maxLength: 50 })
    );

    fc.assert(
      fc.property(
        mimeArb,
        fc.integer({ min: 0, max: MAX_FILE_SIZE * 3 }),
        (mimeType, size) => {
          const file = createMockFile(size, mimeType);
          const result = validateFile(file);

          const isValidType = VALID_MIME_TYPES.includes(mimeType);
          const isValidSize = size <= MAX_FILE_SIZE;

          if (isValidType && isValidSize) {
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();

            if (!isValidType) {
              expect(result.error).toContain("Unsupported file format");
            } else {
              expect(result.error).toContain("10 MB");
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

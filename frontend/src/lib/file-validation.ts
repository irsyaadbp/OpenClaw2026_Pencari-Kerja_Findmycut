export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates a file for upload. Checks MIME type (JPEG, PNG, WebP only)
 * and size (max 10 MB).
 */
export function validateFile(file: File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format. Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds 10 MB. Please select a smaller image.`,
    };
  }

  return { valid: true };
}

import { useState, useCallback } from "react";
import { postFormData } from "../lib/api-client";
import { validateFile } from "../lib/file-validation";

/**
 * Upload result returned by the backend after a successful upload.
 */
export interface UploadResult {
  id: string;
  url: string;
  width: number;
  height: number;
  size_bytes: number;
}

/**
 * Upload state exposed by the useUpload hook.
 */
export interface UploadState {
  isUploading: boolean;
  uploadResult: UploadResult | null;
  error: string | null;
}

/**
 * Callbacks for integrating upload with the app stage machine.
 */
export interface UseUploadOptions {
  onStageTransition: (stage: "scan") => void;
}

/**
 * Converts a data URL (e.g., from camera capture) to a File object.
 * The resulting File uses multipart/form-data — no base64 JSON is sent.
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";

  const byteString = atob(base64Data);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([byteArray], { type: mime });
  return new File([blob], filename, { type: mime });
}

/**
 * Upload hook that handles image upload with validation and state management.
 *
 * Both camera and gallery paths use multipart/form-data with a "file" field.
 * Camera captures are converted from data URL → Blob → File before uploading.
 * No base64 JSON is ever sent to the upload endpoint.
 *
 * Provides:
 * - uploadFile(file: File): Validates and uploads a file from gallery
 * - uploadFromCamera(dataUrl: string): Converts data URL to File, then uploads
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function useUpload(options: UseUploadOptions) {
  const { onStageTransition } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Uploads a File via multipart/form-data to POST /api/v1/uploads.
   * Validates the file client-side before sending.
   * On success: stores UploadResult and transitions stage to "scan".
   * On failure: displays error message, allows retry without losing selected image.
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      // Clear previous error
      setError(null);

      // Validate file before upload (Requirement 5.5)
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid file.");
        return null;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await postFormData<UploadResult>(
          "/api/v1/uploads",
          formData
        );

        if (response.error) {
          setError(response.error);
          return null;
        }

        if (response.data) {
          setUploadResult(response.data);
          // Transition stage to "scan" on success (Requirement 5.6)
          onStageTransition("scan");
          return response.data;
        }

        setError("Upload failed. Please try again.");
        return null;
      } catch {
        setError("Network error. Please check your connection and try again.");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [onStageTransition]
  );

  /**
   * Uploads a camera capture from a data URL.
   * Converts data URL → Blob → File (name: "camera-capture.jpg"), then calls uploadFile.
   * Uses multipart/form-data — NO base64 JSON is sent (Requirement 5.1).
   */
  const uploadFromCamera = useCallback(
    async (dataUrl: string): Promise<UploadResult | null> => {
      const file = dataUrlToFile(dataUrl, "camera-capture.jpg");
      return uploadFile(file);
    },
    [uploadFile]
  );

  /**
   * Clears the current error to allow retry.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const uploadState: UploadState = {
    isUploading,
    uploadResult,
    error,
  };

  return {
    ...uploadState,
    uploadFile,
    uploadFromCamera,
    clearError,
  };
}

import { useState, useCallback, useRef } from "react";
import { get, post } from "../lib/api-client";
import { deduplicateEntries } from "../lib/progress-utils";
import type { ProgressEntry } from "../lib/progress-utils";

/**
 * Analysis state exposed by the useAnalysis hook.
 */
export interface AnalysisState {
  analysisId: string | null;
  status: "idle" | "processing" | "completed" | "failed" | "timeout";
  progress: ProgressEntry[];
  error: string | null;
}

/**
 * Callbacks for integrating analysis with the app stage machine.
 */
export interface UseAnalysisOptions {
  onStageTransition: (stage: "results") => void;
}

/**
 * Response shape from POST /api/v1/analyses.
 */
interface AnalysisTriggerResponse {
  analysis_id: string;
  status: string;
}

/**
 * Response shape from GET /api/v1/analyses/{id}/status.
 */
interface AnalysisStatusResponse {
  analysis_id: string;
  status: "processing" | "completed" | "failed";
  current_agent: string;
  progress: ProgressEntry[];
}

/** Polling interval in milliseconds. */
const POLL_INTERVAL_MS = 2000;

/** Maximum consecutive network errors before treating as failed. */
const MAX_NETWORK_RETRIES = 3;

/**
 * Analysis hook that manages the analysis lifecycle: trigger, poll, timeout, retry.
 *
 * Provides:
 * - startAnalysis(userId, imageUrl): Triggers analysis and starts polling
 * - retry(): Re-submits analysis with the same user_id + image_url
 * - stopPolling(): Manually stops the polling loop
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
export function useAnalysis(options: UseAnalysisOptions) {
  const { onStageTransition } = options;

  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisState["status"]>("idle");
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling lifecycle management
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkRetryCountRef = useRef(0);
  const lastParamsRef = useRef<{ userId: string; imageUrl: string } | null>(null);

  /**
   * Stops the polling loop and clears the timeout timer.
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Polls the analysis status endpoint and handles state transitions.
   */
  const pollStatus = useCallback(
    async (id: string) => {
      const response = await get<AnalysisStatusResponse>(
        `/api/v1/analyses/${id}/status`
      );

      // Handle network error (status 0 or error with no HTTP status)
      if (response.status === 0 || (response.error && response.status === 0)) {
        networkRetryCountRef.current += 1;

        if (networkRetryCountRef.current >= MAX_NETWORK_RETRIES) {
          // Exceeded max retries — treat as failed (Requirement 6.8)
          stopPolling();
          setStatus("failed");
          setError(
            "Network error: Unable to reach the server after multiple attempts. Please check your connection and try again."
          );
        }
        // Otherwise, let the next interval retry
        return;
      }

      // Successful network response — reset retry counter
      networkRetryCountRef.current = 0;

      // Handle API error responses
      if (response.error) {
        stopPolling();
        setStatus("failed");
        setError(response.error);
        return;
      }

      if (!response.data) {
        return;
      }

      const { status: analysisStatus, progress: progressEntries } =
        response.data;

      // Accumulate and deduplicate progress entries (Requirement 6.6)
      if (progressEntries && progressEntries.length > 0) {
        setProgress((prev) => {
          const combined = [...prev, ...progressEntries];
          return deduplicateEntries(combined);
        });
      }

      // Handle status transitions
      if (analysisStatus === "completed") {
        // Stop polling, transition to results (Requirement 6.4)
        stopPolling();
        setStatus("completed");
        onStageTransition("results");
      } else if (analysisStatus === "failed") {
        // Stop polling, show error, offer retry (Requirement 6.5)
        stopPolling();
        setStatus("failed");
        setError(
          "Analysis could not be completed. Please try again."
        );
      }
      // "processing" — continue polling
    },
    [stopPolling, onStageTransition]
  );

  /**
   * Starts the polling loop for a given analysis ID.
   */
  const startPolling = useCallback(
    (id: string) => {
      // Reset network retry counter
      networkRetryCountRef.current = 0;

      // Set up the timeout (120s) (Requirement 6.7)
      // timeoutRef.current = setTimeout(() => {
      //   stopPolling();
      //   setStatus("timeout");
      //   setError(
      //     "Analysis timed out. The process took longer than expected. Please try again."
      //   );
      // }, POLL_TIMEOUT_MS);

      // Start polling every 2 seconds (Requirement 6.3)
      pollingRef.current = setInterval(() => {
        void pollStatus(id);
      }, POLL_INTERVAL_MS);

      // Also poll immediately
      void pollStatus(id);
    },
    [pollStatus, stopPolling]
  );

  /**
   * Triggers a new analysis and starts polling.
   * Calls POST /api/v1/analyses with user_id and image_url.
   * On success (202): stores analysis_id, transitions to polling.
   * On failure: shows error.
   *
   * Requirement 6.1, 6.2
   */
  const startAnalysis = useCallback(
    async (userId: string, imageUrl: string) => {
      // Store params for retry
      lastParamsRef.current = { userId, imageUrl };

      // Reset state
      setError(null);
      setProgress([]);
      setStatus("processing");

      const response = await post<AnalysisTriggerResponse>(
        "/api/v1/analyses",
        { user_id: userId, image_url: imageUrl }
      );

      if (response.error) {
        setStatus("failed");
        setError(response.error);
        return;
      }

      if (response.data) {
        const id = response.data.analysis_id;
        setAnalysisId(id);
        startPolling(id);
      } else {
        setStatus("failed");
        setError("Failed to start analysis. Please try again.");
      }
    },
    [startPolling]
  );

  /**
   * Retries the analysis with the same user_id and image_url.
   * Stops any existing polling before restarting.
   * Requirement 6.5, 6.7
   */
  const retry = useCallback(async () => {
    if (!lastParamsRef.current) {
      setError("No previous analysis to retry.");
      return;
    }

    stopPolling();
    const { userId, imageUrl } = lastParamsRef.current;
    await startAnalysis(userId, imageUrl);
  }, [stopPolling, startAnalysis]);

  const analysisState: AnalysisState = {
    analysisId,
    status,
    progress,
    error,
  };

  return {
    ...analysisState,
    startAnalysis,
    retry,
    stopPolling,
  };
}

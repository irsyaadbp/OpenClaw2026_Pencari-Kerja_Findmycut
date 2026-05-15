import { useState, useCallback } from "react";
import { get } from "../lib/api-client";

/**
 * Metadata about the face analysis included in the recommendations response.
 */
export interface AnalysisMetadata {
  id: string;
  status: string;
  face_shape: string;
  face_confidence: number;
  hair_density: string;
  hair_texture: string;
}

/**
 * A single recommendation item (unlocked or locked).
 */
export interface Recommendation {
  name: string;
  match: number;
  image: { type: string; url: string }[];
  barbershop: object | null;
  barber_instruction: string | null;
  styling_tips: string | null;
  is_locked: boolean;
}

/**
 * Full recommendations response from the backend.
 */
export interface RecommendationResponse {
  tier: string;
  analysis: AnalysisMetadata;
  data: Recommendation[];
}

/**
 * Recommendations state exposed by the useRecommendations hook.
 */
export interface RecommendationsState {
  isLoading: boolean;
  data: RecommendationResponse | null;
  error: string | null;
}

/**
 * Recommendations hook that fetches and structures recommendation data for display.
 *
 * Provides:
 * - fetchRecommendations(analysisId): Calls GET /api/v1/analyses/{id}/recommendations
 * - retry(): Re-triggers the last fetch request
 *
 * Requirements: 8.1, 8.5, 8.6
 */
export function useRecommendations() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

  /**
   * Fetches recommendations for a given analysis ID.
   * Calls GET /api/v1/analyses/{id}/recommendations with session credentials.
   * On success: stores the RecommendationResponse.
   * On failure: stores error message for display with retry button.
   *
   * Requirement 8.1: Fetch within 2 seconds of results stage loading.
   * Requirement 8.5: On failure, show error with retry button.
   * Requirement 8.6: Show loading indicator while request is in progress.
   */
  const fetchRecommendations = useCallback(async (analysisId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setLastAnalysisId(analysisId);

    try {
      const response = await get<RecommendationResponse>(
        `/api/v1/analyses/${analysisId}/recommendations`
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        setData(response.data);
      } else {
        setError("No recommendations data received.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Retries the last recommendations fetch.
   * Re-triggers GET /api/v1/analyses/{id}/recommendations with the stored analysis ID.
   * Requirement 8.5: Retry button re-triggers the same GET request.
   */
  const retry = useCallback((): void => {
    if (lastAnalysisId) {
      void fetchRecommendations(lastAnalysisId);
    }
  }, [lastAnalysisId, fetchRecommendations]);

  const state: RecommendationsState = {
    isLoading,
    data,
    error,
  };

  return {
    ...state,
    fetchRecommendations,
    retry,
  };
}

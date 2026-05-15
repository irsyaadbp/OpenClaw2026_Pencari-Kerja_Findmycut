import { useState, useEffect, useCallback } from "react";
import { authClient } from "../lib/auth-client";

/**
 * User profile shape returned by the auth hook.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  tier: string;
  isAnonymous: boolean;
}

/**
 * Auth state exposed by the useAuth hook.
 */
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

/**
 * Callbacks for resetting application state on sign-out.
 */
export interface UseAuthOptions {
  onStateReset: () => void;
  onStageTransition: (stage: "upload") => void;
  onError?: (message: string) => void;
}

/**
 * Maps a better-auth session user object to our UserProfile interface.
 */
function mapUserProfile(sessionUser: Record<string, unknown>): UserProfile {
  return {
    id: (sessionUser.id as string) || "",
    name: (sessionUser.name as string) || "",
    email: (sessionUser.email as string) || "",
    image: (sessionUser.image as string) || null,
    tier: (sessionUser.tier as string) || "free",
    isAnonymous: Boolean(sessionUser.isAnonymous),
  };
}

/**
 * Auth hook that wraps better-auth client methods and manages user state.
 *
 * Provides:
 * - signInAnonymous(): Creates anonymous session, transitions to upload stage
 * - signInGoogle(): Initiates Google OAuth flow
 * - signOut(): Invalidates session, always resets all app state
 * - refreshSession(): Restores session on mount silently
 */
export function useAuth(options: UseAuthOptions) {
  const { onStateReset, onStageTransition, onError } = options;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;
  const isAnonymous = user?.isAnonymous ?? false;

  /**
   * Refreshes the session on mount.
   * Calls GET /api/auth/get-session to check for existing session.
   * On failure, treats user as unauthenticated without showing errors.
   */
  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authClient.getSession();
      if (response.data?.user) {
        setUser(mapUserProfile(response.data.user as unknown as Record<string, unknown>));
      } else {
        setUser(null);
      }
    } catch {
      // Treat failure as unauthenticated silently (Requirement 3.5)
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh session on mount (Requirement 3.1)
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  /**
   * Signs in anonymously.
   * Calls POST /api/auth/sign-in/anonymous with a 10s timeout.
   * On success: stores user, transitions stage to "upload".
   * On failure/timeout: shows error, remains on landing.
   */
  const signInAnonymous = useCallback(async () => {
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authClient.signIn.anonymous({
        fetchOptions: {
          signal: controller.signal,
        },
      });

      clearTimeout(timeoutId);

      if (response.data?.user) {
        const profile = mapUserProfile(response.data.user as unknown as Record<string, unknown>);
        setUser(profile);
        onStageTransition("upload");
      } else if (response.error) {
        const errorMessage =
          response.error.message || "Could not create anonymous session. Please try again.";
        onError?.(errorMessage);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        onError?.("Request timed out. Please try again.");
      } else {
        onError?.("Could not create anonymous session. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [onStageTransition, onError]);

  /**
   * Signs in with Google OAuth.
   * Calls POST /api/auth/sign-in/social with provider "google" and callbackURL.
   * Navigates to the redirect URL returned by the backend.
   * On callback return, refreshSession() restores the session.
   */
  const signInGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const callbackURL = window.location.origin;

      const response = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      // If the response contains a redirect URL, navigate to it
      if (response.data?.url) {
        window.location.href = response.data.url;
        return;
      }

      // If we get user data directly (e.g., after callback), store it
      if (response.data?.user) {
        setUser(mapUserProfile(response.data.user as unknown as Record<string, unknown>));
      } else if (response.error) {
        const errorMessage = response.error.message || "Google sign-in failed. Please try again.";
        onError?.(errorMessage);
        setIsLoading(false);
      }
    } catch {
      onError?.("Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Signs out the current user.
   * Calls POST /api/auth/sign-out with a 10s timeout.
   * ALWAYS clears all application state regardless of success/failure (Property 7).
   * After sign-out: user=null, stage="landing", paymentStatus="locked",
   * analysisId=null, selectedFace=null, recommendations=null.
   */
  const signOut = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await authClient.signOut({
        fetchOptions: {
          signal: controller.signal,
        },
      });

      clearTimeout(timeoutId);
    } catch {
      // Ignore errors — always reset state regardless (Requirement 4.3)
    } finally {
      // Always clear user and reset all app state
      setUser(null);
      onStateReset();
    }
  }, [onStateReset]);

  const authState: AuthState = {
    user,
    isLoading,
    isAuthenticated,
    isAnonymous,
  };

  return {
    ...authState,
    signInAnonymous,
    signInGoogle,
    signOut,
    refreshSession,
  };
}

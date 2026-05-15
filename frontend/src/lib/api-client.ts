/**
 * Centralized API client for FindMyCut frontend.
 * Handles base URL configuration, credentials, typed responses,
 * and session expiry on 401 from /api/v1/* endpoints.
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

interface ApiClientConfig {
  baseUrl: string;
}

const config: ApiClientConfig = {
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
};

/**
 * Session expiry handler — called when a 401 is received from /api/v1/* paths.
 * Clears user state and redirects to sign-in.
 */
function handleSessionExpiry(): void {
  // Clear any stored user state from localStorage/sessionStorage
  try {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  } catch {
    // Storage access may fail in some contexts; ignore
  }

  // Redirect to sign-in (landing page)
  window.location.href = "/";
}

/**
 * Checks if a path matches /api/v1/* and the response is 401,
 * triggering session expiry if so.
 */
function checkSessionExpiry(path: string, status: number): void {
  if (status === 401 && path.startsWith("/api/v1/")) {
    handleSessionExpiry();
  }
}

/**
 * Parses a fetch Response into a typed ApiResponse.
 */
async function parseResponse<T>(
  response: Response,
  path: string
): Promise<ApiResponse<T>> {
  const status = response.status;

  checkSessionExpiry(path, status);

  if (!response.ok) {
    let error = `Request failed with status ${status}`;
    try {
      const body = await response.json();
      if (body.message) {
        error = body.message;
      } else if (body.error) {
        error = body.error;
      }
    } catch {
      // Response body is not JSON; use default error message
    }
    return { data: null, error, status };
  }

  try {
    const data = (await response.json()) as T;
    return { data, error: null, status };
  } catch {
    // Successful response with no JSON body (e.g., 204)
    return { data: null, error: null, status };
  }
}

/**
 * Makes a GET request to the given path.
 */
export async function get<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    return parseResponse<T>(response, path);
  } catch {
    return { data: null, error: "Network error", status: 0 };
  }
}

/**
 * Makes a POST request with a JSON body to the given path.
 */
export async function post<T>(
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response, path);
  } catch {
    return { data: null, error: "Network error", status: 0 };
  }
}

/**
 * Makes a POST request with FormData (multipart/form-data) to the given path.
 * Does NOT set Content-Type header — the browser sets it with the boundary.
 */
export async function postFormData<T>(
  path: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });
    return parseResponse<T>(response, path);
  } catch {
    return { data: null, error: "Network error", status: 0 };
  }
}

/**
 * Exported for testing purposes — allows overriding the session expiry handler.
 */
export const apiClient = { get, post, postFormData };

/**
 * Exported for testing — exposes internals needed by property tests.
 */
export const _internals = {
  get config() {
    return config;
  },
  handleSessionExpiry,
  checkSessionExpiry,
};

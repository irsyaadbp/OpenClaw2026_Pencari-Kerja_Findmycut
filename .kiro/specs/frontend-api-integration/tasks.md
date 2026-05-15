# Implementation Plan: Frontend API Integration

## Overview

This plan integrates the FindMyCut React 19 frontend with the Hono backend API for the Free Tier flow. It replaces hardcoded data and mock state with real API calls, session management via better-auth, polling for AI analysis progress, and a Progress Feed UI. All uploads use multipart/form-data exclusively (both camera capture and gallery selection convert to a File object).

## Tasks

- [x] 1. Set up API client and utility modules
  - [x] 1.1 Create the API client module (`src/lib/api-client.ts`)
    - Implement a fetch wrapper with `baseUrl` from `VITE_API_URL` (fallback `http://localhost:3000`)
    - All requests include `credentials: "include"` for cookie-based auth
    - Implement `get<T>(path)`, `post<T>(path, body)`, and `postFormData<T>(path, formData)` methods
    - Return typed `ApiResponse<T>` with `data`, `error`, and `status` fields
    - On 401 from `/api/v1/*` paths, trigger session expiry (clear user state, redirect to sign-in)
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [x] 1.2 Create file validation utility (`src/lib/file-validation.ts`)
    - Implement `validateFile(file: File)` that checks MIME type (JPEG, PNG, WebP only) and size (max 10 MB)
    - Return `{ valid: boolean; error?: string }` with specific error messages for type vs size violations
    - _Requirements: 5.5_

  - [x] 1.3 Create display utility functions (`src/lib/display-utils.ts`)
    - Implement `truncateName(name: string, maxLength: number)` — truncate at 20 chars with ellipsis "…"
    - Implement `getStepIcon(step: string)` — map step values to icon/color: "complete"→green ✓, "error"/"skip"→amber !, "tool"/"tool_call"/"tool_result"→blue ↻, "start"/"thinking"→spinner, unknown→default
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 9.1_

  - [x] 1.4 Create progress entry utilities (`src/lib/progress-utils.ts`)
    - Implement `deduplicateEntries(entries: ProgressEntry[])` — deduplicate by (timestamp, agent) pair
    - Implement `sortEntriesChronologically(entries: ProgressEntry[])` — sort by timestamp ascending
    - _Requirements: 7.2, 7.8_

- [x] 2. Implement authentication hooks and session management
  - [x] 2.1 Create the auth hook (`src/hooks/useAuth.ts`)
    - Expose `AuthState`: `user`, `isLoading`, `isAuthenticated`, `isAnonymous`
    - Implement `signInAnonymous()` — calls `POST /api/auth/sign-in/anonymous`, shows loading, disables control, transitions stage to "upload" on success, shows error on failure/timeout (10s)
    - Implement `signInGoogle()` — calls `POST /api/auth/sign-in/social` with provider "google" and callbackURL, navigates to redirect URL, retrieves session on callback
    - Implement `signOut()` — calls `POST /api/auth/sign-out` (10s timeout), always clears user/stage/payment/analysis/selectedFace/recommendations regardless of success/failure
    - Implement `refreshSession()` — calls `GET /api/auth/get-session` on mount, restores user state silently, treats failure as unauthenticated without error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

  - [x] 2.2 Write property test for logout state reset
    - **Property 7: Logout always resets to initial state**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 2.3 Write unit tests for useAuth hook
    - Test anonymous sign-in success/failure flows
    - Test Google OAuth flow
    - Test session restoration on mount
    - Test sign-out clears all state regardless of API response
    - _Requirements: 1.1–1.5, 2.1–2.7, 3.1–3.6, 4.1–4.3_

- [x] 3. Implement upload hook (multipart/form-data only)
  - [x] 3.1 Create the upload hook (`src/hooks/useUpload.ts`)
    - Expose `UploadState`: `isUploading`, `uploadResult`, `error`
    - Implement `uploadFile(file: File)` — wraps file in FormData with field name "file", sends via `postFormData` to `POST /api/v1/uploads`
    - Implement `uploadFromCamera(dataUrl: string)` — converts data URL to a File object (Blob → File with name "camera-capture.jpg"), then calls `uploadFile`
    - Both camera and gallery paths MUST use multipart/form-data with "file" field — NO base64 JSON
    - On success, store `UploadResult` (id, url, width, height, size_bytes) and transition stage to "scan"
    - On failure, display error message and allow retry without losing selected image
    - Validate file before upload using `validateFile()` — reject invalid files client-side
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.2 Write property test for file validation
    - **Property 2: File validation rejects invalid uploads**
    - **Validates: Requirements 5.5**

  - [ ]* 3.3 Write unit tests for useUpload hook
    - Test camera data URL → File conversion → FormData upload
    - Test gallery File → FormData upload
    - Test validation rejection for invalid MIME types and oversized files
    - Test error handling and retry preservation
    - _Requirements: 5.1–5.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement analysis polling and progress feed
  - [x] 5.1 Create the analysis hook (`src/hooks/useAnalysis.ts`)
    - Expose `AnalysisState`: `analysisId`, `status`, `progress`, `error`
    - Implement `startAnalysis(userId, imageUrl)` — calls `POST /api/v1/analyses`, stores analysis_id
    - Implement polling loop: `GET /api/v1/analyses/{id}/status` every 2 seconds
    - On "completed" → stop polling, transition to "results" stage
    - On "failed" → stop polling, show error, offer retry with same user_id + image_url
    - On timeout (120s) → stop polling, show timeout error, offer retry
    - On network error during poll → retry up to 3 consecutive times before treating as failed
    - Accumulate progress entries from status response, deduplicate by (timestamp, agent)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 5.2 Create the ProgressFeed component (`src/components/ProgressFeed.tsx`)
    - Render progress entries below scan animation
    - Container: max-height 300px, overflow-y auto
    - Each entry shows status icon (from `getStepIcon`) + message text
    - Auto-scroll to latest entry within 200ms of new entry
    - Display entries in chronological order (oldest top, newest bottom)
    - Empty state: show container with no entries and no error
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]* 5.3 Write property tests for progress utilities
    - **Property 3: Progress entry deduplication**
    - **Property 4: Progress entries maintain chronological order**
    - **Validates: Requirements 7.2, 6.6, 7.8**

  - [ ]* 5.4 Write property test for step-to-icon mapping
    - **Property 5: Step-to-icon mapping is total and deterministic**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6**

- [x] 6. Implement recommendations display
  - [x] 6.1 Create the recommendations hook (`src/hooks/useRecommendations.ts`)
    - Expose `RecommendationsState`: `isLoading`, `data`, `error`
    - Implement `fetchRecommendations(analysisId)` — calls `GET /api/v1/analyses/{id}/recommendations`
    - Fetch within 2 seconds of results stage loading
    - On failure, show error with retry button
    - _Requirements: 8.1, 8.5, 8.6_

  - [x] 6.2 Update results stage UI to use real recommendation data
    - Display first unlocked recommendation: style name, match %, front-view image, barber instructions, styling tips
    - Display locked recommendations: blurred imagery, lock icon overlay, "Locked Style" label, hide match/details
    - Display face analysis metadata (face_shape, face_confidence, hair_density, hair_texture) in results header
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ]* 6.3 Write property tests for recommendation display logic
    - **Property 10: Locked recommendations hide sensitive details**
    - **Property 11: Unlocked recommendations display all required fields**
    - **Validates: Requirements 8.2, 8.3**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire components together and integrate into App
  - [x] 8.1 Update App.tsx to use real auth, upload, analysis, and recommendations hooks
    - Replace hardcoded user state with `useAuth` hook
    - Replace mock upload flow with `useUpload` hook (camera → File → FormData, gallery → File → FormData)
    - Replace mock scan timeout with `useAnalysis` hook (real polling)
    - Replace hardcoded PREVIEWS with `useRecommendations` hook data
    - Wire stage transitions to API responses instead of timeouts
    - _Requirements: 1.4, 5.6, 6.2, 6.4_

  - [x] 8.2 Update header navigation to display real user state
    - Google OAuth session: show profile image (24×24px circular) + name (truncated 20 chars with ellipsis)
    - Anonymous session: show "Guest" text indicator
    - Unauthenticated: show Google login button with icon and "Google" label
    - Profile image load failure: show fallback placeholder icon
    - Logout: confirm prompt → call signOut → reset all state
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 4.1, 4.2, 4.3_

  - [x] 8.3 Integrate ProgressFeed into scan stage
    - Render ProgressFeed below the scan animation image
    - Pass progress entries from useAnalysis hook
    - _Requirements: 7.1_

  - [ ]* 8.4 Write property test for stage machine transitions
    - **Property 1: Stage machine transition correctness**
    - **Validates: Requirements 1.4, 5.6, 6.2, 6.4**

  - [ ]* 8.5 Write property tests for API client and display
    - **Property 6: User name display truncation**
    - **Property 8: API client always includes credentials**
    - **Property 9: 401 response triggers session expiry**
    - **Validates: Requirements 2.4, 9.1, 3.4, 10.2, 10.4, 10.5**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- **IMPORTANT**: All uploads (camera AND gallery) use multipart/form-data with a "file" field. Camera captures are converted from data URL → Blob → File before uploading. No base64 JSON is ever sent to the upload endpoint.
- The frontend uses TypeScript with React 19, Vite 8, and better-auth for session management
- Testing uses Vitest + fast-check for property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "5.2", "6.1"] },
    { "id": 4, "tasks": ["5.3", "5.4", "6.2"] },
    { "id": 5, "tasks": ["6.3"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4", "8.5"] }
  ]
}
```

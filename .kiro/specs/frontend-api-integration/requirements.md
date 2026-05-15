# Requirements Document

## Introduction

This feature integrates the FindMyCut React frontend with the backend API for the **Free Tier only**. It covers two distinct user flows: (1) Anonymous Flow where users can try the service without logging in, and (2) Login Flow where users authenticate via Google OAuth and have their session persisted. Both flows culminate in uploading a selfie, triggering AI analysis, polling for progress, and displaying 1 unlocked recommendation with the rest locked. A key UX element is the **analysis progress feed** — a step-by-step log displayed below the scanning animation showing real-time agent progress with status indicators (checkmarks, warnings, retries). The current frontend uses hardcoded data and mock state — this integration replaces that with real API calls and session management via better-auth.

## Glossary

- **Frontend**: The FindMyCut React 19 + Vite 8 single-page application
- **Backend_API**: The FindMyCut Hono-based REST API server running on localhost:3000
- **Auth_Client**: The better-auth React client configured in `src/lib/auth-client.ts`
- **Session**: A better-auth session object containing user ID, token, and expiry managed via cookies
- **Anonymous_Session**: A session created without credentials via `POST /api/auth/sign-in/anonymous`
- **Google_OAuth_Session**: A session created via Google OAuth social login flow
- **Analysis_Pipeline**: The backend AI multi-agent system that processes a selfie and produces recommendations
- **Progress_Feed**: A vertical list of status messages displayed below the scan animation during analysis, showing each agent step with status icons
- **Progress_Entry**: A single line in the Progress_Feed consisting of a status icon and a descriptive message
- **Recommendation**: A hairstyle suggestion returned by the backend, either unlocked (visible) or locked (blurred)
- **Stage_Machine**: The frontend state machine controlling UI transitions (landing → upload → scan → results)
- **Free_Tier**: The default user tier allowing 1 unlocked recommendation per analysis

## Requirements

### Requirement 1: Anonymous Session Creation

**User Story:** As an anonymous user, I want to start using FindMyCut without creating an account, so that I can try the service with minimal friction.

#### Acceptance Criteria

1. WHEN the user clicks "Try Free" and chooses to skip login, THE Auth_Client SHALL call `POST /api/auth/sign-in/anonymous` to create an Anonymous_Session
2. WHILE the anonymous sign-in request is in progress, THE Frontend SHALL display a loading indicator and disable the skip-login control to prevent duplicate submissions
3. WHEN the Backend_API returns a successful session response, THE Frontend SHALL store the session state (user ID, token) in application memory and the Anonymous_Session SHALL remain valid for 7 days from creation
4. WHEN the Anonymous_Session is created successfully, THE Stage_Machine SHALL transition from "landing" to "upload"
5. IF the anonymous sign-in request fails or does not respond within 10 seconds, THEN THE Frontend SHALL display an error message indicating the session could not be created and remain on the "landing" stage with the skip-login control re-enabled

### Requirement 2: Google OAuth Login

**User Story:** As a user, I want to log in with my Google account, so that my session is persisted and my identity is shown in the app header.

#### Acceptance Criteria

1. WHEN the user clicks the Google login button, THE Auth_Client SHALL call `POST /api/auth/sign-in/social` with provider "google" and callbackURL set to the current window origin
2. WHEN the Backend_API returns a redirect URL, THE Frontend SHALL navigate the browser to that URL to initiate the Google OAuth consent flow
3. WHEN the user returns from Google OAuth callback, THE Frontend SHALL call `GET /api/auth/get-session` within 10 seconds to retrieve the authenticated session
4. WHEN a valid Google_OAuth_Session is retrieved, THE Frontend SHALL store the user profile (name, email, image) and display the user's profile image (24×24px, circular) and name in the app header navigation bar
5. IF the session retrieval fails or returns no valid session after OAuth callback, THEN THE Frontend SHALL navigate to the landing stage and display an error notification visible for at least 5 seconds indicating that login was unsuccessful
6. WHEN the user refreshes the page, THE Frontend SHALL call `GET /api/auth/get-session` and restore the previously authenticated user profile in the app header if a valid session exists
7. WHILE the OAuth sign-in flow is in progress (from button click until session is retrieved or fails), THE Frontend SHALL display a loading indicator on the Google login button and disable repeated clicks

### Requirement 3: Session Persistence and Restoration

**User Story:** As a logged-in user, I want my session to persist across page reloads, so that I do not need to log in again.

#### Acceptance Criteria

1. WHEN the Frontend application mounts, THE Auth_Client SHALL call `GET /api/auth/get-session` to check for an existing session
2. WHEN `GET /api/auth/get-session` returns a session containing user data, THE Frontend SHALL restore the user state (name, email, image, tier) from the session response and display the authenticated navigation (user avatar and name)
3. WHEN `GET /api/auth/get-session` returns no session (unauthenticated response), THE Frontend SHALL remain in the unauthenticated state showing the Google login button without displaying error messages
4. WHILE a valid session exists, THE Frontend SHALL include session credentials (cookie) in all subsequent API requests
5. IF the `GET /api/auth/get-session` request fails due to a network error or server error, THEN THE Frontend SHALL treat the user as unauthenticated without displaying error messages and allow the user to continue using the application
6. WHILE the `GET /api/auth/get-session` request is in progress, THE Frontend SHALL display a loading indicator in the authentication area and SHALL NOT render the login button or user profile until the session check completes within 10 seconds

### Requirement 4: Session Logout

**User Story:** As a logged-in user, I want to log out, so that my session is invalidated and I return to the unauthenticated state.

#### Acceptance Criteria

1. WHEN the user clicks the logout action and confirms the logout prompt, THE Auth_Client SHALL call `POST /api/auth/sign-out` to invalidate the session, with a request timeout of 10 seconds
2. WHEN the sign-out request succeeds (HTTP 200), THE Frontend SHALL clear the authenticated user object, reset the stage to "landing", reset payment status to its default locked state, and clear any selected face or analysis data
3. IF the sign-out request fails due to a network error, timeout, or non-200 HTTP response, THEN THE Frontend SHALL still clear the authenticated user object, reset the stage to "landing", reset payment status to its default locked state, and clear any selected face or analysis data

### Requirement 5: Selfie Upload

**User Story:** As a user with an active session, I want to upload my selfie photo, so that the AI can analyze my face.

#### Acceptance Criteria

1. WHEN the user captures a photo via camera, THE Frontend SHALL send the base64-encoded image (maximum 10 MB before encoding) to `POST /api/v1/uploads` as JSON with the field `image_base64` and the session credentials
2. WHEN the user selects a photo from gallery, THE Frontend SHALL send the file as multipart/form-data (field name: `file`, maximum 10 MB) to `POST /api/v1/uploads` with the session credentials
3. WHEN the Backend_API returns a successful upload response containing `id`, `url`, `width`, `height`, and `size_bytes`, THE Frontend SHALL store the returned image URL in application state for use in the analysis stage
4. IF the upload request fails due to a network error or server error response, THEN THE Frontend SHALL display an error message indicating the failure reason and allow the user to retry the upload without losing the selected image
5. IF the user selects a file that is not a supported image format (JPEG, PNG, or WebP) or exceeds 10 MB, THEN THE Frontend SHALL display a validation error message indicating the constraint violated and SHALL NOT send the request to the server
6. WHEN the upload completes successfully and the image URL is stored, THE Frontend SHALL transition the application stage from "upload" to "scan"

### Requirement 6: AI Analysis Trigger and Polling

**User Story:** As a user who uploaded a selfie, I want the AI analysis to start automatically and show me progress, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the upload completes successfully, THE Frontend SHALL call `POST /api/v1/analyses` with the user_id and image_url from the upload response
2. WHEN the Backend_API returns a 202 response with analysis_id, THE Stage_Machine SHALL transition to the "scan" stage
3. WHILE the analysis status is "processing", THE Frontend SHALL poll `GET /api/v1/analyses/{id}/status` every 2 seconds to check progress
4. WHEN the analysis status changes to "completed", THE Frontend SHALL stop polling and transition to the "results" stage
5. IF the analysis status changes to "failed", THEN THE Frontend SHALL stop polling, display an error message indicating the analysis could not be completed, and provide a retry action that re-submits the analysis request to `POST /api/v1/analyses` with the same user_id and image_url
6. WHILE polling is active, THE Frontend SHALL accumulate progress entries from the status response and display them in the Progress_Feed in chronological order
7. IF polling has been active for more than 120 seconds without the status changing to "completed" or "failed", THEN THE Frontend SHALL stop polling, display an error message indicating the analysis timed out, and provide the same retry action as criterion 5
8. IF a poll request to `GET /api/v1/analyses/{id}/status` fails due to a network error, THEN THE Frontend SHALL retry the poll request up to 3 consecutive times before treating the analysis as failed per criterion 5

### Requirement 7: Analysis Progress Feed Display

**User Story:** As a user waiting for analysis, I want to see step-by-step progress messages below the scanning animation, so that I understand what the AI is doing and feel engaged.

#### Acceptance Criteria

1. WHILE the Stage_Machine is in the "scan" stage, THE Frontend SHALL render the Progress_Feed below the scan animation image with a maximum visible height of 300px and vertical scrolling enabled when content overflows
2. WHEN a new progress entry is received from the polling response, THE Frontend SHALL append a new Progress_Entry to the Progress_Feed with the appropriate status icon, deduplicating entries already displayed by comparing the entry timestamp and agent fields
3. WHEN a progress entry has step "complete", THE Frontend SHALL display a checkmark icon [✓] in green color before the message text
4. WHEN a progress entry has step "error" or "skip", THE Frontend SHALL display a warning icon [!] in amber color before the message text
5. WHEN a progress entry has step "tool" or "tool_call" or "tool_result", THE Frontend SHALL display a retry icon [↻] in blue color before the message text
6. WHEN a progress entry has step "start" or "thinking", THE Frontend SHALL display a spinner indicator before the message text for the currently active step
7. WHEN a new Progress_Entry is appended to the Progress_Feed, THE Frontend SHALL auto-scroll the Progress_Feed container to make the latest entry visible within 200 milliseconds
8. THE Progress_Feed SHALL display entries in chronological order from oldest at top to newest at bottom based on the timestamp field of each progress entry
9. IF the polling response contains zero progress entries, THEN THE Frontend SHALL display the Progress_Feed container with no entries and no error indication

### Requirement 8: Recommendations Display (Free Tier)

**User Story:** As a free tier user, I want to see my AI-generated haircut recommendations with 1 unlocked and the rest locked, so that I can preview the service value.

#### Acceptance Criteria

1. WHEN the analysis status is "completed", THE Frontend SHALL call `GET /api/v1/analyses/{id}/recommendations` with session credentials within 2 seconds of the results stage loading
2. WHEN the Backend_API returns recommendations, THE Frontend SHALL display the first unlocked recommendation showing: style name, match percentage (integer 0–100), at least one front-view image, barber instructions, and styling tips
3. WHEN the Backend_API returns recommendations with `is_locked: true`, THE Frontend SHALL display those recommendations as cards with blurred imagery, a lock icon overlay, and the style name replaced with a "Locked Style" label while hiding match percentage and detail fields
4. WHEN the Backend_API returns recommendations, THE Frontend SHALL display the face analysis metadata (face_shape, face_confidence, hair_density, hair_texture) from the response in the results header
5. IF the recommendations request fails or returns an error response, THEN THE Frontend SHALL display an error message indicating the failure reason and a retry button that re-triggers the same GET request
6. WHILE the recommendations request is in progress, THE Frontend SHALL display a loading indicator in the results area

### Requirement 9: User State Display in Header

**User Story:** As a logged-in user, I want to see my profile information in the app header, so that I know I am authenticated.

#### Acceptance Criteria

1. WHILE a Google_OAuth_Session is active, THE Frontend SHALL display the user's profile image (rendered at 24×24 pixels, circular crop) and name (truncated to 20 characters with ellipsis if exceeded) in the navigation header
2. WHILE an Anonymous_Session is active, THE Frontend SHALL display a "Guest" text indicator in the navigation header in place of the profile image and name
3. WHEN the user state changes from authenticated to unauthenticated, THE Frontend SHALL update the header within 1 second to replace the profile display with a Google login button bearing the Google icon and the label "Google"
4. IF the user's profile image fails to load WHILE a Google_OAuth_Session is active, THEN THE Frontend SHALL display a fallback placeholder icon in place of the profile image while continuing to show the user's name

### Requirement 10: API Client Configuration

**User Story:** As a developer, I want a centralized API client that handles authentication headers and base URL, so that all API calls are consistent and maintainable.

#### Acceptance Criteria

1. THE Auth_Client SHALL use the `VITE_API_URL` environment variable as the base URL for all API requests, falling back to `http://localhost:3000` when the variable is not defined
2. THE Frontend SHALL configure all requests to the backend API to include `credentials: "include"` to send session cookies with cross-origin requests
3. THE Frontend SHALL use the existing better-auth client methods for authentication endpoints (sign-in, sign-out, get-session)
4. WHEN making requests to `/api/v1/*` endpoints, THE Frontend SHALL include the session cookie automatically via the credentials configuration
5. IF the backend responds with a 401 status to any `/api/v1/*` request, THEN THE Frontend SHALL treat the user session as expired and redirect the user to the sign-in view within 2 seconds

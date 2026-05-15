import { useState, useRef, useEffect } from "react";
import { truncateName } from "../lib/display-utils";

export interface HeaderNavUser {
  name: string;
  email: string;
  image: string | null;
  isAnonymous: boolean;
}

export interface HeaderNavProps {
  user: HeaderNavUser | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  onSignInGoogle: () => void;
  onSignOut: () => void;
}

/**
 * Header navigation component that displays user state.
 * Clicking the profile area opens a popup with profile info and logout button.
 */
export function HeaderNav({
  user,
  isAuthenticated,
  isAnonymous,
  isLoading,
  onSignInGoogle,
  onSignOut,
}: HeaderNavProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsPopupOpen(false);
      }
    }
    if (isPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isPopupOpen]);

  const handleLogout = () => {
    setIsPopupOpen(false);
    onSignOut();
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "2px solid var(--hairline)",
            borderTopColor: "var(--ink)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // Authenticated (Google or Anonymous)
  if (isAuthenticated && user) {
    return (
      <div ref={popupRef} style={{ position: "relative" }}>
        {/* Clickable profile trigger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "var(--rounded-sm)",
            transition: "background 0.15s",
          }}
          onClick={() => setIsPopupOpen(!isPopupOpen)}
        >
          {!isAnonymous && (
            <div style={{ position: "relative", width: "24px", height: "24px" }}>
              <img
                src={user.image || ""}
                alt={user.name}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: user.image ? "block" : "none",
                }}
                onError={handleImageError}
              />
              {/* Fallback placeholder */}
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--hairline)",
                  display: user.image ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
          )}
          <span style={{ fontSize: "12px", color: "white", fontWeight: "500" }}>
            {isAnonymous ? "Guest" : truncateName(user.name)}
          </span>
          {/* Chevron */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isPopupOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Profile popup dropdown */}
        {isPopupOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: "220px",
              background: "var(--canvas-card, #1a1a1a)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--rounded-sm)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            {/* Profile info */}
            <div style={{ padding: "16px", borderBottom: "1px solid var(--hairline)" }}>
              {!isAnonymous && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ position: "relative", width: "36px", height: "36px", flexShrink: 0 }}>
                    <img
                      src={user.image || ""}
                      alt={user.name}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: user.image ? "block" : "none",
                      }}
                      onError={handleImageError}
                    />
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "var(--hairline)",
                        display: user.image ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--body-mid)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.email}
                    </div>
                  </div>
                </div>
              )}
              {isAnonymous && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "var(--hairline)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Guest</div>
                    <div style={{ fontSize: "11px", color: "var(--body-mid)" }}>Sesi anonim</div>
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <div style={{ padding: "8px" }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#ef4444",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--rounded-sm)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unauthenticated: show Google login button
  return (
    <button
      className="fmc-button--outline"
      style={{
        padding: "6px 12px",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      onClick={onSignInGoogle}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Google
    </button>
  );
}

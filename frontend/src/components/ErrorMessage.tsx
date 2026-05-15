interface ErrorMessageProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

/**
 * Styled error message card with icon, message text, and optional action/dismiss buttons.
 * Dark card style with red accent, matching the app's dark theme.
 */
export function ErrorMessage({ message, actionLabel, onAction, onDismiss }: ErrorMessageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "24px 20px",
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        borderRadius: "var(--rounded-sm)",
        marginTop: "16px",
      }}
    >
      {/* Error icon */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {/* Message */}
      <p
        style={{
          color: "var(--body)",
          fontSize: "13px",
          lineHeight: "1.5",
          textAlign: "center",
          margin: 0,
        }}
      >
        {message}
      </p>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {actionLabel && onAction && (
          <button
            className="fmc-button--outline"
            style={{
              fontSize: "13px",
              padding: "8px 16px",
              borderColor: "rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
            }}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            className="fmc-button--outline"
            style={{
              fontSize: "13px",
              padding: "8px 16px",
              opacity: 0.7,
            }}
            onClick={onDismiss}
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}

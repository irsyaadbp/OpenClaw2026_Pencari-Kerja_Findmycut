import { useEffect, useRef } from "react";
import { type ProgressEntry, sanitizeMessage } from "../lib/progress-utils";
import { getStepIcon } from "../lib/display-utils";

interface ProgressFeedProps {
  entries: ProgressEntry[];
}

const colorMap: Record<string, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  blue: "#3b82f6",
  gray: "#6b7280",
};

export function ProgressFeed({ entries }: ProgressFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && entries.length > 0) {
      const timeout = setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [entries.length]);

  return (
    <div
      ref={containerRef}
      data-testid="progress-feed"
      style={{
        maxHeight: "300px",
        overflowY: "auto",
        width: "100%",
        marginTop: "24px",
        borderRadius: "var(--rounded-sm)",
        background: "var(--canvas-soft)",
        border: "1px solid var(--hairline)",
        padding: "12px",
        minHeight: "48px",
      }}
    >
      {/* Default loading state when no entries */}
      {entries.length === 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 0",
          }}
        >
          <span
            style={{
              color: colorMap.blue,
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              lineHeight: "20px",
              flexShrink: 0,
              width: "20px",
              textAlign: "center",
              animation: "spin 1s linear infinite",
            }}
          >
            ⟳
          </span>
          <span
            style={{
              color: "var(--body)",
              fontSize: "13px",
              lineHeight: "20px",
              fontFamily: "var(--font-sans)",
            }}
          >
            Menganalisis foto...
          </span>
        </div>
      )}

      {/* Progress entries */}
      {entries.map((entry, index) => {
        const { icon, color, animated } = getStepIcon(entry.step);
        const iconColor = colorMap[color] || colorMap.gray;

        return (
          <div
            key={`${entry.timestamp}-${entry.agent}-${index}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "6px 0",
              borderBottom:
                index < entries.length - 1
                  ? "1px solid var(--hairline)"
                  : "none",
            }}
          >
            <span
              style={{
                color: iconColor,
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                lineHeight: "20px",
                flexShrink: 0,
                width: "20px",
                textAlign: "center",
                animation: animated ? "spin 1s linear infinite" : "none",
              }}
            >
              {icon}
            </span>
            <span
              style={{
                color: "var(--body)",
                fontSize: "13px",
                lineHeight: "20px",
                fontFamily: "var(--font-sans)",
              }}
            >
              {sanitizeMessage(entry)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

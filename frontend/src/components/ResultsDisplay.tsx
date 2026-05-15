import { useState } from "react";
import type { RecommendationResponse, Recommendation, AnalysisMetadata } from "../hooks/useRecommendations";

interface ResultsDisplayProps {
  data: RecommendationResponse;
}

/**
 * Compact analysis header matching the screenshot design:
 * Shows user photo placeholder, face shape (green), and hair type on the right.
 */
function AnalysisHeader({ analysis }: { analysis: AnalysisMetadata }) {
  return (
    <div
      className="fmc-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        background: "var(--canvas-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--rounded-sm)",
      }}
    >
      {/* Placeholder avatar */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "var(--rounded-pill)",
          background: "var(--canvas-soft)",
          border: "1px solid var(--hairline)",
          flexShrink: 0,
        }}
      />
      <div>
        <div className="fmc-eyebrow-mono" style={{ fontSize: "10px", marginBottom: "2px", color: "var(--body-mid)" }}>
          Analysis
        </div>
        <div className="fmc-body--md" style={{ fontWeight: 500 }}>
          Shape: <span style={{ color: "#22c55e", textTransform: "capitalize" }}>{analysis.face_shape}</span>
        </div>
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <div className="fmc-eyebrow-mono" style={{ fontSize: "10px", marginBottom: "2px", color: "var(--body-mid)" }}>
          Hair Type
        </div>
        <div className="fmc-body--sm" style={{ fontWeight: 500, textTransform: "capitalize" }}>
          {analysis.hair_texture}
        </div>
      </div>
    </div>
  );
}

/**
 * Grid card for an unlocked recommendation.
 * Shows front image, style name, and match % in green.
 */
function StyleCard({ recommendation, onClick }: { recommendation: Recommendation; onClick: () => void }) {
  const frontImage = recommendation.image.find(
    (img) => img.type.toLowerCase() === "front"
  ) || recommendation.image[0];

  return (
    <div
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: "var(--rounded-sm)", overflow: "hidden" }}>
        {frontImage ? (
          <img
            src={frontImage.url}
            alt={recommendation.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--canvas-soft)" }} />
        )}
      </div>
      <div style={{ marginTop: "8px" }}>
        <div className="fmc-body--sm" style={{ fontWeight: 500 }}>
          {recommendation.name}
        </div>
        <div className="fmc-caption-mono" style={{ color: "#22c55e", fontSize: "11px", marginTop: "2px" }}>
          {recommendation.match}% Match
        </div>
      </div>
    </div>
  );
}

/**
 * Grid card for a locked recommendation.
 * Shows blurred image with lock icon, "Locked Style" label, no match %.
 */
function LockedCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3/4",
          borderRadius: "var(--rounded-sm)",
          overflow: "hidden",
          background: "var(--canvas-soft)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(30,30,30,0.8), rgba(50,50,50,0.6))",
            filter: "blur(0px)",
          }}
        />
        {/* Lock icon overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            color="rgba(255,255,255,0.7)"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "8px" }}>
        <div className="fmc-body--sm" style={{ fontWeight: 500, color: "var(--body-mid)" }}>
          Locked Style
        </div>
      </div>
    </div>
  );
}

/**
 * Fullscreen style detail view.
 * Shows multi-angle images (front unlocked, others locked), match %, style name,
 * and barber instructions behind a pro paywall.
 */
function StyleDetail({
  recommendation,
  onClose,
}: {
  recommendation: Recommendation;
  onClose: () => void;
}) {
  const frontImage = recommendation.image.find(
    (img) => img.type.toLowerCase() === "front"
  ) || recommendation.image[0];
  const leftImage = recommendation.image.find((img) => img.type.toLowerCase() === "left");
  const rightImage = recommendation.image.find((img) => img.type.toLowerCase() === "right");
  const backImage = recommendation.image.find((img) => img.type.toLowerCase() === "back");

  const angleImages = [
    { label: "FRONT", img: frontImage, locked: false },
    { label: "LEFT", img: leftImage, locked: true },
    { label: "RIGHT", img: rightImage, locked: true },
    { label: "BACK", img: backImage, locked: true },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--canvas)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        maxWidth: "480px",
        margin: "0 auto",
        boxShadow: "0 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--hairline)",
          position: "sticky",
          top: 0,
          background: "var(--canvas)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={onClose}
            style={{ marginRight: "16px", color: "var(--ink)", padding: "8px", background: "none", border: "none", cursor: "pointer" }}
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div style={{ fontWeight: 500 }}>Style Details</div>
        </div>

        <button
          className="fmc-button--outline"
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(recommendation.name + " haircut")}`, "_blank");
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
      </div>

      {/* Multi-angle image grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2px",
          width: "100%",
          background: "var(--hairline)",
        }}
      >
        {angleImages.map((angle) => (
          <div key={angle.label} style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden" }}>
            {angle.img ? (
              <img
                src={angle.img.url}
                alt={angle.label}
                className={angle.locked ? "fmc-locked-overlay__blur" : ""}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--canvas-soft)",
                }}
                className={angle.locked ? "fmc-locked-overlay__blur" : ""}
              />
            )}
            {angle.locked && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="white">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            )}
            <div
              className="fmc-caption-mono"
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                background: "rgba(0,0,0,0.6)",
                padding: "2px 6px",
                borderRadius: "4px",
                color: "white",
                fontSize: "10px",
                zIndex: 5,
              }}
            >
              {angle.label}
            </div>
          </div>
        ))}
      </div>

      {/* Style info */}
      <div style={{ padding: "24px" }}>
        <div className="fmc-caption-mono" style={{ color: "#22c55e", fontSize: "12px", marginBottom: "8px" }}>
          {recommendation.match}% Match
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: 600, margin: "0 0 24px 0", color: "var(--ink)" }}>
          {recommendation.name}
        </h2>

        {/* Barber Instructions section — always locked behind Pro */}
        <div className="fmc-eyebrow-mono" style={{ fontSize: "10px", marginBottom: "12px", color: "var(--body-mid)" }}>
          Barber Instructions
        </div>

        <div
          style={{
            background: "var(--canvas-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--rounded-sm)",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div className="fmc-eyebrow-mono" style={{ fontSize: "11px", marginBottom: "8px", color: "var(--body-mid)" }}>
            Fitur Pro
          </div>
          <p className="fmc-body--sm" style={{ color: "var(--body-mid)", margin: "0 0 16px 0", lineHeight: "1.5" }}>
            Upgrade untuk melihat instruksi barber &amp; tips styling lengkap.
          </p>
          <button
            className="fmc-button--outline"
            style={{ fontSize: "13px", padding: "8px 20px" }}
          >
            Unlock Pro
          </button>
        </div>

        {/* Styling Tips / Maintenance — always locked behind Pro */}
        <div style={{ marginTop: "20px" }}>
          <div className="fmc-eyebrow-mono" style={{ fontSize: "10px", marginBottom: "12px", color: "var(--body-mid)" }}>
            Styling Tips &amp; Maintenance
          </div>
          <div
            style={{
              background: "var(--canvas-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--rounded-sm)",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div className="fmc-eyebrow-mono" style={{ fontSize: "11px", marginBottom: "8px", color: "var(--body-mid)" }}>
              Fitur Pro
            </div>
            <p className="fmc-body--sm" style={{ color: "var(--body-mid)", margin: "0 0 16px 0", lineHeight: "1.5" }}>
              Upgrade untuk melihat tips perawatan &amp; styling harian.
            </p>
            <button
              className="fmc-button--outline"
              style={{ fontSize: "13px", padding: "8px 20px" }}
            >
              Unlock Pro
            </button>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          padding: "16px 24px 32px",
          borderTop: "1px solid var(--hairline)",
          background: "var(--canvas)",
          position: "sticky",
          bottom: 0,
        }}
      >
        <button
          className="fmc-button--outline"
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            fontWeight: 500,
            borderRadius: "var(--rounded-pill)",
          }}
        >
          Unlock All Pro Styles
        </button>
      </div>
    </div>
  );
}

/**
 * ResultsDisplay component renders the recommendations in a grid layout.
 *
 * - Compact analysis header (face shape + hair type)
 * - 2-column grid of style cards (image, name, match %)
 * - Clicking a card opens a fullscreen detail view
 * - Locked cards show blurred placeholder with lock icon
 * - "Unlock All Pro Styles" CTA at the bottom
 */
export function ResultsDisplay({ data }: ResultsDisplayProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  const unlockedRecommendations = data.data.filter((r) => !r.is_locked);
  const lockedRecommendations = data.data.filter((r) => r.is_locked);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Analysis Metadata Header */}
        <AnalysisHeader analysis={data.analysis} />

        {/* Section title */}
        <div className="fmc-eyebrow-mono" style={{ textAlign: "center" }}>
          Recommended Styles
        </div>

        {/* 2-column grid of all recommendations */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {unlockedRecommendations.map((rec, idx) => (
            <StyleCard
              key={`unlocked-${idx}`}
              recommendation={rec}
              onClick={() => setSelectedRecommendation(rec)}
            />
          ))}
          {lockedRecommendations.map((rec, idx) => (
            <LockedCard
              key={`locked-${idx}`}
              onClick={() => setSelectedRecommendation(rec)}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ padding: "8px 0 16px" }}>
          <button
            className="fmc-button--outline"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "15px",
              fontWeight: 500,
              borderRadius: "var(--rounded-pill)",
            }}
          >
            Unlock All Pro Styles
          </button>
        </div>
      </div>

      {/* Fullscreen Style Detail */}
      {selectedRecommendation && (
        <StyleDetail
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
        />
      )}
    </>
  );
}

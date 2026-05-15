import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import "./index.css";

import { PREVIEWS, findPreviewById } from "./data/previews";
import { type Stage, getNextStage } from "./lib/stage-machine";
import { type PaymentStatus, type Tier, isPreviewLocked, getTierPrice, getTierLabel } from "./lib/payment";
import { formatInstructions } from "./lib/format-instructions";
import { generateExportFilename } from "./lib/export";
import { type CaptureAngle, getInitialCaptureAngle, getNextCaptureAngle, isFinalAngle } from "./lib/capture-flow";
import { DEMO_FACES } from "./data/demo-faces";

function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("locked");
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // New States
  const [selectedPreviewId, setSelectedPreviewId] = useState<number>(1);
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMultiAnglePopupOpen, setIsMultiAnglePopupOpen] = useState(false);
  const [pendingFaceUrl, setPendingFaceUrl] = useState<string | null>(null);
  const [capturedAngles, setCapturedAngles] = useState<Record<string, string>>({});
  const [currentCaptureAngle, setCurrentCaptureAngle] = useState<CaptureAngle>(
    getInitialCaptureAngle()
  );
  const [user, setUser] = useState<{ name: string; email: string; photo: string } | null>(null);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleSelectFace(url);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengakses kamera. Pastikan browser memiliki izin.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      // Mirror the context before drawing to match the mirrored video
      context?.translate(canvasRef.current.width, 0);
      context?.scale(-1, 1);
      context?.drawImage(videoRef.current, 0, 0);

      const dataUrl = canvasRef.current.toDataURL("image/jpeg");

      if (currentCaptureAngle === "depan") {
        // Stop camera tracks for now
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
        setIsCameraActive(false);

        setPendingFaceUrl(dataUrl);
        setCapturedAngles({ depan: dataUrl });
        setIsMultiAnglePopupOpen(true);
      } else {
        // Multi-angle mode
        setCapturedAngles((prev) => ({ ...prev, [currentCaptureAngle]: dataUrl }));
        const nextAngle = getNextCaptureAngle(currentCaptureAngle);

        if (nextAngle) {
          setCurrentCaptureAngle(nextAngle);
        } else if (isFinalAngle(currentCaptureAngle)) {
          // Stop camera tracks now that we are finished
          const stream = videoRef.current.srcObject as MediaStream;
          stream?.getTracks().forEach((track) => track.stop());
          setIsCameraActive(false);

          // Go to scanning
          setSelectedFace(capturedAngles.depan || pendingFaceUrl || dataUrl);
          setStage(getNextStage(stage, "face_selected"));
          setTimeout(() => {
            setStage(getNextStage("scan", "scan_complete"));
            setSelectedTier("pro");
            setPaymentStatus("checkout"); // Auto trigger payment lock after multi-scan
          }, 2500);
        }
      }
    }
  };

  const closeCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleStart = () => setStage(getNextStage(stage, "start"));

  const handleSelectFace = (url: string) => {
    setSelectedFace(url);
    setStage(getNextStage(stage, "face_selected"));
    setTimeout(() => {
      setStage(getNextStage("scan", "scan_complete"));
    }, 2500);
  };

  const handlePreviewClick = (previewId: number, isLocked: boolean) => {
    if (isLocked) {
      setPaymentStatus("checkout");
      setSelectedTier("pro");
    } else {
      setSelectedPreviewId(previewId);
      setIsDetailPopupOpen(true);
    }
  };

  const processPayment = () => {
    setTimeout(() => {
      setPaymentStatus("unlocked");
      setStage(getNextStage(stage, "payment_complete"));
    }, 1000);
  };

  const selectedPreviewData = findPreviewById(selectedPreviewId);

  const copyInstructions = () => {
    const text = formatInstructions(selectedPreviewData);
    void navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const exportResultCard = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#0a0a0a",
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = generateExportFilename(selectedPreviewData.style);
      link.href = url;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fmc-layout" style={{ paddingBottom: stage === "results" ? "0" : "64px" }}>
      {/* App Header */}
      <nav
        style={{
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--hairline)",
          background: "var(--canvas)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 500, fontSize: "18px", letterSpacing: "-0.4px" }}>
          findmycut
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {stage !== "landing" && (
            <button
              className="fmc-button--outline"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => {
                setStage("landing");
                setPaymentStatus("locked");
                setSelectedPreviewId(1);
                setIsDetailPopupOpen(false);
              }}
            >
              Start Over
            </button>
          )}

          {user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (confirm("Apakah Anda ingin logout?")) {
                  setUser(null);
                }
              }}
              title="Klik untuk logout"
            >
              <img
                src={user.photo}
                alt={user.name}
                style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }}
              />
              <span style={{ fontSize: "12px", color: "white", fontWeight: "500" }}>
                {user.name}
              </span>
            </div>
          ) : (
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
                setUser({
                  name: "Alex",
                  email: "alex@gmail.com",
                  photo:
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop",
                });
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          )}
        </div>
      </nav>

      <div style={{ padding: "0 24px" }}>
        {/* Landing Stage */}
        {stage === "landing" && (
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <div className="fmc-eyebrow-mono" style={{ marginBottom: "16px" }}>
              AI-Powered Recommender
            </div>
            <h1 className="fmc-display--lg" style={{ margin: "0 auto 24px" }}>
              Find the haircut that actually fits your face.
            </h1>
            <p className="fmc-body--md" style={{ margin: "0 auto 48px", color: "var(--body-mid)" }}>
              Upload a selfie and our AI analyzes your face shape and hair texture to generate
              personalized haircut previews and precise barber instructions.
            </p>

            {/* Visual Hook - Overlapping Cards */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "280px",
                marginBottom: "48px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Card 1 (Left, rotated) */}
              <div
                style={{
                  position: "absolute",
                  left: "5%",
                  transform: "rotate(-12deg) scale(0.9)",
                  zIndex: 1,
                  width: "140px",
                  height: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                  opacity: 0.6,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src={PREVIEWS[1].url}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="Style 1"
                />
              </div>

              {/* Card 3 (Right, rotated) */}
              <div
                style={{
                  position: "absolute",
                  right: "5%",
                  transform: "rotate(12deg) scale(0.9)",
                  zIndex: 1,
                  width: "140px",
                  height: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                  opacity: 0.6,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src={PREVIEWS[2].url}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="Style 3"
                />
              </div>

              {/* Card 2 (Center, Front) */}
              <div
                style={{
                  position: "absolute",
                  zIndex: 10,
                  width: "180px",
                  height: "240px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
                  background: "var(--hairline)",
                }}
              >
                <img
                  src={PREVIEWS[0].url}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="Style 2"
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "12px",
                    right: "12px",
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    className="fmc-caption-mono"
                    style={{ color: "#22c55e", fontSize: "10px", marginBottom: "4px" }}
                  >
                    {PREVIEWS[0].confidence}% MATCH
                  </div>
                  <div style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>
                    {PREVIEWS[0].style}
                  </div>
                </div>
              </div>
            </div>
            <button
              className="fmc-button--primary"
              style={{ width: "100%", fontSize: "16px", padding: "16px 32px" }}
              onClick={() => {
                if (user) {
                  handleStart();
                } else {
                  setIsLoginPopupOpen(true);
                }
              }}
            >
              Try Free
            </button>
          </div>
        )}

        {/* Upload Stage */}
        {stage === "upload" && (
          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <h2 className="fmc-display--md" style={{ marginBottom: "8px" }}>
              Pilih Foto
            </h2>
            <p className="fmc-body--md" style={{ marginBottom: "32px", color: "var(--body-mid)" }}>
              Pastikan wajah Anda menghadap lurus dengan pencahayaan yang baik.
            </p>

            {/* Upload Options */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "48px",
              }}
            >
              <button
                className="fmc-button--primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "20px",
                  fontSize: "16px",
                  width: "100%",
                  borderRadius: "16px",
                }}
                onClick={startCamera}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Ambil Selfie
              </button>

              <button
                className="fmc-button--outline"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "20px",
                  fontSize: "16px",
                  width: "100%",
                  color: "var(--ink)",
                  border: "1px solid var(--hairline)",
                  background: "var(--canvas-soft)",
                  borderRadius: "16px",
                }}
                onClick={() => galleryInputRef.current?.click()}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Pilih dari Galeri
              </button>

              <input
                type="file"
                accept="image/*"
                ref={galleryInputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>

            <div className="fmc-eyebrow-mono" style={{ marginBottom: "16px" }}>
              Atau coba dengan foto demo
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {DEMO_FACES.map((face) => (
                <img
                  key={face.id}
                  src={face.url}
                  alt="Demo face"
                  style={{
                    width: "72px",
                    height: "72px",
                    objectFit: "cover",
                    borderRadius: "var(--rounded-sm)",
                    cursor: "pointer",
                    border: "1px solid var(--hairline)",
                  }}
                  onClick={() => handleSelectFace(face.url)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scanning Stage */}
        {stage === "scan" && (
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <h2 className="fmc-display--sm" style={{ marginBottom: "32px" }}>
              Analyzing face...
            </h2>
            <div
              className="fmc-scanner"
              style={{
                width: "100%",
                maxWidth: "300px",
                aspectRatio: "3/4",
                margin: "0 auto",
                borderRadius: "var(--rounded-sm)",
              }}
            >
              <img
                src={selectedFace!}
                alt="Scanning"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "grayscale(100%) contrast(1.2)",
                }}
              />
              <div className="fmc-scanner__line"></div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  zIndex: 5,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* DoitPay Success Stage */}
        {stage === "payment_success" && (
          <div className="fmc-success">
            <div className="fmc-success__badge">DoitPay Verified</div>
            <div className="fmc-success__icon-container">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="fmc-display--sm" style={{ marginBottom: "8px" }}>
              Pembayaran Berhasil!
            </h2>
            <p className="fmc-body--md" style={{ color: "var(--body-mid)", marginBottom: "24px" }}>
              Terima kasih, pembayaran Anda menggunakan DoitPay telah diverifikasi secara instan.
            </p>

            <div className="fmc-success__receipt">
              <div className="fmc-success__receipt-row">
                <span style={{ color: "var(--body-mid)" }}>Metode</span>
                <span style={{ color: "var(--ink)" }}>DoitPay QRIS</span>
              </div>
              <div className="fmc-success__receipt-row">
                <span style={{ color: "var(--body-mid)" }}>ID Transaksi</span>
                <span style={{ color: "var(--ink)", textTransform: "uppercase" }}>
                  DP-894723849
                </span>
              </div>
              <div className="fmc-success__receipt-row">
                <span style={{ color: "var(--body-mid)" }}>Paket Unlocked</span>
                <span style={{ color: "var(--ink)" }}>
                  {getTierLabel(selectedTier || "pro")}
                </span>
              </div>
              <div className="fmc-success__receipt-row">
                <span style={{ color: "var(--body-mid)" }}>Total Bayar</span>
                <span style={{ color: "var(--ink)", fontWeight: "500" }}>
                  {getTierPrice(selectedTier || "pro")}
                </span>
              </div>
            </div>

            <button
              className="fmc-button--primary"
              style={{ width: "100%", padding: "16px", fontSize: "16px" }}
              onClick={() => {
                setStage("results");
              }}
            >
              Lihat Rekomendasi Potongan
            </button>
          </div>
        )}

        {/* Results Stage (Main Grid View) */}
        {stage === "results" && (
          <div
            style={{
              paddingTop: "24px",
              paddingBottom: "120px",
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            {/* Header Analysis */}
            <div
              className="fmc-card"
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px" }}
            >
              <img
                src={selectedFace!}
                alt="Analyzed"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--rounded-pill)",
                  objectFit: "cover",
                }}
                crossOrigin="anonymous"
              />
              <div>
                <div className="fmc-eyebrow-mono" style={{ fontSize: "12px" }}>
                  Analysis
                </div>
                <div className="fmc-body--md" style={{ fontWeight: 500 }}>
                  Shape: <span style={{ color: "#22c55e" }}>Oval</span>
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div className="fmc-caption-mono" style={{ color: "var(--body-mid)" }}>
                  Hair Type
                </div>
                <div className="fmc-body--sm">Straight</div>
              </div>
            </div>

            <div>
              <div
                className="fmc-eyebrow-mono"
                style={{ marginBottom: "16px", textAlign: "center" }}
              >
                Recommended Styles
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {PREVIEWS.map((preview, idx) => {
                  const isLocked = isPreviewLocked(paymentStatus, idx);

                  return (
                    <div
                      key={preview.id}
                      style={{
                        position: "relative",
                        cursor: "pointer",
                        transition: "transform 0.2s",
                      }}
                      onClick={() => handlePreviewClick(preview.id, isLocked)}
                    >
                      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4" }}>
                        <img
                          src={preview.url}
                          className={isLocked ? "fmc-locked-overlay__blur" : ""}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "var(--rounded-sm)",
                            border: "1px solid var(--hairline)",
                          }}
                          alt="Style Preview"
                          crossOrigin="anonymous"
                        />
                        {isLocked && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              placeContent: "center",
                              placeItems: "center",
                              background: "rgba(0,0,0,0.3)",
                              borderRadius: "var(--rounded-sm)",
                            }}
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              color="white"
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: "12px", textAlign: "center" }}>
                        <div
                          className="fmc-body--sm"
                          style={{
                            fontWeight: 500,
                            color: isLocked ? "var(--body-mid)" : "var(--ink)",
                          }}
                        >
                          {isLocked ? "Locked Style" : preview.style}
                        </div>
                        {!isLocked && (
                          <div
                            className="fmc-caption-mono"
                            style={{ color: "#22c55e", marginTop: "4px" }}
                          >
                            {preview.confidence}% Match
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paywall CTA on main view */}
            {paymentStatus !== "unlocked" && (
              <div
                className="fmc-layout__bottom-action"
                style={{
                  background: "linear-gradient(transparent, var(--canvas) 40%)",
                  paddingBottom: "24px",
                }}
              >
                <button
                  className="fmc-button--primary"
                  style={{ width: "100%", padding: "16px" }}
                  onClick={() => setPaymentStatus("checkout")}
                >
                  Unlock All Pro Styles
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Style Fullscreen Mobile View */}
      {isDetailPopupOpen && (
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
                onClick={() => setIsDetailPopupOpen(false)}
                style={{ marginRight: "16px", color: "var(--ink)", padding: "8px" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
              onClick={() => {}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingBottom: "120px",
              background: "var(--canvas)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2px",
                width: "100%",
                aspectRatio: "1/1",
                background: "var(--hairline)",
              }}
            >
              {/* Front */}
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <img
                  src={selectedPreviewData.url}
                  alt="Front"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
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
                  }}
                >
                  FRONT
                </div>
              </div>

              {/* Left */}
              <div
                style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
              >
                <img
                  src={selectedPreviewData.angles.left}
                  className={paymentStatus !== "unlocked" ? "fmc-locked-overlay__blur" : ""}
                  alt="Left"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
                {paymentStatus !== "unlocked" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      placeContent: "center",
                      placeItems: "center",
                      background: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      color="white"
                    >
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
                    zIndex: 10,
                  }}
                >
                  LEFT
                </div>
              </div>

              {/* Right */}
              <div
                style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
              >
                <img
                  src={selectedPreviewData.angles.right}
                  className={paymentStatus !== "unlocked" ? "fmc-locked-overlay__blur" : ""}
                  alt="Right"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
                {paymentStatus !== "unlocked" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      placeContent: "center",
                      placeItems: "center",
                      background: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      color="white"
                    >
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
                    zIndex: 10,
                  }}
                >
                  RIGHT
                </div>
              </div>

              {/* Back */}
              <div
                style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
              >
                <img
                  src={selectedPreviewData.angles.back}
                  className={paymentStatus !== "unlocked" ? "fmc-locked-overlay__blur" : ""}
                  alt="Back"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
                {paymentStatus !== "unlocked" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      placeContent: "center",
                      placeItems: "center",
                      background: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      color="white"
                    >
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
                    zIndex: 10,
                  }}
                >
                  BACK
                </div>
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              <div className="fmc-eyebrow-mono" style={{ color: "#22c55e", marginBottom: "8px" }}>
                {selectedPreviewData.confidence}% Match
              </div>
              <h2 className="fmc-display--sm" style={{ marginBottom: "32px" }}>
                {selectedPreviewData.style}
              </h2>

              <div className="fmc-eyebrow-mono" style={{ marginBottom: "16px" }}>
                Barber Instructions
              </div>

              {paymentStatus === "unlocked" ? (
                <>
                  <div
                    className="fmc-body--md"
                    style={{
                      fontFamily: "var(--font-mono)",
                      padding: "24px",
                      background: "var(--canvas-soft)",
                      borderRadius: "var(--rounded-sm)",
                      border: "1px solid var(--hairline)",
                    }}
                  >
                    <strong style={{ color: "var(--ink)" }}>Sides:</strong>{" "}
                    {selectedPreviewData.sides}
                    <br />
                    <br />
                    <strong style={{ color: "var(--ink)" }}>Top:</strong> {selectedPreviewData.top}
                    <br />
                    <br />
                    <strong style={{ color: "var(--ink)" }}>Finish:</strong>{" "}
                    {selectedPreviewData.finish}
                  </div>

                  <button
                    className="fmc-button--outline"
                    style={{ marginTop: "16px", width: "100%" }}
                    onClick={copyInstructions}
                  >
                    {copyFeedback ? "Copied to Clipboard!" : "Copy Instructions"}
                  </button>

                  <div style={{ marginTop: "32px" }}>
                    <div className="fmc-caption-mono" style={{ marginBottom: "12px" }}>
                      Styling & Maintenance
                    </div>
                    <div className="fmc-body--sm">{selectedPreviewData.maintenance}</div>
                  </div>
                </>
              ) : (
                <div
                  className="fmc-card"
                  style={{ position: "relative", overflow: "hidden", padding: 0 }}
                >
                  <div className="fmc-locked-overlay__blur" style={{ padding: "24px" }}>
                    <div
                      className="fmc-body--md"
                      style={{
                        fontFamily: "var(--font-mono)",
                        marginBottom: "16px",
                        color: "var(--body-mid)",
                      }}
                    >
                      <strong style={{ color: "var(--ink)" }}>Sides:</strong> Gradasi #x.x ke #x
                      <br />
                      <br />
                      <strong style={{ color: "var(--ink)" }}>Top:</strong> Sisakan x-x cm, beri
                      tekstur
                      <br />
                      <br />
                      <strong style={{ color: "var(--ink)" }}>Finish:</strong> Natural, tanpa garis
                      keras
                    </div>
                    <div className="fmc-caption-mono" style={{ marginBottom: "12px" }}>
                      Styling & Maintenance
                    </div>
                    <div className="fmc-body--sm" style={{ color: "var(--body-mid)" }}>
                      Gunakan produk X untuk tekstur. Rapikan tiap Y minggu.
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      placeContent: "center",
                      placeItems: "center",
                      background: "var(--glass-bg)",
                      backdropFilter: "blur(6px)",
                      padding: "16px",
                    }}
                  >
                    <div
                      className="fmc-eyebrow-mono"
                      style={{ marginBottom: "8px", color: "var(--ink)" }}
                    >
                      Fitur Pro
                    </div>
                    <p
                      className="fmc-body--sm"
                      style={{ marginBottom: "16px", textAlign: "center" }}
                    >
                      Upgrade untuk melihat instruksi barber & tips styling lengkap.
                    </p>
                    <button
                      className="fmc-button--primary"
                      onClick={() => setPaymentStatus("checkout")}
                    >
                      Unlock Pro
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Exclusive Card template for Export (Horizontal) */}
          <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <div
              ref={exportRef}
              style={{
                background: "#0a0a0a",
                width: "1080px",
                height: "600px",
                display: "flex",
                flexDirection: "row",
                borderRadius: "24px",
                border: "1px solid #212327",
                overflow: "hidden",
                boxShadow: "0 0 80px rgba(255,255,255,0.05)",
                fontFamily: "var(--font-sans)",
                color: "#ffffff",
              }}
            >
              {/* Left Side: Images Stack */}
              <div style={{ position: "relative", width: "600px", height: "100%", flexShrink: 0 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2px",
                    width: "100%",
                    height: "100%",
                    background: "var(--hairline)",
                  }}
                >
                  {/* Front */}
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <img
                      src={selectedPreviewData.url}
                      alt="Front"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      crossOrigin="anonymous"
                    />
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
                      }}
                    >
                      FRONT
                    </div>
                  </div>
                  {/* Left */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={selectedPreviewData.angles.left}
                      className={paymentStatus !== "unlocked" ? "fmc-locked-overlay__blur" : ""}
                      alt="Left"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      crossOrigin="anonymous"
                    />
                    {paymentStatus !== "unlocked" && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          placeContent: "center",
                          placeItems: "center",
                          background: "rgba(0,0,0,0.3)",
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          color="white"
                        >
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
                        zIndex: 10,
                      }}
                    >
                      LEFT
                    </div>
                  </div>
                  {/* Right */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={selectedPreviewData.angles.right}
                      className={paymentStatus !== "unlocked" ? "fmc-locked-overlay__blur" : ""}
                      alt="Right"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      crossOrigin="anonymous"
                    />
                    {paymentStatus !== "unlocked" && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          placeContent: "center",
                          placeItems: "center",
                          background: "rgba(0,0,0,0.3)",
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          color="white"
                        >
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
                        zIndex: 10,
                      }}
                    >
                      RIGHT
                    </div>
                  </div>
                  {/* Back */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={selectedPreviewData.angles.back}
                      className={paymentStatus !== "unlocked" ? "fmc-locked-overlay__blur" : ""}
                      alt="Back"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      crossOrigin="anonymous"
                    />
                    {paymentStatus !== "unlocked" && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          placeContent: "center",
                          placeItems: "center",
                          background: "rgba(0,0,0,0.3)",
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          color="white"
                        >
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
                        zIndex: 10,
                      }}
                    >
                      BACK
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "32px",
                    left: "32px",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    border: "4px solid #0a0a0a",
                    overflow: "hidden",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
                    zIndex: 20,
                  }}
                >
                  <img
                    src={selectedFace!}
                    alt="You"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Fade to right (into the solid #0a0a0a right section) */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: "120px",
                    background: "linear-gradient(to right, transparent, #0a0a0a)",
                    zIndex: 15,
                  }}
                ></div>
                {/* Fade to bottom (aesthetic) */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "120px",
                    background: "linear-gradient(transparent, #0a0a0a)",
                    zIndex: 15,
                  }}
                ></div>
              </div>

              {/* Right Side: Info & Details */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  background: "#0a0a0a",
                  zIndex: 10,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "32px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #212327",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "14px",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: "#7d8187",
                    }}
                  >
                    findmycut
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#22c55e",
                      fontWeight: 500,
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      padding: "4px 12px",
                      borderRadius: "99px",
                      background: "rgba(34, 197, 94, 0.1)",
                    }}
                  >
                    {selectedPreviewData.confidence}% Match
                  </div>
                </div>

                {/* Content */}
                <div
                  style={{
                    padding: "48px 32px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "40px",
                      fontWeight: 400,
                      letterSpacing: "-1px",
                      margin: "0 0 32px 0",
                    }}
                  >
                    {selectedPreviewData.style}
                  </h2>

                  {paymentStatus === "unlocked" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            letterSpacing: "1px",
                            color: "#7d8187",
                            textTransform: "uppercase",
                            marginBottom: "8px",
                          }}
                        >
                          Sides & Top
                        </div>
                        <div style={{ fontSize: "16px", color: "#dadbdf" }}>
                          Sides: {selectedPreviewData.sides}
                          <br />
                          <br />
                          Top: {selectedPreviewData.top}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            letterSpacing: "1px",
                            color: "#7d8187",
                            textTransform: "uppercase",
                            marginBottom: "8px",
                          }}
                        >
                          Finish & Styling
                        </div>
                        <div style={{ fontSize: "16px", color: "#dadbdf", lineHeight: "1.5" }}>
                          {selectedPreviewData.finish}. {selectedPreviewData.maintenance}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "32px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "16px",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "18px",
                          color: "#7d8187",
                          textAlign: "center",
                          lineHeight: "1.6",
                        }}
                      >
                        Instruksi barber dan tips styling dikunci. Upgrade ke Pro di{" "}
                        <strong style={{ color: "white" }}>findmycut</strong> untuk melihat
                        detail selengkapnya.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Export Button */}
          <div className="fmc-layout__bottom-action">
            <button
              className="fmc-button--primary"
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "16px",
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={exportResultCard}
              disabled={isExporting}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {isExporting ? "Generating Card..." : "Save to Gallery"}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Bottom Sheet overlay */}
      {paymentStatus === "checkout" && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 90,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setPaymentStatus("locked")}
          />
          {/* Bottom Sheet */}
          <div className="fmc-bottom-sheet" style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "32px",
              }}
            >
              <div className="fmc-display--xs">Select Plan</div>
              <button
                onClick={() => setPaymentStatus("locked")}
                style={{ background: "transparent", border: "none", color: "var(--body)" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "32px",
              }}
            >
              <div
                className={`fmc-card ${selectedTier === "pro" ? "fmc-card--featured" : ""}`}
                style={{ padding: "16px", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => setSelectedTier("pro")}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div
                      className="fmc-body--md"
                      style={{
                        fontWeight: 500,
                        color: selectedTier === "pro" ? "var(--canvas)" : "var(--ink)",
                      }}
                    >
                      Pro Access
                    </div>
                    <div
                      className="fmc-body--sm"
                      style={{
                        color: selectedTier === "pro" ? "var(--canvas-mid)" : "var(--body-mid)",
                      }}
                    >
                      All styles & instructions
                    </div>
                  </div>
                  <div
                    className="fmc-body--md"
                    style={{
                      fontWeight: 500,
                      color: selectedTier === "pro" ? "var(--canvas)" : "var(--ink)",
                    }}
                  >
                    Rp 15k
                  </div>
                </div>
              </div>

              <div
                className={`fmc-card ${selectedTier === "platinum" ? "fmc-card--featured" : ""}`}
                style={{ padding: "16px", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => setSelectedTier("platinum")}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div
                      className="fmc-body--md"
                      style={{
                        fontWeight: 500,
                        color: selectedTier === "platinum" ? "var(--canvas)" : "var(--ink)",
                      }}
                    >
                      Platinum Pass
                    </div>
                    <div
                      className="fmc-body--sm"
                      style={{
                        color:
                          selectedTier === "platinum" ? "var(--canvas-mid)" : "var(--body-mid)",
                      }}
                    >
                      Pro + 10x Regenerate
                    </div>
                  </div>
                  <div
                    className="fmc-body--md"
                    style={{
                      fontWeight: 500,
                      color: selectedTier === "platinum" ? "var(--canvas)" : "var(--ink)",
                    }}
                  >
                    Rp 25k
                  </div>
                </div>
              </div>
            </div>

            <button
              className="fmc-button--primary"
              style={{ width: "100%", padding: "16px", fontSize: "16px" }}
              onClick={processPayment}
            >
              Simulate Payment
            </button>
          </div>
        </>
      )}

      {/* WebRTC Camera Overlay */}
      {isCameraActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "#0a0a0a",
            display: "flex",
            flexDirection: "column",
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
              borderBottom: "1px solid #212327",
            }}
          >
            <div style={{ fontWeight: 500, color: "white", fontSize: "16px" }}>
              {currentCaptureAngle === "depan"
                ? "Ambil Selfie"
                : `Ambil Foto Tampak ${currentCaptureAngle.toUpperCase()}`}
            </div>
            <button
              onClick={closeCamera}
              style={{ background: "transparent", border: "none", color: "white", padding: "8px" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {currentCaptureAngle !== "depan" && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.15)",
                borderBottom: "1px solid rgba(34, 197, 94, 0.25)",
                padding: "10px 24px",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "500",
                fontFamily: "var(--font-mono)",
                color: "#22c55e",
              }}
            >
              PRO MODE: Silakan hadap ke {currentCaptureAngle.toUpperCase()} dan jepret!
            </div>
          )}

          {/* Video Stream */}
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "#000",
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            {/* Guide overlay */}
            <div
              style={{
                position: "absolute",
                top: "10%",
                bottom: "20%",
                left: "15%",
                right: "15%",
                border: "2px dashed rgba(255,255,255,0.4)",
                borderRadius: "200px 200px 150px 150px",
                pointerEvents: "none",
              }}
            ></div>
          </div>

          {/* Controls */}
          <div
            style={{
              padding: "48px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "#0a0a0a",
            }}
          >
            <button
              onClick={capturePhoto}
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "white",
                border: "4px solid #0a0a0a",
                boxShadow: "0 0 0 4px white",
                cursor: "pointer",
                transition: "transform 0.1s",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}

      {/* Multi-Angle Scan Upgrade Popup */}
      {isMultiAnglePopupOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 110,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Modal Body */}
            <div
              className="fmc-card"
              style={{
                width: "90%",
                maxWidth: "400px",
                background: "#0f0f0f",
                border: "1px solid #212327",
                borderRadius: "16px",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Icon Container */}
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  color: "white",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>

              {/* Title */}
              <h3
                className="fmc-display--xs"
                style={{ marginBottom: "12px", fontWeight: "500", color: "white" }}
              >
                Aktifkan Multi-Angle Scan (Pro)
              </h3>

              {/* Description */}
              <p
                className="fmc-body--sm"
                style={{ color: "var(--body-mid)", marginBottom: "24px", lineHeight: "1.5" }}
              >
                Untuk akurasi rekomendasi hingga 99%, AI kami memindai wajah dari 4 arah (**Depan,
                Kanan, Kiri, Belakang**).
              </p>

              {/* Angles Mini Preview Representation */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                  width: "100%",
                  marginBottom: "32px",
                }}
              >
                {[
                  { label: "Depan", isPro: false, bg: pendingFaceUrl || "" },
                  { label: "Kanan", isPro: true, bg: "" },
                  { label: "Kiri", isPro: true, bg: "" },
                  { label: "Belakang", isPro: true, bg: "" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "8px",
                      background: item.bg ? `url(${item.bg}) center/cover no-repeat` : "#1a1a1a",
                      border: "1px solid #2d2f34",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {!item.bg && (
                      <span
                        style={{ fontSize: "10px", color: "var(--body-mid)", fontWeight: "500" }}
                      >
                        {item.label}
                      </span>
                    )}
                    {item.isPro && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{ color: "white" }}
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                <button
                  className="fmc-button--primary"
                  style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "500" }}
                  onClick={() => {
                    setIsMultiAnglePopupOpen(false);
                    setCurrentCaptureAngle("kanan");
                    void startCamera();
                  }}
                >
                  Dapatkan Akses Pro
                </button>
                <button
                  className="fmc-button--outline"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    borderColor: "transparent",
                  }}
                  onClick={() => {
                    setIsMultiAnglePopupOpen(false);
                    if (pendingFaceUrl) {
                      handleSelectFace(pendingFaceUrl);
                    }
                  }}
                >
                  Lanjutkan Tampak Depan Saja
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Login Suggestion Popup */}
      {isLoginPopupOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 110,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Modal Body */}
            <div
              className="fmc-card"
              style={{
                width: "90%",
                maxWidth: "400px",
                background: "#0f0f0f",
                border: "1px solid #212327",
                borderRadius: "16px",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Icon Container */}
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  color: "white",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              {/* Title */}
              <h3
                className="fmc-display--xs"
                style={{ marginBottom: "12px", fontWeight: "500", color: "white" }}
              >
                Simpan Riwayat Potongan Anda
              </h3>

              {/* Description */}
              <p
                className="fmc-body--sm"
                style={{ color: "var(--body-mid)", marginBottom: "32px", lineHeight: "1.5" }}
              >
                Masuk dengan Google agar Anda dapat menyimpan hasil analisis bentuk wajah dan
                riwayat rekomendasi potongan rambut secara permanen.
              </p>

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                <button
                  className="fmc-button--primary"
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onClick={() => {
                    setUser({
                      name: "Alex",
                      email: "alex@gmail.com",
                      photo:
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop",
                    });
                    setIsLoginPopupOpen(false);
                    handleStart();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Masuk dengan Google
                </button>
                <button
                  className="fmc-button--outline"
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: "14px",
                    borderColor: "transparent",
                  }}
                  onClick={() => {
                    setIsLoginPopupOpen(false);
                    handleStart();
                  }}
                >
                  Tetap Lanjutkan Tanpa Masuk
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;

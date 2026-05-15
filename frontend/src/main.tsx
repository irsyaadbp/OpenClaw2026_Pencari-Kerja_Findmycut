import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Versi terbaru tersedia. Muat ulang sekarang?")) {
      void updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("Aplikasi siap digunakan offline.");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

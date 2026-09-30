import React from "react";
import ReactDOM from "react-dom/client";
import { wakeApi } from "./api/client";
import App from "./App";
import "./i18n";
import "./styles/index.css";
import "./styles/refined.css";

wakeApi();
setInterval(wakeApi, 4 * 60 * 1000);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker'ı yalnızca üretim build'inde kaydet — Vite'ın geliştirme
// sunucusundaki modül yeniden yükleme/HMR akışıyla çakışmaması için.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

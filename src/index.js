import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// Register service worker (PWA) — only in production build to avoid dev HMR conflicts
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then((reg) => {
                // Check for updates periodically while the app is open
                setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
            })
            .catch(() => {
                // Silent — PWA install is optional
            });
    });
}

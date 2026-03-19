"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "void-survivors-cookie-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "rgba(10, 10, 18, 0.95)",
        borderTop: "1px solid #00f0ff",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        flexWrap: "wrap",
        fontSize: "13px",
        color: "#aaa",
        animation: "cookieBannerSlideUp 0.3s ease-out",
      }}
    >
      <style>{`@keyframes cookieBannerSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <span>
        This site uses essential browser storage (localStorage) for game saves.
        No tracking cookies are used.
      </span>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "1px solid #00f0ff",
            color: "#00f0ff",
            padding: "4px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Got it
        </button>
        <a
          href="/legal/privacy"
          style={{
            color: "#666",
            textDecoration: "underline",
            fontSize: "12px",
          }}
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
}

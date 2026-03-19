import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Navigation bar */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "rgba(10, 10, 18, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
        }}
      >
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--neon-cyan)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12L6 8l4-4" />
            </svg>
            Back to game
          </Link>

          <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(224, 224, 240, 0.5)" }}>
            <Link href="/legal/privacy" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>
              Privacy
            </Link>
            <Link href="/legal/terms" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>
              Terms
            </Link>
            <Link href="/legal/impressum" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>
              Impressum
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">{children}</main>

      {/* Footer */}
      <footer
        className="text-center text-xs py-8 px-6"
        style={{
          color: "rgba(224, 224, 240, 0.35)",
          borderTop: "1px solid rgba(0, 240, 255, 0.08)",
        }}
      >
        &copy; {new Date().getFullYear()} Prometheus Digital Kft. All rights reserved.
      </footer>
    </div>
  );
}

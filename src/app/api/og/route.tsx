import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a12",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 70%)",
            top: -100,
            left: -100,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,0,170,0.12) 0%, transparent 70%)",
            bottom: -50,
            right: -50,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(170,68,255,0.1) 0%, transparent 70%)",
            top: 200,
            right: 300,
            display: "flex",
          }}
        />

        {/* Geometric shapes */}
        <div
          style={{
            position: "absolute",
            width: 60,
            height: 60,
            border: "2px solid rgba(0,240,255,0.25)",
            transform: "rotate(45deg)",
            top: 80,
            left: 120,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "2px solid rgba(255,0,170,0.2)",
            bottom: 120,
            right: 200,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 50,
            height: 50,
            border: "2px solid rgba(170,68,255,0.2)",
            transform: "rotate(30deg)",
            top: 150,
            right: 140,
            display: "flex",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #00f0ff 0%, #aa44ff 50%, #ff00aa 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
            marginBottom: 16,
          }}
        >
          VOID SURVIVORS
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(224,224,240,0.6)",
            display: "flex",
            letterSpacing: "0.05em",
          }}
        >
          A Neon Roguelike in Your Browser
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 18,
            color: "rgba(224,224,240,0.35)",
            display: "flex",
            marginTop: 24,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          No Downloads - Free to Play - Instant Action
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #00f0ff, #aa44ff, #ff00aa, #00f0ff)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

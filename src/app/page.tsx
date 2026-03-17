import Link from "next/link";

// ---------------------------------------------------------------------------
// Floating geometric shapes (CSS-only, no images)
// ---------------------------------------------------------------------------
function FloatingShape({
  shape,
  size,
  color,
  top,
  left,
  delay,
  duration,
}: {
  shape: "triangle" | "pentagon" | "hexagon" | "circle" | "diamond";
  size: number;
  color: string;
  top: string;
  left: string;
  delay: string;
  duration: string;
}) {
  const shapeStyles: Record<string, React.CSSProperties> = {
    triangle: {
      width: 0,
      height: 0,
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderBottomColor: color,
      filter: `drop-shadow(0 0 8px ${color})`,
      background: "none",
    },
    pentagon: {
      width: size,
      height: size,
      clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
      background: color,
      filter: `drop-shadow(0 0 8px ${color})`,
      opacity: 0.15,
    },
    hexagon: {
      width: size,
      height: size,
      clipPath:
        "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      background: color,
      filter: `drop-shadow(0 0 8px ${color})`,
      opacity: 0.15,
    },
    circle: {
      width: size,
      height: size,
      borderRadius: "50%",
      border: `2px solid ${color}`,
      background: "transparent",
      filter: `drop-shadow(0 0 6px ${color})`,
      opacity: 0.2,
    },
    diamond: {
      width: size,
      height: size,
      transform: "rotate(45deg)",
      border: `2px solid ${color}`,
      background: "transparent",
      filter: `drop-shadow(0 0 6px ${color})`,
      opacity: 0.15,
    },
  };

  return (
    <div
      className="animate-drift"
      style={{
        position: "absolute",
        top,
        left,
        animationDelay: delay,
        animationDuration: duration,
        pointerEvents: "none",
        zIndex: 0,
        ...shapeStyles[shape],
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="glass"
      style={{
        padding: "28px 24px",
        borderRadius: 14,
        flex: "1 1 220px",
        maxWidth: 280,
        textAlign: "center",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>{icon}</div>
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#00f0ff",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "0.9rem",
          color: "rgba(224, 224, 240, 0.55)",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step card for "How to Play"
// ---------------------------------------------------------------------------
function StepCard({
  step,
  icon,
  text,
}: {
  step: number;
  icon: string;
  text: string;
}) {
  return (
    <div style={{ textAlign: "center", flex: "1 1 180px", maxWidth: 240 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "2px solid rgba(0, 240, 255, 0.3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.6rem",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.15em",
          color: "rgba(0, 240, 255, 0.5)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Step {step}
      </div>
      <p
        style={{
          fontSize: "0.95rem",
          color: "rgba(224, 224, 240, 0.7)",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------
export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a12",
        color: "#e0e0f0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background shapes */}
      <FloatingShape shape="hexagon" size={60} color="#00f0ff" top="10%" left="8%" delay="0s" duration="18s" />
      <FloatingShape shape="triangle" size={40} color="#ff00aa" top="20%" left="85%" delay="3s" duration="22s" />
      <FloatingShape shape="pentagon" size={50} color="#aa44ff" top="55%" left="5%" delay="6s" duration="20s" />
      <FloatingShape shape="circle" size={35} color="#00ff88" top="70%" left="90%" delay="2s" duration="16s" />
      <FloatingShape shape="diamond" size={30} color="#ff8800" top="40%" left="75%" delay="5s" duration="24s" />
      <FloatingShape shape="hexagon" size={45} color="#ff00aa" top="80%" left="50%" delay="8s" duration="19s" />
      <FloatingShape shape="triangle" size={28} color="#00f0ff" top="15%" left="55%" delay="1s" duration="21s" />
      <FloatingShape shape="circle" size={50} color="#aa44ff" top="85%" left="15%" delay="4s" duration="17s" />
      <FloatingShape shape="pentagon" size={35} color="#00f0ff" top="45%" left="40%" delay="7s" duration="23s" />
      <FloatingShape shape="diamond" size={40} color="#ff00aa" top="30%" left="25%" delay="9s" duration="25s" />

      {/* ===================== Header ===================== */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px clamp(20px, 5vw, 60px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="glow-cyan"
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "#00f0ff",
          }}
        >
          VOID SURVIVORS
        </span>
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a
            href="#features"
            style={{
              color: "rgba(224,224,240,0.5)",
              textDecoration: "none",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              transition: "color 0.2s",
            }}
          >
            Features
          </a>
          <a
            href="#how-to-play"
            style={{
              color: "rgba(224,224,240,0.5)",
              textDecoration: "none",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              transition: "color 0.2s",
            }}
          >
            How to Play
          </a>
          <Link
            href="/play"
            className="btn-neon"
            style={{ padding: "8px 20px", fontSize: "0.85rem" }}
          >
            PLAY
          </Link>
        </nav>
      </header>

      {/* ===================== Hero ===================== */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "clamp(80px, 15vh, 160px) 24px clamp(60px, 12vh, 120px)",
        }}
      >
        <h1
          className="gradient-text"
          style={{
            fontSize: "clamp(2.8rem, 8vw, 5.5rem)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Survive the Void
        </h1>

        <p
          style={{
            maxWidth: 600,
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "rgba(224, 224, 240, 0.55)",
            lineHeight: 1.7,
            marginTop: 24,
          }}
        >
          A handcrafted roguelike survivors game running entirely in your
          browser. No downloads. No installs. Just pure neon chaos.
        </p>

        <Link
          href="/play"
          className="btn-neon-filled animate-pulse-glow"
          style={{ marginTop: 40 }}
        >
          PLAY NOW
        </Link>

        {/* Decorative line */}
        <div
          style={{
            width: 80,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, #00f0ff, transparent)",
            marginTop: 60,
            borderRadius: 1,
          }}
          aria-hidden="true"
        />
      </section>

      {/* ===================== Features ===================== */}
      <section
        id="features"
        style={{
          position: "relative",
          zIndex: 10,
          padding: "80px clamp(20px, 5vw, 60px)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
            fontWeight: 800,
            color: "#e0e0f0",
            marginBottom: 48,
            letterSpacing: "0.03em",
          }}
        >
          Why You&apos;ll Love It
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "center",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <FeatureCard
            icon={"🌊"}
            title="Endless Waves"
            description="Procedurally generated enemy waves that scale with your power. No two runs are the same."
          />
          <FeatureCard
            icon={"⚡"}
            title="8 Unique Abilities"
            description="Chain Lightning, Orbit Shield, Missile Swarm and more. Mix and match to create devastating builds."
          />
          <FeatureCard
            icon={"🌐"}
            title="Zero Downloads"
            description="Runs entirely in your browser, on any device. Jump in instantly from desktop or mobile."
          />
          <FeatureCard
            icon={"✨"}
            title="Neon Aesthetic"
            description="A visual feast of glowing geometry and particle effects. Every explosion is a light show."
          />
        </div>
      </section>

      {/* ===================== How to Play ===================== */}
      <section
        id="how-to-play"
        style={{
          position: "relative",
          zIndex: 10,
          padding: "80px clamp(20px, 5vw, 60px)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
            fontWeight: 800,
            color: "#e0e0f0",
            marginBottom: 48,
            letterSpacing: "0.03em",
          }}
        >
          How to Play
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 40,
            justifyContent: "center",
            maxWidth: 900,
            margin: "0 auto",
            alignItems: "flex-start",
          }}
        >
          <StepCard
            step={1}
            icon={"🎮"}
            text="Move with WASD or virtual joystick on mobile"
          />

          {/* Arrow connector */}
          <div
            style={{
              alignSelf: "center",
              color: "rgba(0,240,255,0.3)",
              fontSize: "1.5rem",
            }}
            aria-hidden="true"
          >
            &rarr;
          </div>

          <StepCard
            step={2}
            icon={"💥"}
            text="Your abilities fire automatically at nearby enemies"
          />

          <div
            style={{
              alignSelf: "center",
              color: "rgba(0,240,255,0.3)",
              fontSize: "1.5rem",
            }}
            aria-hidden="true"
          >
            &rarr;
          </div>

          <StepCard
            step={3}
            icon={"⬆️"}
            text="Level up and choose powerful upgrades to survive longer"
          />
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "80px 24px",
        }}
      >
        <h2
          className="gradient-text"
          style={{
            fontSize: "clamp(1.8rem, 5vw, 3rem)",
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          Ready to enter the void?
        </h2>
        <p
          style={{
            color: "rgba(224,224,240,0.45)",
            marginBottom: 32,
            fontSize: "1rem",
          }}
        >
          No signup required. Just click and play.
        </p>
        <Link href="/play" className="btn-neon-filled">
          PLAY NOW
        </Link>
      </section>

      {/* ===================== Footer ===================== */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "32px clamp(20px, 5vw, 60px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            color: "rgba(224,224,240,0.3)",
          }}
        >
          Built by Prometheus Digital Kft.
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            color: "rgba(224,224,240,0.2)",
            fontStyle: "italic",
          }}
        >
          Powered by pure math and geometry
        </span>
      </footer>
    </div>
  );
}

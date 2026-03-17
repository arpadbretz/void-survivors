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
            aria-label="View game features"
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
            aria-label="Learn how to play Void Survivors"
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
          <a
            href="#controls"
            aria-label="View keyboard controls"
            style={{
              color: "rgba(224,224,240,0.5)",
              textDecoration: "none",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              transition: "color 0.2s",
            }}
          >
            Controls
          </a>
          <a
            href="#whats-new"
            aria-label="See latest updates and patch notes"
            style={{
              color: "rgba(224,224,240,0.5)",
              textDecoration: "none",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              transition: "color 0.2s",
            }}
          >
            What&apos;s New
          </a>
          <a
            href="#faq"
            aria-label="Frequently asked questions about Void Survivors"
            style={{
              color: "rgba(224,224,240,0.5)",
              textDecoration: "none",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              transition: "color 0.2s",
            }}
          >
            FAQ
          </a>
          <Link
            href="/play"
            className="btn-neon"
            aria-label="Play Void Survivors now"
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
          aria-label="Play Void Survivors now - free browser game"
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
            icon={"⚡"}
            title="10 Abilities + 5 Evolutions"
            description="Chain Lightning, Orbit Shield, Missile Swarm, Gravity Well and more. Max out abilities to unlock powerful Evolutions like Singularity that transform your build."
          />
          <FeatureCard
            icon={"👾"}
            title="7 Enemy Types + Elites + 3 Boss Variants"
            description="Face 7 enemy types with Elite variants, plus 3 unique bosses — the towering Titan, the projectile-spewing Harbinger, and the teleporting Nexus. Every wave tests your reflexes."
          />
          <FeatureCard
            icon={"🏆"}
            title="40 Achievements"
            description="Track your progress with milestones for kills, waves, combos, boss defeats, and more. How many can you unlock?"
          />
          <FeatureCard
            icon={"✨"}
            title="Meta-Progression"
            description="Earn Void Essence from every run. Spend it on permanent upgrades to health, damage, speed, armor, and XP gain."
          />
          <FeatureCard
            icon={"🌊"}
            title="Wave Events"
            description="Dynamic wave events including Swarm Rush, Tank Parade, and Speed Frenzy keep every run feeling fresh."
          />
          <FeatureCard
            icon={"☠️"}
            title="Environmental Hazards"
            description="Dodge Void Rifts that pull you in, sidestep corrosive Plasma Pools, and escape Gravity Anomalies that warp your movement."
          />
          <FeatureCard
            icon={"🎁"}
            title="Boss Loot Drops"
            description="Defeat bosses to earn powerful loot — Health Packs, Smart Bombs, Magnet Pulses, and Shields that turn the tide of battle."
          />
          <FeatureCard
            icon={"🎭"}
            title="3 Characters"
            description="Choose from 3 unique characters, each with different starting abilities and playstyles. Unlock more as you play."
          />
          <FeatureCard
            icon={"🌐"}
            title="Zero Downloads"
            description="Runs entirely in your browser, on any device. Jump in instantly from desktop or mobile."
          />
          <FeatureCard
            icon={"🔊"}
            title="Settings & Audio"
            description="Fine-tune your experience with volume controls, separate SFX and music sliders, and display options to suit your setup."
          />
          <FeatureCard
            icon={"💎"}
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
            text="Move with WASD or Arrow keys. Press SPACE to dash through danger. On mobile, use the virtual joystick."
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
            text="Your abilities auto-attack nearby enemies. Collect XP orbs they drop to fill your level bar."
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
            text="Choose upgrades between levels. Stack abilities, unlock evolutions, and survive as long as possible."
          />
        </div>
      </section>

      {/* ===================== Keyboard Shortcuts ===================== */}
      <section
        id="controls"
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
            marginBottom: 16,
            letterSpacing: "0.03em",
          }}
        >
          Keyboard Shortcuts
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "rgba(224,224,240,0.45)",
            fontSize: "0.95rem",
            marginBottom: 40,
          }}
        >
          Master the controls and dominate the void
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          {/* Movement */}
          <div
            className="glass"
            style={{
              padding: "20px 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {["W", "A", "S", "D"].map((key) => (
                <kbd
                  key={key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: "1px solid rgba(0, 240, 255, 0.35)",
                    background: "rgba(0, 240, 255, 0.07)",
                    color: "#00f0ff",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono), monospace",
                    boxShadow: "0 0 8px rgba(0, 240, 255, 0.15)",
                  }}
                >
                  {key}
                </kbd>
              ))}
            </div>
            <span style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.85rem" }}>
              Move
            </span>
          </div>

          {/* Pause */}
          <div
            className="glass"
            style={{
              padding: "20px 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <kbd
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 48,
                height: 32,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid rgba(255, 0, 170, 0.35)",
                background: "rgba(255, 0, 170, 0.07)",
                color: "#ff00aa",
                fontSize: "0.75rem",
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono), monospace",
                boxShadow: "0 0 8px rgba(255, 0, 170, 0.15)",
              }}
            >
              ESC
            </kbd>
            <span style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.85rem" }}>
              Pause
            </span>
          </div>

          {/* Mute */}
          <div
            className="glass"
            style={{
              padding: "20px 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <kbd
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid rgba(170, 68, 255, 0.35)",
                background: "rgba(170, 68, 255, 0.07)",
                color: "#aa44ff",
                fontSize: "0.8rem",
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono), monospace",
                boxShadow: "0 0 8px rgba(170, 68, 255, 0.15)",
              }}
            >
              M
            </kbd>
            <span style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.85rem" }}>
              Mute audio
            </span>
          </div>

          {/* Upgrade selection */}
          <div
            className="glass"
            style={{
              padding: "20px 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {["1", "2", "3"].map((key) => (
                <kbd
                  key={key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: "1px solid rgba(0, 255, 136, 0.35)",
                    background: "rgba(0, 255, 136, 0.07)",
                    color: "#00ff88",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-mono), monospace",
                    boxShadow: "0 0 8px rgba(0, 255, 136, 0.15)",
                  }}
                >
                  {key}
                </kbd>
              ))}
            </div>
            <span style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.85rem" }}>
              Select upgrade
            </span>
          </div>
          {/* Dash */}
          <div
            className="glass"
            style={{
              padding: "20px 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <kbd
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 56,
                height: 32,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid rgba(255, 136, 0, 0.35)",
                background: "rgba(255, 136, 0, 0.07)",
                color: "#ff8800",
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono), monospace",
                boxShadow: "0 0 8px rgba(255, 136, 0, 0.15)",
              }}
            >
              SPACE
            </kbd>
            <span style={{ color: "rgba(224,224,240,0.6)", fontSize: "0.85rem" }}>
              Dash
            </span>
          </div>
        </div>
      </section>

      {/* ===================== What's New ===================== */}
      <section
        id="whats-new"
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
          What&apos;s New
        </h2>

        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #00f0ff",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#00f0ff",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v1.8 &mdash; Latest
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Ability Synergies, Global Leaderboard &amp; Visual Polish. Six ability synergy combos with passive bonuses, a cross-player leaderboard with daily rankings, enhanced orbit shield visuals, and nebula-filled cosmic backgrounds.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #00f0ff",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#00f0ff",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v1.5
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Difficulty Modes, Combo System &amp; Run History. Four difficulty levels with score multipliers, endless late-game scaling, visual combo multiplier, and detailed run history with progress tracking.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #00f0ff",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#00f0ff",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v1.3
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Boss Variety, Loot Drops &amp; Hazards. Three boss variants (Titan, Harbinger, Nexus), boss loot drops including Smart Bombs and Shields, and environmental hazards like Void Rifts and Gravity Anomalies.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #00f0ff",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#00f0ff",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v1.2
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Phantom Enemy, Gravity Well &amp; Settings. A new ghostly Phantom enemy type, the Gravity Well ability with its Singularity evolution, and a full settings menu with volume controls and display options.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #00f0ff",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#00f0ff",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v0.8
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Elite Enemies &amp; Wave Events. Elites bring tougher fights and bigger rewards. Dynamic wave events like Swarm Rush and Speed Frenzy keep every run unique.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #aa44ff",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#aa44ff",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v0.7
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Weapon Evolutions &amp; Mobile Controls. Max out abilities to unlock devastating evolved forms. Full touch controls with virtual joystick.
            </p>
          </div>

          <div
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              borderLeft: "3px solid #ff00aa",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                color: "#ff00aa",
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              v0.6
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Meta-Progression &amp; Upgrades Shop. Earn Void Essence and spend it on permanent stat boosts that carry across runs.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section
        id="faq"
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
          Frequently Asked Questions
        </h2>

        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Is Void Survivors free?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              Yes! Void Survivors is 100% free to play with no ads, no microtransactions, and no account required. Just open the game in your browser and start playing instantly.
            </p>
          </details>

          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Does it work on mobile?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              Yes! The game features touch controls with a virtual joystick and dash button. Install it as a PWA for the best mobile experience with offline play support.
            </p>
          </details>

          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Do I need to download anything?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              No. Void Survivors runs entirely in your browser with no downloads or plugins required. You can optionally install it as a Progressive Web App for offline play.
            </p>
          </details>

          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              How many characters are there?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              There are 3 playable characters, each with unique stats and starting abilities: Void Walker, Phantom, and Sentinel. Each character offers a different playstyle.
            </p>
          </details>

          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              What&apos;s the Daily Challenge?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              Every day features a new challenge with unique modifiers that change how the game plays. Compete against yourself for the best daily score!
            </p>
          </details>

          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              What are Ability Synergies?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              Certain ability combinations unlock powerful synergy bonuses. For example, pairing Chain Lightning with Frost Aura activates the Elemental Storm synergy for bonus damage. Look for the golden synergy badge when choosing upgrades!
            </p>
          </details>

          <details
            className="glass"
            style={{
              padding: "0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#00f0ff",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Is there a global leaderboard?
            </summary>
            <p
              style={{
                padding: "0 24px 20px",
                margin: 0,
                fontSize: "0.95rem",
                color: "rgba(224,224,240,0.65)",
                lineHeight: 1.6,
              }}
            >
              Yes! Compete with players worldwide on both all-time and daily leaderboards. Set your player name in the game menu and your best scores are automatically submitted after each run.
            </p>
          </details>
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
        <Link href="/play" className="btn-neon-filled" aria-label="Play Void Survivors now">
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

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum — Void Survivors",
  description:
    "Legal notice and company information for Void Survivors by Prometheus Digital Kft.",
};

/* ------------------------------------------------------------------ */
/*  Shared inline styles                                               */
/* ------------------------------------------------------------------ */

const heading1: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 800,
  letterSpacing: "0.04em",
  marginBottom: "0.5rem",
  background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const heading2: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--neon-cyan)",
  marginTop: "2.5rem",
  marginBottom: "0.75rem",
};

const paragraph: React.CSSProperties = {
  lineHeight: 1.75,
  color: "rgba(224, 224, 240, 0.8)",
  marginBottom: "1rem",
};

const codeInline: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: "0.875em",
  background: "rgba(0, 240, 255, 0.08)",
  border: "1px solid rgba(0, 240, 255, 0.15)",
  borderRadius: "4px",
  padding: "2px 6px",
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(0, 240, 255, 0.12)",
  margin: "3rem 0",
};

const sectionBox: React.CSSProperties = {
  background: "rgba(20, 20, 40, 0.5)",
  border: "1px solid rgba(0, 240, 255, 0.12)",
  borderRadius: "10px",
  padding: "1.25rem 1.5rem",
  marginBottom: "1rem",
};

const labelStyle: React.CSSProperties = {
  color: "rgba(224, 224, 240, 0.5)",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: "0.25rem",
};

const valueStyle: React.CSSProperties = {
  color: "rgba(224, 224, 240, 0.9)",
  marginBottom: "1rem",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ImpressumPage() {
  return (
    <article>
      {/* ============================================================ */}
      {/*  ENGLISH                                                      */}
      {/* ============================================================ */}
      <header>
        <h1 style={heading1}>Impressum</h1>
        <p style={{ ...paragraph, fontSize: "0.875rem", color: "rgba(224,224,240,0.5)" }}>
          Legal Notice / Imprint
        </p>
      </header>

      <h2 style={heading2}>Company Information</h2>
      <div style={sectionBox}>
        <p style={labelStyle}>Company Name</p>
        <p style={valueStyle}>
          <strong>Prometheus Digital Kft.</strong>
        </p>

        <p style={labelStyle}>Registration Number</p>
        <p style={valueStyle}>
          <span style={codeInline}>01-09-434076</span>
        </p>

        <p style={labelStyle}>Tax Identification Number</p>
        <p style={valueStyle}>
          <span style={codeInline}>32910128-2-43</span>
        </p>

        <p style={labelStyle}>Registered Address</p>
        <p style={valueStyle}>1125 Budapest, Habl&eacute;any utca 6/A, Hungary</p>

        <p style={labelStyle}>Email</p>
        <p style={valueStyle}>
          <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
            info@prometheusdigital.hu
          </a>
        </p>

        <p style={labelStyle}>Phone</p>
        <p style={valueStyle}>+36 30 922 2042</p>

        <p style={labelStyle}>Managing Director</p>
        <p style={{ ...valueStyle, marginBottom: 0 }}>Bretz &Aacute;rp&aacute;d</p>
      </div>

      <h2 style={heading2}>Hosting Provider</h2>
      <div style={sectionBox}>
        <p style={labelStyle}>Provider</p>
        <p style={valueStyle}>
          <strong>Vercel Inc.</strong>
        </p>

        <p style={labelStyle}>Address</p>
        <p style={valueStyle}>340 S Lemon Ave #4133 Walnut, CA 91789, USA</p>

        <p style={labelStyle}>Contact</p>
        <p style={{ ...valueStyle, marginBottom: 0 }}>
          <a href="mailto:privacy@vercel.com" style={{ color: "var(--neon-cyan)" }}>
            privacy@vercel.com
          </a>
        </p>
      </div>

      <h2 style={heading2}>Supervisory Authority</h2>
      <div style={sectionBox}>
        <p style={labelStyle}>Authority</p>
        <p style={valueStyle}>
          <strong>
            Nemzeti Adatv&eacute;delmi &eacute;s Inform&aacute;ci&oacute;szabads&aacute;g Hat&oacute;s&aacute;g (NAIH)
          </strong>
        </p>

        <p style={labelStyle}>Location</p>
        <p style={valueStyle}>Budapest, Hungary</p>

        <p style={labelStyle}>Website</p>
        <p style={{ ...valueStyle, marginBottom: 0 }}>
          <a
            href="https://www.naih.hu"
            style={{ color: "var(--neon-cyan)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            www.naih.hu
          </a>
        </p>
      </div>

      <h2 style={heading2}>Disclaimer</h2>
      <p style={paragraph}>
        Despite careful content review, we assume no liability for the content
        of external links. The operators of linked pages are solely responsible
        for their content.
      </p>

      {/* ============================================================ */}
      {/*  HUNGARIAN                                                    */}
      {/* ============================================================ */}
      <hr style={divider} />

      <header>
        <h1 style={heading1}>Impresszum</h1>
        <p style={{ ...paragraph, fontSize: "0.875rem", color: "rgba(224,224,240,0.5)" }}>
          Jogi k&ouml;zlem&eacute;ny
        </p>
      </header>

      <h2 style={heading2}>C&eacute;gadatok</h2>
      <div style={sectionBox}>
        <p style={labelStyle}>C&eacute;gn&eacute;v</p>
        <p style={valueStyle}>
          <strong>Prometheus Digital Kft.</strong>
        </p>

        <p style={labelStyle}>C&eacute;gjegyz&eacute;ksz&aacute;m</p>
        <p style={valueStyle}>
          <span style={codeInline}>01-09-434076</span>
        </p>

        <p style={labelStyle}>Ad&oacute;sz&aacute;m</p>
        <p style={valueStyle}>
          <span style={codeInline}>32910128-2-43</span>
        </p>

        <p style={labelStyle}>Sz&eacute;khely</p>
        <p style={valueStyle}>1125 Budapest, Habl&eacute;any utca 6/A, Magyarorsz&aacute;g</p>

        <p style={labelStyle}>Email</p>
        <p style={valueStyle}>
          <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
            info@prometheusdigital.hu
          </a>
        </p>

        <p style={labelStyle}>Telefon</p>
        <p style={valueStyle}>+36 30 922 2042</p>

        <p style={labelStyle}>&Uuml;gyvezet&#337;</p>
        <p style={{ ...valueStyle, marginBottom: 0 }}>Bretz &Aacute;rp&aacute;d</p>
      </div>

      <h2 style={heading2}>T&aacute;rhelyszolg&aacute;ltat&oacute;</h2>
      <div style={sectionBox}>
        <p style={labelStyle}>Szolg&aacute;ltat&oacute;</p>
        <p style={valueStyle}>
          <strong>Vercel Inc.</strong>
        </p>

        <p style={labelStyle}>C&iacute;m</p>
        <p style={valueStyle}>340 S Lemon Ave #4133 Walnut, CA 91789, USA</p>

        <p style={labelStyle}>Kapcsolat</p>
        <p style={{ ...valueStyle, marginBottom: 0 }}>
          <a href="mailto:privacy@vercel.com" style={{ color: "var(--neon-cyan)" }}>
            privacy@vercel.com
          </a>
        </p>
      </div>

      <h2 style={heading2}>Fel&uuml;gyeleti hat&oacute;s&aacute;g</h2>
      <div style={sectionBox}>
        <p style={labelStyle}>Hat&oacute;s&aacute;g</p>
        <p style={valueStyle}>
          <strong>
            Nemzeti Adatv&eacute;delmi &eacute;s Inform&aacute;ci&oacute;szabads&aacute;g Hat&oacute;s&aacute;g (NAIH)
          </strong>
        </p>

        <p style={labelStyle}>Hely</p>
        <p style={valueStyle}>Budapest, Magyarorsz&aacute;g</p>

        <p style={labelStyle}>Weboldal</p>
        <p style={{ ...valueStyle, marginBottom: 0 }}>
          <a
            href="https://www.naih.hu"
            style={{ color: "var(--neon-cyan)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            www.naih.hu
          </a>
        </p>
      </div>

      <h2 style={heading2}>Felel&#337;ss&eacute;gkiz&aacute;r&aacute;s</h2>
      <p style={paragraph}>
        A gondos tartalmi ellen&#337;rz&eacute;s ellen&eacute;re nem v&aacute;llalunk felel&#337;ss&eacute;get a k&uuml;ls&#337;
        hivatkoz&aacute;sok tartalm&aacute;&eacute;rt. A hivatkozott oldalak tartalm&aacute;&eacute;rt kiz&aacute;r&oacute;lag azok
        &uuml;zemeltet&#337;i felelnek.
      </p>
    </article>
  );
}

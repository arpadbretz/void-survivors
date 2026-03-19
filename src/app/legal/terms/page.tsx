import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Void Survivors",
  description:
    "Terms of Service for Void Survivors, a browser-based game by Prometheus Digital Kft.",
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

const list: React.CSSProperties = {
  ...paragraph,
  paddingLeft: "1.5rem",
  listStyleType: "disc",
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TermsOfServicePage() {
  return (
    <article>
      {/* ============================================================ */}
      {/*  ENGLISH                                                      */}
      {/* ============================================================ */}
      <header>
        <h1 style={heading1}>Terms of Service</h1>
        <p style={{ ...paragraph, fontSize: "0.875rem", color: "rgba(224,224,240,0.5)" }}>
          Last updated: March 2026
        </p>
      </header>

      <h2 style={heading2}>1. Overview</h2>
      <p style={paragraph}>
        These Terms of Service (&quot;Terms&quot;) govern your use of{" "}
        <strong>Void Survivors</strong> (&quot;the Game&quot;), operated by{" "}
        <strong>Prometheus Digital Kft.</strong> (&quot;we&quot;, &quot;us&quot;).
        By playing the Game, you agree to these Terms.
      </p>

      <h2 style={heading2}>2. The Game</h2>
      <p style={paragraph}>
        Void Survivors is a free-to-play browser game. No account or
        registration is required. The Game is provided <strong>as-is</strong>{" "}
        and <strong>as-available</strong>, without warranties of any kind,
        whether express or implied.
      </p>

      <h2 style={heading2}>3. Game Data &amp; Saves</h2>
      <p style={paragraph}>
        All game progress is stored in your browser&apos;s{" "}
        <span style={codeInline}>localStorage</span>. We are{" "}
        <strong>not responsible</strong> for any data loss caused by clearing
        your browser data, switching browsers, using private/incognito mode, or
        any other action that removes localStorage content. There is no
        cloud-save functionality.
      </p>

      <h2 style={heading2}>4. Leaderboard</h2>
      <p style={paragraph}>
        The global leaderboard is an optional feature. By submitting a score,
        you agree that:
      </p>
      <ul style={list}>
        <li>Your player name and score will be publicly visible.</li>
        <li>
          We reserve the right to remove any leaderboard entry at our
          discretion, including entries with offensive names or suspected
          illegitimate scores.
        </li>
      </ul>

      <h2 style={heading2}>5. Prohibited Conduct</h2>
      <p style={paragraph}>You agree not to:</p>
      <ul style={list}>
        <li>
          Use cheats, exploits, automation software, or any unauthorized
          third-party tools to manipulate the Game or leaderboard.
        </li>
        <li>
          Submit offensive, discriminatory, or otherwise inappropriate player
          names.
        </li>
        <li>
          Attempt to interfere with the Game&apos;s servers, APIs, or
          infrastructure.
        </li>
        <li>
          Reverse-engineer, decompile, or create derivative works of the Game
          beyond what is permitted by applicable law.
        </li>
      </ul>

      <h2 style={heading2}>6. Anti-Cheat &amp; Score Validation</h2>
      <p style={paragraph}>
        We employ server-side score validation. Scores that fail validation
        checks may be rejected or removed without notice. Repeated violations
        may result in your player name being blocked from the leaderboard.
      </p>

      <h2 style={heading2}>7. Intellectual Property</h2>
      <p style={paragraph}>
        All content of the Game &mdash; including but not limited to code,
        graphics, audio, game design, and visual assets &mdash; is the
        intellectual property of Prometheus Digital Kft. and is protected by
        copyright and other applicable laws. All rights reserved.
      </p>

      <h2 style={heading2}>8. Limitation of Liability</h2>
      <p style={paragraph}>
        To the maximum extent permitted by law, Prometheus Digital Kft. shall
        not be liable for any indirect, incidental, special, consequential, or
        punitive damages arising from your use of the Game, including but not
        limited to loss of game data, interrupted gameplay, or inability to
        access the Game.
      </p>

      <h2 style={heading2}>9. Modifications</h2>
      <p style={paragraph}>
        We reserve the right to modify, suspend, or discontinue the Game (or
        any part of it) at any time without notice. We may also update these
        Terms, with changes posted on this page.
      </p>

      <h2 style={heading2}>10. Governing Law &amp; Jurisdiction</h2>
      <div style={sectionBox}>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          These Terms are governed by the laws of <strong>Hungary</strong>. Any
          disputes shall be submitted to the exclusive jurisdiction of the courts
          of <strong>Budapest, Hungary</strong>.
        </p>
      </div>

      <h2 style={heading2}>11. Contact</h2>
      <p style={paragraph}>
        For questions about these Terms, contact us at{" "}
        <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
          info@prometheusdigital.hu
        </a>
        .
      </p>

      {/* ============================================================ */}
      {/*  HUNGARIAN                                                    */}
      {/* ============================================================ */}
      <hr style={divider} />

      <header>
        <h1 style={heading1}>Felhaszn&aacute;l&aacute;si Felt&eacute;telek</h1>
        <p style={{ ...paragraph, fontSize: "0.875rem", color: "rgba(224,224,240,0.5)" }}>
          Utolj&aacute;ra friss&iacute;tve: 2026. m&aacute;rcius
        </p>
      </header>

      <h2 style={heading2}>1. &Aacute;ttekint&eacute;s</h2>
      <p style={paragraph}>
        Jelen Felhaszn&aacute;l&aacute;si Felt&eacute;telek (&bdquo;Felt&eacute;telek&rdquo;) szab&aacute;lyozz&aacute;k a{" "}
        <strong>Void Survivors</strong> (&bdquo;J&aacute;t&eacute;k&rdquo;) haszn&aacute;lat&aacute;t, melyet a{" "}
        <strong>Prometheus Digital Kft.</strong> (&bdquo;mi&rdquo;, &bdquo;&uuml;zemeltet&#337;&rdquo;) &uuml;zemeltet. A J&aacute;t&eacute;k
        haszn&aacute;lat&aacute;val elfogadja ezeket a Felt&eacute;teleket.
      </p>

      <h2 style={heading2}>2. A J&aacute;t&eacute;k</h2>
      <p style={paragraph}>
        A Void Survivors egy ingyenes b&ouml;ng&eacute;sz&#337;s j&aacute;t&eacute;k. Nem sz&uuml;ks&eacute;ges fi&oacute;k vagy
        regisztr&aacute;ci&oacute;. A J&aacute;t&eacute;k <strong>&bdquo;ahogy van&rdquo;</strong> &eacute;s{" "}
        <strong>&bdquo;ahogy el&eacute;rhet&#337;&rdquo;</strong> alapon ker&uuml;l
        biztos&iacute;t&aacute;sra, b&aacute;rmilyen kifejezett vagy v&eacute;lelmezett garancia n&eacute;lk&uuml;l.
      </p>

      <h2 style={heading2}>3. J&aacute;t&eacute;kadatok &eacute;s ment&eacute;sek</h2>
      <p style={paragraph}>
        Minden j&aacute;t&eacute;kbeli halad&aacute;s a b&ouml;ng&eacute;sz&#337;{" "}
        <span style={codeInline}>localStorage</span>-&aacute;ban t&aacute;rol&oacute;dik. <strong>Nem
        vagyunk felel&#337;sek</strong> a b&ouml;ng&eacute;sz&#337;adatok t&ouml;rl&eacute;s&eacute;b&#337;l, b&ouml;ng&eacute;sz&#337;v&aacute;lt&aacute;sb&oacute;l,
        ink&oacute;gnit&oacute; m&oacute;d haszn&aacute;lat&aacute;b&oacute;l vagy b&aacute;rmely m&aacute;s, a localStorage-t t&ouml;rl&#337;
        tev&eacute;kenys&eacute;gb&#337;l ered&#337; adatveszt&eacute;s&eacute;rt.
      </p>

      <h2 style={heading2}>4. Ranglista</h2>
      <p style={paragraph}>
        A glob&aacute;lis ranglista opcion&aacute;lis funkci&oacute;. Pontsz&aacute;m bek&uuml;ld&eacute;s&eacute;vel elfogadja, hogy:
      </p>
      <ul style={list}>
        <li>J&aacute;t&eacute;kosneve &eacute;s pontsz&aacute;ma nyilv&aacute;nosan l&aacute;that&oacute; lesz.</li>
        <li>
          Fenntartjuk a jogot b&aacute;rmely bejegyz&eacute;s elt&aacute;vol&iacute;t&aacute;s&aacute;ra, bele&eacute;rtve a
          s&eacute;rt&#337; neveket vagy gyan&uacute;san illegitim pontsz&aacute;mokat.
        </li>
      </ul>

      <h2 style={heading2}>5. Tiltott magatart&aacute;s</h2>
      <ul style={list}>
        <li>
          Csalok&oacute;d&aacute;s, exploit-ok, automatiz&aacute;l&oacute; szoftverek vagy jogosulatlan
          eszk&ouml;z&ouml;k haszn&aacute;lata.
        </li>
        <li>S&eacute;rt&#337;, diszkrimin&aacute;l&oacute; j&aacute;t&eacute;kosnevek megad&aacute;sa.</li>
        <li>A J&aacute;t&eacute;k szervereibe, API-jaiba val&oacute; beavatkoz&aacute;s.</li>
        <li>
          A J&aacute;t&eacute;k visszafejt&eacute;se vagy sz&aacute;rmaztatott m&#369;vek l&eacute;trehoz&aacute;sa a
          jogszab&aacute;lyok &aacute;ltal megengedetten t&uacute;l.
        </li>
      </ul>

      <h2 style={heading2}>6. Csal&aacute;s elleni v&eacute;delem</h2>
      <p style={paragraph}>
        Szerver oldali pontsz&aacute;m-valid&aacute;ci&oacute;t alkalmazunk. A valid&aacute;ci&oacute;n &aacute;t nem
        men&#337; pontsz&aacute;mok &eacute;rtes&iacute;t&eacute;s n&eacute;lk&uuml;l elutas&iacute;that&oacute;k vagy t&ouml;r&ouml;lhet&#337;k.
      </p>

      <h2 style={heading2}>7. Szellemi tulajdon</h2>
      <p style={paragraph}>
        A J&aacute;t&eacute;k teljes tartalma &mdash; bele&eacute;rtve a k&oacute;dot, grafik&aacute;kat, hangokat,
        j&aacute;t&eacute;ktervez&eacute;st &eacute;s vizu&aacute;lis elemeket &mdash; a Prometheus Digital Kft.
        szellemi tulajdona, amelyet szerz&#337;i jog &eacute;s egy&eacute;b jogszab&aacute;lyok v&eacute;denek.
      </p>

      <h2 style={heading2}>8. Felel&#337;ss&eacute;g korl&aacute;toz&aacute;sa</h2>
      <p style={paragraph}>
        A jogszab&aacute;lyok &aacute;ltal megengedett maxim&aacute;lis m&eacute;rt&eacute;kben a Prometheus
        Digital Kft. nem felel semmilyen k&ouml;zvetett, eseti, k&uuml;l&ouml;n&ouml;s vagy
        k&ouml;vetkezm&eacute;nyes k&aacute;r&eacute;rt, bele&eacute;rtve a j&aacute;t&eacute;kadatok elveszt&eacute;s&eacute;t.
      </p>

      <h2 style={heading2}>9. M&oacute;dos&iacute;t&aacute;sok</h2>
      <p style={paragraph}>
        Fenntartjuk a jogot a J&aacute;t&eacute;k vagy ezen Felt&eacute;telek m&oacute;dos&iacute;t&aacute;s&aacute;ra,
        felf&uuml;ggeszt&eacute;s&eacute;re vagy megsz&uuml;ntet&eacute;s&eacute;re b&aacute;rmikor, el&#337;zetes &eacute;rtes&iacute;t&eacute;s n&eacute;lk&uuml;l.
      </p>

      <h2 style={heading2}>10. Ir&aacute;nyad&oacute; jog &eacute;s joghat&oacute;s&aacute;g</h2>
      <div style={sectionBox}>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          Jelen Felt&eacute;telekre <strong>Magyarorsz&aacute;g</strong> jogszab&aacute;lyai az
          ir&aacute;nyad&oacute;ak. A vit&aacute;k eld&ouml;nt&eacute;s&eacute;re <strong>Budapest</strong> b&iacute;r&oacute;s&aacute;gai
          kiz&aacute;r&oacute;lagosan illet&eacute;kesek.
        </p>
      </div>

      <h2 style={heading2}>11. Kapcsolat</h2>
      <p style={paragraph}>
        K&eacute;rd&eacute;seivel forduljon hozz&aacute;nk:{" "}
        <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
          info@prometheusdigital.hu
        </a>
      </p>
    </article>
  );
}

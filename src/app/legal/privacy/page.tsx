import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Void Survivors",
  description:
    "Privacy Policy for Void Survivors, a browser-based game by Prometheus Digital Kft.",
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

export default function PrivacyPolicyPage() {
  return (
    <article>
      {/* ============================================================ */}
      {/*  ENGLISH                                                      */}
      {/* ============================================================ */}
      <header>
        <h1 style={heading1}>Privacy Policy</h1>
        <p style={{ ...paragraph, fontSize: "0.875rem", color: "rgba(224,224,240,0.5)" }}>
          Last updated: March 2026
        </p>
      </header>

      <h2 style={heading2}>1. Data Controller</h2>
      <div style={sectionBox}>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          <strong>Prometheus Digital Kft.</strong>
          <br />
          Registration No.: <span style={codeInline}>01-09-434076</span>
          <br />
          Tax ID: <span style={codeInline}>32910128-2-43</span>
          <br />
          Address: 1125 Budapest, Habl&eacute;any utca 6/A, Hungary
          <br />
          Email:{" "}
          <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
            info@prometheusdigital.hu
          </a>
          <br />
          Phone: +36 30 922 2042
          <br />
          Managing Director: Bretz &Aacute;rp&aacute;d
        </p>
      </div>

      <h2 style={heading2}>2. What Data We Collect</h2>
      <p style={paragraph}>
        Void Survivors is designed to collect as little data as possible. We do{" "}
        <strong>not</strong> use advertising or third-party tracking. We use only
        privacy-friendly, cookie-free analytics as described below.
      </p>
      <ul style={list}>
        <li>
          <strong>Game saves</strong> &mdash; stored in your browser&apos;s{" "}
          <span style={codeInline}>localStorage</span>. This data never leaves
          your device and is not accessible to us.
        </li>
        <li>
          <strong>Leaderboard entry (optional)</strong> &mdash; if you choose to
          submit a score, we store only your <em>player name</em> and{" "}
          <em>score</em> on our server. No account, email, or other personal
          data is required.
        </li>
        <li>
          <strong>Page view analytics</strong> &mdash; we use Vercel Web
          Analytics to collect anonymized page view data. This service is
          cookie-free, does not collect personal data, and is fully
          privacy-compliant.
        </li>
        <li>
          <strong>Anonymized game session counts</strong> &mdash; we record how
          many games are played per day. No personal data is stored alongside
          these counts.
        </li>
        <li>
          <strong>Daily/weekly active player counts</strong> &mdash; we use a
          one-way hash of connection metadata to count unique players. No raw IP
          addresses or other identifiable information is stored.
        </li>
      </ul>

      <h2 style={heading2}>3. Cookies &amp; Local Storage</h2>
      <p style={paragraph}>
        We do <strong>not</strong> set any cookies. The game uses browser{" "}
        <span style={codeInline}>localStorage</span> exclusively to persist your
        game progress, settings, and achievements on your device. This is
        essential functionality and cannot be disabled without losing your save
        data.
      </p>

      <h2 style={heading2}>4. Data Processors</h2>
      <p style={paragraph}>
        We use the following third-party services to operate the game:
      </p>
      <ul style={list}>
        <li>
          <strong>Vercel Inc.</strong> (hosting &amp; anonymized page view
          analytics) &mdash; 340 S Lemon Ave #4133 Walnut, CA 91789, USA
          &mdash; privacy-compliant, cookie-free analytics &mdash;{" "}
          <a href="mailto:privacy@vercel.com" style={{ color: "var(--neon-cyan)" }}>
            privacy@vercel.com
          </a>
        </li>
        <li>
          <strong>Upstash Inc.</strong> (leaderboard database &amp; anonymized
          player counts) &mdash; stores player name + score for leaderboard;
          anonymized session and active player counts only
        </li>
      </ul>

      <h2 style={heading2}>5. Legal Basis (GDPR Art. 6)</h2>
      <ul style={list}>
        <li>
          <strong>Legitimate interest</strong> (Art. 6(1)(f)) &mdash; for
          essential localStorage functionality required to run the game.
        </li>
        <li>
          <strong>Consent</strong> (Art. 6(1)(a)) &mdash; for optional
          leaderboard submission. You actively choose to enter a name and submit
          your score.
        </li>
      </ul>

      <h2 style={heading2}>6. Data Retention</h2>
      <p style={paragraph}>
        Leaderboard data is retained indefinitely unless you request deletion.
        localStorage data persists until you clear your browser data.
      </p>

      <h2 style={heading2}>7. Your Rights</h2>
      <p style={paragraph}>
        Under the GDPR you have the right to access, rectify, erase, restrict
        processing of, and port your personal data. You may also object to
        processing and lodge a complaint with the supervisory authority.
      </p>
      <p style={paragraph}>
        To request deletion of your leaderboard data, email us at{" "}
        <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
          info@prometheusdigital.hu
        </a>{" "}
        with the player name you used.
      </p>

      <h2 style={heading2}>8. Supervisory Authority</h2>
      <div style={sectionBox}>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          Nemzeti Adatv&eacute;delmi &eacute;s Inform&aacute;ci&oacute;szabads&aacute;g Hat&oacute;s&aacute;g (NAIH)
          <br />
          Budapest, Hungary
          <br />
          <a href="https://www.naih.hu" style={{ color: "var(--neon-cyan)" }} target="_blank" rel="noopener noreferrer">
            www.naih.hu
          </a>
        </p>
      </div>

      <h2 style={heading2}>9. Children&apos;s Privacy</h2>
      <p style={paragraph}>
        Void Survivors does not knowingly collect personal data from children
        under 16. Leaderboard submission is optional, and we encourage parents to
        supervise their children&apos;s online activity.
      </p>

      <h2 style={heading2}>10. Changes to This Policy</h2>
      <p style={paragraph}>
        We may update this policy from time to time. Changes will be posted on
        this page with an updated date.
      </p>

      {/* ============================================================ */}
      {/*  HUNGARIAN                                                    */}
      {/* ============================================================ */}
      <hr style={divider} />

      <header>
        <h1 style={heading1}>Adatv&eacute;delmi T&aacute;j&eacute;koztat&oacute;</h1>
        <p style={{ ...paragraph, fontSize: "0.875rem", color: "rgba(224,224,240,0.5)" }}>
          Utolj&aacute;ra friss&iacute;tve: 2026. m&aacute;rcius
        </p>
      </header>

      <h2 style={heading2}>1. Adatkezel&#337;</h2>
      <div style={sectionBox}>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          <strong>Prometheus Digital Kft.</strong>
          <br />
          C&eacute;gjegyz&eacute;ksz&aacute;m: <span style={codeInline}>01-09-434076</span>
          <br />
          Ad&oacute;sz&aacute;m: <span style={codeInline}>32910128-2-43</span>
          <br />
          Sz&eacute;khely: 1125 Budapest, Habl&eacute;any utca 6/A
          <br />
          Email:{" "}
          <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
            info@prometheusdigital.hu
          </a>
          <br />
          Telefon: +36 30 922 2042
          <br />
          &Uuml;gyvezet&#337;: Bretz &Aacute;rp&aacute;d
        </p>
      </div>

      <h2 style={heading2}>2. Milyen adatokat gy&#369;jt&uuml;nk</h2>
      <p style={paragraph}>
        A Void Survivors a lehet&#337; legkevesebb adatot gy&#369;jti. <strong>Nem</strong>{" "}
        haszn&aacute;lunk hirdet&eacute;seket vagy harmadik f&eacute;l &aacute;ltali k&ouml;vet&eacute;st.
        Kiz&aacute;r&oacute;lag adatv&eacute;delmi szempontb&oacute;l bar&aacute;ts&aacute;gos, s&uuml;timentes
        analitik&aacute;t haszn&aacute;lunk az al&aacute;bbiak szerint.
      </p>
      <ul style={list}>
        <li>
          <strong>J&aacute;t&eacute;kment&eacute;sek</strong> &mdash; a b&ouml;ng&eacute;sz&#337;{" "}
          <span style={codeInline}>localStorage</span>-&aacute;ban t&aacute;roljuk. Ezek az adatok
          soha nem hagyjak el az eszk&ouml;z&eacute;t, &eacute;s sz&aacute;munkra nem el&eacute;rhet&#337;ek.
        </li>
        <li>
          <strong>Ranglista bejegyz&eacute;s (opcion&aacute;lis)</strong> &mdash; ha
          pontsz&aacute;mot k&uuml;ld be, csak a <em>j&aacute;t&eacute;kosnev&eacute;t</em> &eacute;s a{" "}
          <em>pontsz&aacute;mot</em> t&aacute;roljuk. Nem sz&uuml;ks&eacute;ges fi&oacute;k, email
          vagy m&aacute;s szem&eacute;lyes adat.
        </li>
        <li>
          <strong>Oldallátogatási analitika</strong> &mdash; a Vercel Web
          Analytics szolg&aacute;ltat&aacute;st haszn&aacute;ljuk anonimiz&aacute;lt
          oldallátogatási adatok gy&#369;jt&eacute;s&eacute;re. Ez a szolg&aacute;ltat&aacute;s
          s&uuml;timentes, nem gy&#369;jt szem&eacute;lyes adatokat, &eacute;s teljes
          m&eacute;rt&eacute;kben adatv&eacute;delmi szempontb&oacute;l megfelel&#337;.
        </li>
        <li>
          <strong>Anonimiz&aacute;lt j&aacute;t&eacute;kmenet-sz&aacute;ml&aacute;l&oacute;</strong> &mdash;
          r&ouml;gz&iacute;tj&uuml;k, h&aacute;ny j&aacute;t&eacute;kot j&aacute;tszanak naponta. Ezek
          mellett semmilyen szem&eacute;lyes adatot nem t&aacute;rolunk.
        </li>
        <li>
          <strong>Napi/heti akt&iacute;v j&aacute;t&eacute;kosok sz&aacute;ma</strong> &mdash; a
          kapcsol&oacute;d&aacute;si metaadatok egyir&aacute;ny&uacute; hash-&eacute;t haszn&aacute;ljuk az
          egyedi j&aacute;t&eacute;kosok sz&aacute;mol&aacute;s&aacute;hoz. Nem t&aacute;rolunk nyers IP-c&iacute;meket
          vagy m&aacute;s azonos&iacute;that&oacute; inform&aacute;ci&oacute;t.
        </li>
      </ul>

      <h2 style={heading2}>3. S&uuml;tik &eacute;s helyi t&aacute;rhely</h2>
      <p style={paragraph}>
        <strong>Nem</strong> haszn&aacute;lunk s&uuml;tiket. A j&aacute;t&eacute;k kiz&aacute;r&oacute;lag a b&ouml;ng&eacute;sz&#337;{" "}
        <span style={codeInline}>localStorage</span> funkci&oacute;j&aacute;t haszn&aacute;lja a
        j&aacute;t&eacute;k halad&aacute;s&aacute;nak, be&aacute;ll&iacute;t&aacute;soknak &eacute;s teljes&iacute;tm&eacute;nyeknek a ment&eacute;s&eacute;re.
      </p>

      <h2 style={heading2}>4. Adatfeldolgoz&oacute;k</h2>
      <ul style={list}>
        <li>
          <strong>Vercel Inc.</strong> (t&aacute;rhely &eacute;s anonimiz&aacute;lt
          oldallátogatási analitika) &mdash; 340 S Lemon Ave #4133
          Walnut, CA 91789, USA &mdash; adatv&eacute;delmi szempontb&oacute;l
          megfelel&#337;, s&uuml;timentes analitika
        </li>
        <li>
          <strong>Upstash Inc.</strong> (ranglista adatb&aacute;zis &eacute;s anonimiz&aacute;lt
          j&aacute;t&eacute;kos-sz&aacute;ml&aacute;l&oacute;k) &mdash; j&aacute;t&eacute;kosn&eacute;v + pontsz&aacute;m a
          ranglist&aacute;hoz; kiz&aacute;r&oacute;lag anonimiz&aacute;lt munkamenet- &eacute;s akt&iacute;v
          j&aacute;t&eacute;kos-sz&aacute;ml&aacute;l&oacute;k
        </li>
      </ul>

      <h2 style={heading2}>5. Jogalap (GDPR 6. cikk)</h2>
      <ul style={list}>
        <li>
          <strong>Jogos &eacute;rdek</strong> (6. cikk (1)(f)) &mdash; a j&aacute;t&eacute;k
          m&#369;k&ouml;d&eacute;s&eacute;hez sz&uuml;ks&eacute;ges localStorage funkcionalit&aacute;shoz.
        </li>
        <li>
          <strong>Hozz&aacute;j&aacute;rul&aacute;s</strong> (6. cikk (1)(a)) &mdash; az
          opcion&aacute;lis ranglista bek&uuml;ld&eacute;s&eacute;hez.
        </li>
      </ul>

      <h2 style={heading2}>6. Adatmeg&#337;rz&eacute;s</h2>
      <p style={paragraph}>
        A ranglista adatokat hat&aacute;rozatlan ideig meg&#337;rizz&uuml;k, kiv&eacute;ve ha
        t&ouml;rl&eacute;st k&eacute;r. A localStorage adatok a b&ouml;ng&eacute;sz&#337; adatainak t&ouml;rl&eacute;s&eacute;ig
        megmaradnak.
      </p>

      <h2 style={heading2}>7. Az &Ouml;n jogai</h2>
      <p style={paragraph}>
        A GDPR alapj&aacute;n &Ouml;nnek joga van szem&eacute;lyes adataihoz hozz&aacute;f&eacute;rni,
        azokat helyesb&iacute;teni, t&ouml;r&ouml;lni, az adatkezel&eacute;st korl&aacute;tozni &eacute;s az
        adathordozhat&oacute;s&aacute;ghoz. Tiltakozhat az adatkezel&eacute;s ellen &eacute;s panaszt
        tehet a fel&uuml;gyeleti hat&oacute;s&aacute;gn&aacute;l.
      </p>
      <p style={paragraph}>
        Ranglista adatainak t&ouml;rl&eacute;s&eacute;hez &iacute;rjon a{" "}
        <a href="mailto:info@prometheusdigital.hu" style={{ color: "var(--neon-cyan)" }}>
          info@prometheusdigital.hu
        </a>{" "}
        c&iacute;mre a haszn&aacute;lt j&aacute;t&eacute;kosn&eacute;v megad&aacute;s&aacute;val.
      </p>

      <h2 style={heading2}>8. Fel&uuml;gyeleti hat&oacute;s&aacute;g</h2>
      <div style={sectionBox}>
        <p style={{ ...paragraph, marginBottom: 0 }}>
          Nemzeti Adatv&eacute;delmi &eacute;s Inform&aacute;ci&oacute;szabads&aacute;g Hat&oacute;s&aacute;g (NAIH)
          <br />
          Budapest, Magyarorsz&aacute;g
          <br />
          <a href="https://www.naih.hu" style={{ color: "var(--neon-cyan)" }} target="_blank" rel="noopener noreferrer">
            www.naih.hu
          </a>
        </p>
      </div>

      <h2 style={heading2}>9. Gyermekek adatv&eacute;delme</h2>
      <p style={paragraph}>
        A Void Survivors tudatosan nem gy&#369;jt szem&eacute;lyes adatokat 16 &eacute;v alatti
        gyermekekt&#337;l. A ranglista bek&uuml;ld&eacute;s opcion&aacute;lis.
      </p>

      <h2 style={heading2}>10. A t&aacute;j&eacute;koztat&oacute; m&oacute;dos&iacute;t&aacute;sa</h2>
      <p style={paragraph}>
        Fenntartjuk a jogot a t&aacute;j&eacute;koztat&oacute; m&oacute;dos&iacute;t&aacute;s&aacute;ra. A v&aacute;ltoz&aacute;sokat
        ezen az oldalon tessz&uuml;k k&ouml;zz&eacute; friss&iacute;tett d&aacute;tummal.
      </p>
    </article>
  );
}

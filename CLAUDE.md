# Roger G. – Try Out Tour Landingpage

## Projekt

Info- und Landingpage für die Try Out Tour von Roger G. (deutscher Comedy-Creator).
Ziel: Tourdaten kommunizieren, Tickets verkaufen, WOW-Effekt beim ersten Eindruck.
Kein Shop – reine Landingpage. Live seit 08.08.2026 unter https://roger-g.de (Coolify, Dockerfile → nginx).

> **Navigationskarte für Agenten** (Rolle jeder Datei, Termin-Datenfluss `tour.ts` → Hero/Karten/JSON-LD,
> Klaviyo-Beleg, Faktenlage Rechtstexte, Testen, Deploy, Wegweiser, Befunde): `docs/NAVIGATION.md` (27.09.2026).
> Achtung: „Nächste Show" und „Vorbei" werden zur Build-Zeit berechnet – nach jeder gespielten Show neu deployen.
> Tests: `npm test`. Kein Auto-Deploy: nach dem Push den Coolify-API-Trigger rufen (`docs/NAVIGATION.md` §9).

## Stack

- **Astro** (statisch, kein SSR nötig) + vanilla TS/JS
- **GSAP + ScrollTrigger** für Animationen, **Lenis** für Smooth Scroll
- Fonts self-hosted via @fontsource: **Titan One** (Bubble-Display) + **Poppins** 400/600/700 (Body & Sublines)
- Kein Tailwind – Design-Tokens liegen in `src/styles/global.css` als CSS Custom Properties

### Font-Wahl (Design-Angleichung, dokumentiert 2026-07-11)

Geprüft wurden die README-Kandidaten Baloo 2, Fredoka und Titan One gegen den
Plakattitel (fette, rundgezeichnete Bubble-Letter mit einheitlicher Strichstärke):

- **Titan One** ✅ – am nächsten am Plakat: sehr fette, runde Bubble-Formen,
  wirkt handgezeichnet-plakativ. Single Weight reicht für Headlines/Daten/Stempel.
- Baloo 2 / Fredoka – rund, aber deutlich "brotschriftiger", weniger Plakat-Punch.
- **Poppins** ✅ (statt Rubik) – fette geometrische Sans für die Sublines
  ("TRY OUT TOUR 26"-Stil, uppercase + Glow) und zugleich gut lesbarer Body.
  Anton/Rubik wurden komplett ersetzt, damit nur zwei Familien laden.

## Design-Richtung

MASSGEBLICH: die offiziellen Tourplakate in `design-reference/` (Analyse und
Arbeitsauftrag in der dortigen README). Kurzfassung: Pink/Mauve-Verlauf als
Rahmen, Signature-Pink (~#e890c0) für Headlines/CTAs in Bubble-Schrift, Weiß
mit rosa Neon-Glow für Sublines, Pastell-Plattenbau-Motiv, 90s-Hip-Hop-Vibe –
bunt und frech, NICHT dunkel.

ERLEDIGT (2026-07-11): Die alte Platzhalter-Palette (Bühnenschwarz/Amber/Stempelrot)
wurde durch die Plakat-Palette ersetzt – siehe Tokens in `src/styles/global.css`
(Signature-Pink `#e890c6`, Mauve/Plum-Verlauf, Weiß mit `--glow-pink`).

ERLEDIGT (2026-07-11, Dynamik-Pass): Hero mobil = Vollbild-Plakatmotiv
(textfreie Crops `public/img/motiv-*` via `scripts/crop-motiv.mjs`, nicht von
Hand ersetzen), Desktop = Split mit schwebendem Poster. "Ungetestet" ist jetzt
ein gefüllter Starburst-Sticker (`.burst`), dazu Marquee-Ticker (`Marquee.astro`),
SplitText-Buchstaben-Intro, Parallax & orchestrierte Scroll-Sequenzen in
`src/scripts/animations.ts`.

- Signature-Element: Hauptplakat-Motiv im Hero + Bubble-Typo
- Mobile-first: 390 px ist der primäre Viewport, Desktop ist die Erweiterung
- `prefers-reduced-motion` wird respektiert (bereits in `animations.js` angelegt)

## Arbeitsregeln

1. **Jede visuelle Änderung mit Playwright verifizieren** (MCP ist in `.mcp.json`
   konfiguriert und startet über `scripts/mcp-playwright.sh`):
   Screenshot bei 390 px UND 1440 px Breite, erst dann als fertig betrachten.
   Headless-Chromium braucht `source scripts/env.sh` (lokale Libs unter
   `~/chrome-libs`, ohne root). Schnellste Wege: `scripts/shot.mjs` (Viewport/
   Fullpage) und `scripts/scroll-shot.mjs` (scrollt zu Selektor, damit
   ScrollTrigger-Animationen gefeuert haben). Achtung: Fullpage-Shots ohne
   Scroll zeigen GSAP-Sektionen leer (Trigger nicht gefeuert) – für Sektionen
   scroll-shot oder shot.mjs mit `--reduced` nutzen.
2. Nach größeren Änderungen: `npx lighthouse http://localhost:4321 --view` –
   Ziel: Performance ≥ 95, SEO = 100, Accessibility ≥ 95.
3. Tourdaten werden NUR in `src/data/tour.ts` gepflegt. Schema.org-Markup und
   UI werden daraus generiert – niemals Termine hart ins HTML schreiben.
4. Bilder: WebP/AVIF, `loading="lazy"` (außer Hero/LCP-Bild), immer width/height setzen.
5. Deutsch als Seitensprache (`lang="de"`), Copy locker/direkt im Roger-G.-Ton –
   aber Ticket-CTAs immer eindeutig ("Tickets für Rostock", nicht "Los geht's").

## Offene TODOs (Platzhalter im Code mit `TODO:` markiert)

- [x] Ticketlinks in `src/data/tour.ts` (09.08.2026, Commit 0f80373; die Uhrzeit
      20:00 der Try-Out-Shows ist weiterhin nur Annahme)
- [x] Design-Angleichung an Plakate durchführen (design-reference/README.md)
- [x] Plakatmotiv als Hero-Bild aufbereiten (WebP/AVIF 480/768/1080 → `public/img/`)
- [x] OG-Image erstellt (1200×630) → `public/og.jpg`
- [x] Finale Domain roger-g.de, `site` in `astro.config.mjs` gesetzt (11.07.2026), live seit 08.08.2026
- [x] Impressum/Datenschutz verlinkt und mit Angaben gefüllt (Commit d07aac0) – ABER: die
      Datenschutzerklärung stimmt seit dem Klaviyo-Einbau (08.08.2026) nicht mehr (Cookie,
      Tracking, Google Fonts über das Formular) und das Impressum ist in sich widersprüchlich
      → `docs/NAVIGATION.md` §5/§6, Entscheidung Konrad/Roger

## Deployment

Statischer Build (`npm run build` → `dist/`). Läuft als Coolify-App `roger-g.de`
(Dockerfile: node:22-alpine baut, nginx:alpine liefert aus; Domains roger-g.de + www).
Ein Push auf `main` deployt NICHT automatisch – Trigger und Ablauf in `docs/NAVIGATION.md` §9,
Einrichtung in `DEPLOY.md`. Weil „Nächste Show"/„Vorbei" beim Build entschieden werden,
nach jeder gespielten Show neu deployen.

## SEO (Stand 13.11.2026)

- Meta/Canonical/OG: `src/layouts/Layout.astro` (Canonical aus `Astro.site` = https://roger-g.de). Sitemap: `@astrojs/sitemap`
  (`astro.config.mjs`), alle 3 Seiten enthalten; neue Seiten landen automatisch drin. `public/robots.txt` verweist darauf.
- JSON-LD: `ComedyEvent` je Termin aus `src/data/tour.ts` in `src/components/TourDates.astro` (nur echte Termine).
- `nginx.conf` (Dockerfile kopiert sie): 301 `www.roger-g.de` → Apex, HSTS (ohne includeSubDomains), nosniff, X-Frame-Options.
  Neue `location`-Blöcke mit eigenem `add_header` müssen die Sicherheits-Header wiederholen.
- Bewusst ohne JSON-LD/mehr Text: Impressum/Datenschutz (Rechtstexte).

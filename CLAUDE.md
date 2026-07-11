# Roger G. – Try Out Tour Landingpage

## Projekt

Info- und Landingpage für die Try Out Tour von Roger G. (deutscher Comedy-Creator).
Ziel: Tourdaten kommunizieren, Tickets verkaufen, WOW-Effekt beim ersten Eindruck.
Kein Shop – reine Landingpage. Deployment-Ziel: roger-g.de (Subpage oder eigene Domain, TBD).

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

- Signature-Element: Hauptplakat-Motiv im Hero + Bubble-Typo
- Mobile-first: 390 px ist der primäre Viewport, Desktop ist die Erweiterung
- `prefers-reduced-motion` wird respektiert (bereits in `animations.js` angelegt)

## Arbeitsregeln

1. **Jede visuelle Änderung mit Playwright verifizieren** (MCP ist in `.mcp.json` konfiguriert):
   Screenshot bei 390 px UND 1440 px Breite, erst dann als fertig betrachten.
2. Nach größeren Änderungen: `npx lighthouse http://localhost:4321 --view` –
   Ziel: Performance ≥ 95, SEO = 100, Accessibility ≥ 95.
3. Tourdaten werden NUR in `src/data/tour.ts` gepflegt. Schema.org-Markup und
   UI werden daraus generiert – niemals Termine hart ins HTML schreiben.
4. Bilder: WebP/AVIF, `loading="lazy"` (außer Hero/LCP-Bild), immer width/height setzen.
5. Deutsch als Seitensprache (`lang="de"`), Copy locker/direkt im Roger-G.-Ton –
   aber Ticket-CTAs immer eindeutig ("Tickets für Rostock", nicht "Los geht's").

## Offene TODOs (Platzhalter im Code mit `TODO:` markiert)

- [ ] Ticketlinks + Uhrzeiten in `src/data/tour.ts` (Termine/Venues sind bereits
      vom Plakat übernommen, Uhrzeit 20:00 ist nur Annahme)
- [x] Design-Angleichung an Plakate durchführen (design-reference/README.md)
- [x] Plakatmotiv als Hero-Bild aufbereiten (WebP/AVIF 480/768/1080 → `public/img/`)
- [ ] OG-Image erstellen (1200×630) → `public/og.jpg`
- [ ] Finale Domain klären und in `astro.config.mjs` (`site`) setzen
- [x] Impressum/Datenschutz verlinkt (Footer) – Seiten existieren als
      Platzhalter-Routen, echte Inhalte (§ 5 DDG, DSGVO) fehlen noch

## Deployment

Statischer Build (`npm run build` → `dist/`). Passt zu Coolify auf dem Hetzner-VPS
(Static-Site-Preset oder Nginx-Container) oder jedem anderen Static Host.

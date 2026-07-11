# HANDOVER – Roger G. Try Out Tour Landingpage (Cloud-Ausführung)

Dieses Dokument ist die Übergabe an eine Claude-Code-Instanz, die headless auf einem
Server läuft (Hetzner CPX31, Ubuntu, Coolify vorhanden). Alles läuft hier in der Cloud:
MCP-Server, Skills, Libraries, Dev-Server, Screenshots.

## 0. Kontext

- Projekt: Landingpage für die Try Out Tour von Roger G. (Comedy), Ziel-Domain roger-g.de
- Kein Shop, reine Info-/Ticket-Landingpage
- Projektregeln, Design-Richtung und TODOs: siehe `CLAUDE.md` (bindend)
- Stack: Astro (statisch), GSAP + ScrollTrigger, Lenis, Fontsource (Anton + Rubik)

## 1. Einmaliges Setup (zuerst ausführen, dann als erledigt abhaken)

```bash
# Node-Version prüfen (Astro 7 braucht >= 22.12)
node -v

# Dependencies
npm install

# Playwright-Browser für Headless-Screenshots (MCP nutzt diese)
npx playwright install --with-deps chromium

# Lighthouse global für Audits
npm install -g lighthouse
```

Der Playwright-MCP ist in `.mcp.json` konfiguriert und läuft headless ohne
weitere Anpassung. Falls der MCP-Start scheitert: `npx @playwright/mcp@latest --headless`
manuell testen und Fehlermeldung analysieren, bevor weitergearbeitet wird.

## 2. Dev-Server im Hintergrund

Der Dev-Server soll dauerhaft im Hintergrund laufen, damit Screenshots und
Audits jederzeit möglich sind:

```bash
npm run dev -- --host 0.0.0.0 --port 4321 &
```

- Screenshots/Audits immer gegen `http://localhost:4321`
- Nach Astro-Config-Änderungen Server neu starten

## 3. Verifikations-Loop (bei JEDER visuellen Änderung)

1. Playwright-Screenshot bei **390 px** Breite (primärer Viewport, mobile-first)
2. Playwright-Screenshot bei **1440 px**
3. Screenshot selbst bewerten: Hierarchie, Abstände, Kontrast, Zeilenlängen
4. Nach größeren Meilensteinen:
   `lighthouse http://localhost:4321 --chrome-flags="--headless --no-sandbox" --output=json --output-path=./lighthouse.json --quiet`
   Ziele: Performance ≥ 95, SEO = 100, Accessibility ≥ 95. Bei Verfehlung: fixen, erneut messen.

## 4. Aufgaben in Reihenfolge

1. Setup (Abschnitt 1) durchführen, Dev-Server starten, Baseline-Screenshots machen
2. **Design-Angleichung an die Tourplakate**: `design-reference/README.md` lesen
   und den dortigen Arbeitsauftrag vollständig ausführen (Plakate analysieren,
   Tokens in `global.css` anpassen). Dieser Schritt kommt VOR allen visuellen
   Verfeinerungen – erst wenn die Seite zum Plakat passt, weiterarbeiten.
3. `CLAUDE.md`-TODOs abarbeiten, soweit ohne Rückfragen möglich:
   - OG-Image (1200×630) als statisches Asset generieren (Typo-Design aus den
     vorhandenen Design-Tokens, kein Foto nötig) → `public/og.jpg`
   - Impressum-/Datenschutz-Seiten als Platzhalter-Routen anlegen
4. Hero verfeinern: Load-Sequenz und Stempel auf 390 px prüfen und optimieren
5. WOW-Pass: EINE zusätzliche orchestrierte Scroll-Interaktion für die
   Termin-Sektion bauen (dezent, kein Effekt-Feuerwerk), Reduced-Motion beachten
6. Lighthouse-Audit fahren, Ergebnisse dokumentieren, Verfehlungen fixen
7. `npm run build` – Build muss fehlerfrei durchlaufen

## 5. NICHT ohne Rückfrage an Konrad

- Echte Tourdaten/Ticketlinks erfinden (Platzhalter in `src/data/tour.ts` bleiben
  als TODO markiert, bis echte Daten kommen)
- Deployment nach Coolify/Produktion
- Änderungen an Domain-/DNS-Konfiguration
- Rogers Branding festlegen (Farben sind Vorschlag, Freigabe steht aus)

## 6. Abschluss / Rückgabe

Am Ende eine kurze Zusammenfassung erstellen mit:
- Erledigte Punkte + offene TODOs
- Finale Lighthouse-Scores (alle vier Kategorien)
- Pfade der finalen Screenshots (390/1440)
- Empfehlung für die nächsten Schritte Richtung Deployment

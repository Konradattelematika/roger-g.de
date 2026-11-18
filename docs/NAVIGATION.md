# Try Out Tour Landingpage (roger-g.de) – Navigationskarte für Agenten

Stand 27.09.2026, Termine/Kartenlogik nachgezogen 19.10.2026 (live = `fb6be5b`, deployt 19.10.2026 21:47 Berlin per
API-Trigger; spätere reine Doku-Commits auf `main` brauchen keinen Deploy). Diese Karte sagt, **welche Datei wofür zuständig ist**, wie Termine zu Hero/Karten/JSON-LD werden, was
Klaviyo auf der Seite wirklich tut, wie getestet und deployt wird – und sie enthält die Faktenlage zu den Rechtstexten
(§6). Das Projekt-Briefing mit Design-Richtung und Arbeitsregeln bleibt `../CLAUDE.md` (Hinweis: dessen TODO-Liste und
`../DEPLOY.md`/`../HANDOVER.md` sind teils überholt, siehe §13).

## 0. In 60 Sekunden

- **Was:** One-Pager https://roger-g.de für die „Try Out Tour 26" von Roger G. (Stand-up-Comedy, neues Programm auf
  kleinen Bühnen): Hero als Plakat, Laufband, Terminliste „Termine" (9 Shows: 6 gespielte 11.09.–10.10.2026, alle ausverkauft, + 3 neue
  07.01.–10.03.2027 in Hamburg/Berlin; seit 19.10.2026), zweite Terminliste
  „So Freunde!" (8 Shows der großen Tour, alle ausverkauft), Klaviyo-Anmeldeformular („Warteliste"), Erklärblock
  „Was ist eine Try-Out-Show?", Footer; dazu `/impressum/` und `/datenschutz/`. Kein Shop, kein Login, kein CMS.
- **Stack:** Astro 7 (rein statisch, `site: https://roger-g.de`, `@astrojs/sitemap`), kein UI-Framework. Ein
  Client-Bundle `src/scripts/animations.ts` (GSAP + ScrollTrigger + SplitText + Lenis, gebaut ≈141 KB). Fonts über
  `@fontsource` (Titan One + Poppins) selbst gehostet. Design-Tokens als CSS-Variablen in `src/styles/global.css`.
  Dockerfile: node:22-alpine baut `dist/` → **nginx:alpine mit Default-Konfiguration** (keine eigene `nginx.conf`).
- **Daten:** Alle Termine stehen in **`src/data/tour.ts`** (zwei Arrays `tourDates`, `soFreundeDates` + Name/Beschreibung
  je Tour). Hero, beide Terminlisten, Laufband, About-CTA und das Schema.org-JSON-LD werden daraus generiert.
  **Nie Termine ins HTML schreiben.** Seit 17.11.2026 kommen beim Build Termine aus **System One** dazu
  (`src/data/shows.ts` → `getShows()`, Zuordnung/Merge `src/lib/systemone.ts`, alles in `docs/SYSTEMONE.md`):
  **der Build ruft die API auf und bricht ab, wenn sie nicht erreichbar ist** (ohne Netz: `SYSTEMONE_OFFLINE=1`).
- **Zeit ist eingefroren:** „Nächste Show" und das Label „Vorbei" werden **zur Build-Zeit** (Berliner Kalendertag)
  berechnet – nach jeder gespielten Show muss neu gebaut/deployt werden, sonst wirbt die Seite für eine vergangene Show
  (so geschehen 12.09.–27.09.2026, s. §12). Nächste Try-Out-Shows: 07.01., 08.01., 10.03.2027.
- **Externe Dienste:** nur Klaviyo (Onsite-Tracking-Skript im `<head>` jeder Seite + eingebettetes Formular ULLBYj).
  Es setzt Cookies und lädt Google Fonts nach – die Datenschutzseite behauptet das Gegenteil (§5/§6). Ticketlinks
  führen zu Eventim, Reservix, Ticketmaster, bergisch-live, saarlouis.de.
- **Live:** Coolify-App `roger-g.de` (uuid `zk9l0fgnk0e9f5yqpyzqaa59`, Projekt „Roger G", Quelle GitHub-App
  `Konradattelematika/roger-g.de` Branch `main`, Buildpack Dockerfile, Port 80, Domains `roger-g.de` + `www.roger-g.de`,
  Healthcheck aus, keine ENV-Variablen). **Ein Push deployt nicht sofort, aber seit 17.11.2026 automatisch
  spätestens am Folgetag:** der Skript-Loop `roger-g-rebuild` (stündlich, `docs/SYSTEMONE.md`) löst einen Deploy aus, sobald sich
  die System-One-Termine ändern, und einmal pro Tag. Vorher waren alle Deploys manuell; der API-Trigger (§9) bleibt der Weg
  für „sofort". Push/Deploy nur mit Konrads OK.
- **Testen:** `npm test` (node:test, ohne Netz; seit 17.11.2026 auch `tests/systemone.test.mts`) · `npm run build`
  (≈1,5 s, braucht Netz für System One – sonst `SYSTEMONE_OFFLINE=1`) · Screenshots
  390/1440 px mit `scripts/shot.mjs` / `scripts/scroll-shot.mjs` (Pflicht laut `CLAUDE.md` bei visuellen Änderungen).
- **Ein Loop (seit 17.11.2026):** `~/claude-cloud/loops/roger-g-rebuild/` prüft stündlich System One und deployt bei
  Änderungen sowie einmal täglich aus GitHub `main` – **was auf `main` gepusht ist, geht also ohne weiteres Zutun live.**
  Uncommittete oder nur lokal committete Änderungen hier bleiben folgenlos, bis jemand pusht.

## 1. Lagekarte

```
 src/data/tour.ts  { tourName, tourDescription, tourDates[9], soFreundeName, soFreundeDescription, soFreundeDates[8] }
        │
        ├─► src/components/Hero.astro       „Nächste Show · 07. Jan · Hamburg"  (nextShow() aus src/lib/dates.ts)
        ├─► src/components/Marquee.astro    „8 Städte" (verschiedene Städte in tourDates)
        ├─► src/components/About.astro      „8 Städte. Ein Zettel. Null Garantie." (dito) + Footer
        └─► src/components/TourDates.astro  ×2 (index.astro): kommende Shows oben, darunter „Schon gespielt" (splitByPast());
                                            Karten „07 Jan / Donnerstag 2027 / Hamburg / Tickets|Ausverkauft|Ausverkauft+Vorbei"
                                            + <script type="application/ld+json"> je Liste ein @graph aus ComedyEvent
        ▼
 src/pages/index.astro ─ src/layouts/Layout.astro (<head>: Canonical, OG, Sitemap-Link, Klaviyo-Loader; <body>: animations.ts)
 src/pages/impressum.astro, datenschutz.astro (statischer Text, gleiche Layout-Hülle)
        ▼
 astro build → dist/ (index.html, impressum/index.html, datenschutz/index.html, _astro/, img/, og.jpg, sitemap-*.xml, robots.txt)
        ▼
 Dockerfile (node:22-alpine `npm ci` + `npm run build` → nginx:alpine, Default-Config) → Coolify roger-g.de → Traefik → https://roger-g.de
        ▲
 Browser des Besuchers: lädt zusätzlich static.klaviyo.com (Onsite-Skript + Formular), a.klaviyo.com (Tracking), fonts.googleapis.com
```

Es gibt keine Laufzeit-Konfiguration und keinen Rückkanal: Der Server liefert nur Dateien. Coolify baut **aus GitHub
`main`**, nicht aus diesem Arbeitsbaum.

## 2. Repo-Baum mit Rolle jeder Datei

```
tryout-tour/                      (Klon von github.com/Konradattelematika/roger-g.de, Branch main)
├── CLAUDE.md                     Projekt-Briefing: Stack, Font-Wahl, Design-Richtung, 5 Arbeitsregeln, TODO-Liste (teils überholt), Deployment-Absatz (überholt)
├── README.md                     Quickstart (npm install, claude, npm run dev)
├── DEPLOY.md                     Coolify-Einrichtung in 4 Schritten (Schritt 4 „Webhook/Auto-Deploy" trifft nicht zu, §9) + Go-Live-Checkliste (erledigt)
├── HANDOVER.md                   Übergabe vom 11.07.2026 an die Cloud-Instanz (Setup, Verifikations-Loop, Aufgabenfolge) – historisch, nennt noch Anton/Rubik
├── docs/NAVIGATION.md            diese Karte (27.09.2026)
├── astro.config.mjs              site https://roger-g.de, sitemap(), devToolbar aus · KEIN trailingSlash-Setting (Default 'ignore', Ausgabe als Verzeichnisse)
├── tsconfig.json                 extends astro/tsconfigs/strict, include **/* (also auch tests/)
├── package.json                  Scripts: dev, build, preview, astro, test · engines node >= 22.12 · deps: astro 7, @astrojs/sitemap, @fontsource/{titan-one,poppins}, gsap, lenis · dev: lighthouse, playwright-core, sharp
├── Dockerfile                    Stage 1 node:22-alpine `npm ci` (inkl. devDependencies) + `npm run build`; Stage 2 nginx:alpine, kopiert dist/ – keine nginx.conf
├── .dockerignore                 node_modules dist shots design-reference .astro .git lighthouse.json
├── .gitignore                    dist/ .astro/ shots/ lighthouse.json design-reference/*.png|pdf node_modules/ .env* .playwright-mcp/ (seit 27.09.)
├── .mcp.json                     Playwright-MCP für interaktive Claude-Code-Sitzungen → scripts/mcp-playwright.sh
├── .vscode/                      launch.json (astro dev), extensions.json
├── design-reference/             README.md (Plakat-Analyse + Arbeitsauftrag, erledigt 11.07.) · 1.png–6.png, 14.png, PDF = Plakat-Originale (73 MB, IGNORIERT, nur auf diesem Server)
├── public/                       1:1 kopiert: favicon.ico/svg, og.jpg (1200×630), robots.txt (Allow all + Sitemap-URL),
│   └── img/                      motiv-{480,768,1080}.{avif,webp} (Hero mobil quer), motiv-hoch-{480,768}.* (Hero schmale Phones), plakat-{480,768,1080}.* (Desktop-Poster)
├── scripts/
│   ├── crop-motiv.mjs            erzeugt motiv-* und motiv-hoch-* per sharp aus design-reference/1.png (Rahmen + Plakattypo weggeschnitten); plakat-* entstehen NICHT hier
│   ├── env.sh                    LD_LIBRARY_PATH/FONTCONFIG_PATH (~/chrome-libs, ohne root) + CHROME_PATH (Chromium-Revision 1228) – vor shot/scroll-shot `source`n
│   ├── mcp-playwright.sh         startet `npx @playwright/mcp@latest --headless` mit CHROME_PATH (zieht das Paket bei jedem Start aus dem Netz)
│   ├── shot.mjs                  Screenshot: <url> <breite> <out.png> [--full] [--reduced] [--wait ms]; Pfad zur headless-shell-Revision 1228 fest verdrahtet
│   └── scroll-shot.mjs           scrollt zu <selector>, wartet 1,6 s (ScrollTrigger), dann Viewport-Screenshot
├── src/
│   ├── data/shows.ts             (17.11.) `getShows()`: tour.ts + System One (Build-Zeit), Abbruch bei API-Ausfall, Snapshot `systemone-snapshot.json` – Komponenten lesen Termine NUR hierüber
│   ├── data/tour.ts              ⭐ handgepflegte Termine (seit 17.11. ergänzt um System One): Interface TourDate {date (ISO mit Offset), city, venue, street?, postalCode?, ticketUrl, soldOut?}, beide Listen, Namen, Beschreibungen, Quellen-Kommentar
│   ├── lib/systemone.ts          (17.11.) System One: Mapping, Zuordnung zu den Listen, Merge mit tour.ts (reine Funktionen, `docs/SYSTEMONE.md`)
│   ├── lib/dates.ts              (27.09.) parseIso (Jahr 2000–2099, sonst Build-Abbruch), berlinDay, berlinOffset, posterDate, nextShowLabel, isPast, nextShow – alles in Europe/Berlin
│   ├── layouts/Layout.astro      <html lang=de>, Meta/Canonical/OG/Sitemap-Link, theme-color, Favicon, Klaviyo-Loader (company_id UXG8NH) + Init-Snippet, slot name=head, lädt animations.ts
│   ├── pages/index.astro         Reihenfolge: Hero → Marquee → TourDates#termine → TourDates#so-freunde → Signup#anmelden → About#about (+Footer)
│   ├── pages/impressum.astro     § 5 DDG: „Roger G", Wertstraße 35, 18057 Rostock, info@g-maltes.de, „Geschäftsführer: Gregor Kurtz", Steuernummer – Text direkt in der Datei
│   ├── pages/datenschutz.astro   Verantwortlicher, „Grundsätzliches" (keine Cookies/kein Tracking – FALSCH, §5), Hosting Hetzner, Ticketlinks – Text direkt in der Datei
│   ├── components/Hero.astro     Plakat-Hero: <picture> mit 6 <source> (≥900 px plakat-*, ≤599 px motiv-hoch-*, sonst motiv-*), LCP-<img> eager, Scrim, Kicker/Titel/Copy/CTAs, Burst-Sticker (2×, je Breakpoint einer sichtbar), Sterne, „Nächste Show"
│   ├── components/Marquee.astro  Laufband (aria-hidden, Items doppelt gerendert für den Loop, Rotation per Prop)
│   ├── components/TourDates.astro Terminliste als <ol> (Props id/heading/annotation/watermark/schemaName/schemaDescription/dates/note) + JSON-LD; Karten-Styles (Sticker-Look, Nummer-Wasserzeichen, ab 640 px dreispaltig)
│   ├── components/Signup.astro   Klaviyo-Embedded-Form-Container <div class="klaviyo-form-ULLBYj"> + globale Breiten-Fixes (Formular hat feste 410 px aus dem Klaviyo-Editor)
│   ├── components/About.astro    Erklärblock, pinker CTA-Banner (Städtezahl aus tour.ts), <footer> mit Links /impressum/ und /datenschutz/
│   ├── scripts/animations.ts     Lenis + GSAP: Hero-Intro (SplitText-Buchstaben, sr-only-Kopie für Screenreader), Dauer-Loops, Hero-Parallax, je .dates-section eine Scroll-Sequenz, [data-reveal]; bei prefers-reduced-motion passiert NICHTS
│   └── styles/global.css         Tokens (Plakat-Palette --pink #e890c6, --plum, Glow, Fonts, fluider Typo-Scale, --band-h), Reset, Utilities .container .section .display .subline .annotation .scratched .btn .btn-ghost .burst .star .watermark .marquee* .sr-only
├── tests/                        (27.09.) dates.test.mts (9 Tests src/lib/dates.ts), tour.test.mts (7 Tests Datenprüfung tour.ts) – `npm test`
├── shots/                        (ignoriert) 39 Verifikations-Screenshots vom 11.07.2026
├── lighthouse.json               (ignoriert) Lighthouse-Report 11.07.2026 (Perf 0.99 / A11y 1 / BP 1 / SEO 1 – VOR Klaviyo gemessen)
├── .playwright-mcp/              (ignoriert seit 27.09.) Konsolen-Logs/Seiten-Snapshots aus MCP-Sitzungen 09./10.08.2026
├── .astro/, dist/, node_modules/ (ignoriert) Astro-Typen (dev.json nennt einen toten Dev-Server-PID vom 11.07.), Build-Ausgabe, Abhängigkeiten (vorhanden, Stand 11.07.)
```

## 3. Termine: Datenfluss und Regeln

**`src/data/tour.ts`** – so ist es gemeint (und seit 27.09. getestet, `tests/tour.test.mts`):
- `date` ist **Berliner Ortszeit mit explizitem Offset**, z. B. `2026-10-02T20:00:00+02:00`; im Winter `+01:00`
  (Umstellung 25.10.2026 – Köln/Dortmund/Berlin im November stehen korrekt mit `+01:00`). Ein falscher Offset fällt im Test auf.
- Beide Listen **chronologisch aufsteigend** (Test); angezeigt wird kommend vor gespielt (`splitByPast`), Nummern-Wasserzeichen 01, 02, … in Anzeigereihenfolge.
- `ticketUrl` optional (fehlt → „Tickets bald" statt Button, im JSON-LD kein `offers.url`), wenn gesetzt immer https, **ohne `affiliate=`-Parameter** (Commit 5148c83 hat `?affiliate=TUG` entfernt, der Code gehört
  nicht dem Betreiber). `soldOut: true` ersetzt den Ticket-Button durch „Ausverkauft". `street`/`postalCode` sind
  optional (gesetzt nur bei Indra Hamburg und Mad Monkey Room Berlin) und landen nur im JSON-LD.
- Quellen der Daten (Kommentar im Dateikopf): Eventim-Artist-Seiten, Reservix, Ticketmaster, Venue-VVK; recherchiert
  08./09.08.2026. Uhrzeiten der Try-Out-Shows sind laut `CLAUDE.md` nur die Annahme 20:00.

**`src/lib/dates.ts`** (seit 27.09.2026; vorher rechneten Hero und TourDates mit `new Date(iso)` ohne Zeitzone – das
ging nur gut, weil alle Shows abends liegen; Coolify baut in UTC):
- `posterDate(iso)` → `{ big: '11 Sep', meta: 'Freitag 2026' }` (CSS macht Versalien, Monatspunkt entfernt; vorher
  stand live „2026 Freitag", weil `Intl` mit `{weekday, year}` in de-DE das Jahr voranstellt).
- `isPast(iso, now)` → Berliner Kalendertag der Show liegt vor dem Berliner Kalendertag von `now`; **am Showtag gilt
  die Show bis Mitternacht als bevorstehend**.
- `nextShow(dates, now)` → früheste nicht vergangene Show (sortiert selbst, Reihenfolge egal); `undefined`, wenn keine.
- `parseIso` wirft bei ungültigem Datum oder Jahr außerhalb 2000–2099 → `npm run build` bricht ab statt still Unsinn zu bauen.

**Was daraus wird (alles zur Build-Zeit):**
- `Hero.astro`: „Nächste Show · 02. Okt · Leer" aus `nextShow(tourDates)`; ohne kommende Show **entfällt die Zeile**
  (`animations.ts` prüft `[data-hero="next"]`, sonst GSAP-Warnung „target not found").
- `TourDates.astro` (seit 19.10.2026): `splitByPast()` teilt in **kommende Shows (oben)** und **„Schon gespielt"**
  (eigene `<ol class="dates">`, per `aria-labelledby` beschriftet – bewusst keine `<h3>`, s. Kommentar in der Datei, Karten `.is-past` gedimmt/gestrichelt), je chronologisch;
  die Dateireihenfolge in `tour.ts` bleibt chronologisch. Rechte Spalte: Button „Tickets für {city}"
  (`target=_blank rel=noopener`) nur für kommende, nicht ausverkaufte Shows; sonst `.date-status` mit „Ausverkauft"
  (`soldOut`) und/oder „Vorbei" (gespielt) – gespielte + ausverkaufte Shows zeigen beides. Nummern-Wasserzeichen
  laufen über beide Listen durch (Zähler auf `.dates-section`). Das JSON-LD ist davon unberührt: jede Show bleibt `ComedyEvent` mit
  `eventStatus EventScheduled`, `offers.availability` `InStock`/`SoldOut`, `performer` „Roger G.", `location` mit
  `addressLocality`/`addressCountry DE`, ohne Preis.
- `Marquee.astro` und `About.astro`: Städtezahl = Anzahl **verschiedener** Städte in `tourDates` (heute 8: Hamburg
  spielt 2027 zweimal; gespielte Shows zählen mit).
- Zweite Liste `#so-freunde` (Annotation „Komplett ausverkauft", Hinweis auf die Warteliste): alle 8 Einträge
  `soldOut`, vier davon inzwischen gespielt → „Vorbei", vier „Ausverkauft" (Erfurt 27.09., Jena 28.09., Köln 01.11.,
  Dortmund 02.11., Berlin 06.11.).

**Folge für den Betrieb:** Weil die Seite statisch ist, stimmt „Nächste Show"/„Vorbei" nur zum Build-Zeitpunkt. Nach
jeder Show (Try Out: 02.10., 03.10., 04.10., 08.10., 10.10.) neu deployen (§9) – oder die Auswertung clientseitig
machen (Vorschlag §12). Die alten Try-Out-Shows 2026 sind seit 19.10.2026 auf Konrads Wunsch `soldOut: true` (Anzeige „Ausverkauft · Vorbei")
und bleiben als Referenz auf der Seite; die 2027er Termine stammen aus Rogers Ticketing-Tracking-Tabelle (Upload
19.10.2026, „Tryout_Tour_2027_Ticketing_Tracking"). Ohne kommende Show entfällt die Hero-Zeile, die Liste zeigt dann
nur „Schon gespielt".

## 4. Seiten, Layout, Komponenten, Animationen

- **`Layout.astro`**: `title`/`description`/`ogImage` als Props; Canonical = `Astro.site` + Pfad (ergibt
  `https://roger-g.de/impressum/` mit Slash – so auch in der Sitemap); `<link rel="sitemap">`; OG type/locale/
  title/description/url/image (absolut), Twitter `summary_large_image`; `theme-color #7a5069`; Favicon SVG;
  **Klaviyo**: `<script async src="https://static.klaviyo.com/onsite/js/UXG8NH/klaviyo.js?company_id=UXG8NH">` +
  Init-Snippet (`window.klaviyo`-Proxy) auf **jeder** Seite, auch Impressum/Datenschutz; `<slot name="head">`
  (ungenutzt); am Body-Ende `<script src="../scripts/animations.ts">` (Astro bündelt zu `_astro/Layout…js`).
- **Fonts**: `@fontsource/titan-one` (Display) + `@fontsource/poppins` 400/600/700 (Body) werden in `Layout.astro`
  importiert; Astro kopiert die woff/woff2 (inkl. latin-ext/devanagari-Subsets mit `unicode-range`, nur die genutzten
  werden geladen) nach `dist/_astro/`. Begründung der Font-Wahl in `CLAUDE.md`.
- **Hero**: mobil Full-Bleed-Motiv (Stage `position:absolute`, 100vw), Scrim-Verläufe für Lesbarkeit, Typo oben,
  CTA-Block unten (`margin-top:auto`); ab 900 px Grid „Typo links, schwebendes Poster rechts" (`rotate: 2.5deg`, Glow-Schatten);
  Burst-Sticker „100 % ungetestet" existiert zweimal (mobil in der CTA-Zeile, Desktop an der Poster-Ecke).
  `min-height: calc(100svh - var(--band-h))`, damit das Laufband im ersten Viewport sichtbar bleibt.
- **Marquee**: `--marquee-rotate` per Prop, Items × 2, CSS-Animation `translateX(-50%)` (in `global.css`).
- **TourDates**: Karten `rotate ±0.35deg` (Sticker-Look), Hover-Lift, `::after` Nummer; ab 640 px
  `grid-template-columns: minmax(10rem, max-content) 1fr auto`. Labels: `.date-status` > `.date-label` („Ausverkauft"/„Tickets bald", Titan One, pink) / `.date-past` („Vorbei", klein, gedimmt).
- **Signup**: nur Container + Überschrift; Formularinhalt, Felder (First Name, „Stadt" = organization, Email) und
  Styling kommen aus dem **Klaviyo-Editor** (Form-ID ULLBYj). Globale `!important`-Regeln zwingen das feste 410-px-
  Formular auf 100 % Breite (Overflow-Fix vom 10.08.).
- **About**: Zweispalter ab 820 px, pinker CTA-Banner (`rotate -0.6deg`), Footer mit Rechtslinks.
- **animations.ts** (nur wenn `prefers-reduced-motion` NICHT gesetzt ist): Lenis (`lerp 0.12`) treibt ScrollTrigger;
  Anker-Links scrollen über Lenis; Hero-Intro-Timeline (Kicker → SplitText-Buchstaben von „Roger G." mit
  `aria:'none'` + sr-only-Kopie → Subline → Copy → CTAs → Nächste Show → Sticker → Sterne; Desktop: Stage fliegt ein,
  mobil: Ken-Burns-Zoom); Dauer-Loops (Stage, Sticker, Sterne); Hero-Parallax per Scrub; je `.dates-section` eine
  Timeline (`start: 'top 75%'`: Titel, Annotation, Karten-Kaskade, Datum-Stempel) + Wasserzeichen-Scrub; `[data-reveal]`.
  **Screenshots ohne Scrollen zeigen die Sektionen daher leer** – `scroll-shot.mjs` oder `shot.mjs --reduced` nutzen.
- **Rechtsseiten**: reiner Text in `.legal`-Spalte (Styles in beiden Dateien dupliziert), Link „← Zurück zur Tour".

## 5. Klaviyo: was auf der Seite wirklich passiert (Beleg 27.09.2026)

Gemessen mit Headless-Chromium (390 px, `https://roger-g.de/`, bis zur Signup-Sektion gescrollt), nur lesend:

| Beobachtung | Befund |
|---|---|
| Drittanbieter-Requests | `static.klaviyo.com` (25), `static-tracking.klaviyo.com` (4), `a.klaviyo.com` (3, u. a. `onsite/track-analytics?company_id=UXG8NH`), `fast.a.klaviyo.com` (1), `static-forms.klaviyo.com` (1), **`fonts.googleapis.com` (1) + `fonts.gstatic.com` (4)** – die Google-Fonts lädt das Klaviyo-Formular nach |
| Cookie | `__kla_id` auf `roger-g.de`, Laufzeit 400 Tage, SameSite Lax, nicht httpOnly |
| localStorage | `klaviyoOnsite`, `$referrer`, `$last_referrer`, `kl-post-identification-sync` |
| sessionStorage | `klaviyoPagesVisitCountV2`, `klaviyoFormSubmit` |
| Formular (gerendert) | Text „JETZT WIRD GETOURT! Trag dich ein: Wenn Tickets zurückkommen oder Zusatzshows dazukommen, erfährst du's zuerst." Felder First Name, Stadt, Email, Button „Anmelden" |
| Konsole | Klaviyo meldet `is_robot: true` und schaltet Tracking im Headless-Browser ab; bei echten Besuchern ist es an. Die `track-analytics`-Aufrufe scheiterten hier an CORS (`ERR_FAILED`) – kein Fehler der Seite |

Das gilt für **alle drei Seiten** (Loader steckt in `Layout.astro`), also auch beim Lesen der Datenschutzerklärung.
Wessen Klaviyo-Konto UXG8NH ist (vermutlich das des G-Maltes-Shops, s. `ROGER/RogerGTools` Newsletter-Werkzeug), ist
von hier nicht verifiziert. IDs `UXG8NH`/`ULLBYj` stehen im öffentlichen HTML, sind also keine Geheimnisse.

## 6. Rechtstexte: Faktenlage (Stand 27.09.2026)

**Datenschutz (`src/pages/datenschutz.astro`)** – drei Aussagen sind seit Commit 64d065e/50bdbd8 (08.08.2026,
Klaviyo eingebaut) **falsch**: „ohne … Tracking", „Es werden keine Cookies gesetzt und keine Analyse-Tools eingebunden",
„Schriften … werden von diesem Server selbst ausgeliefert (kein Google Fonts o. ä.)". Es fehlen: Klaviyo (Klaviyo Inc.,
USA) als Empfänger/Auftragsverarbeiter für Newsletter/Warteliste (Zweck, Rechtsgrundlage Einwilligung, Widerruf), das
Onsite-Tracking/Cookie (`__kla_id`, 400 Tage → nach § 25 TDDDG einwilligungspflichtig, es gibt keinen Consent-Dialog),
die Google-Fonts-Nachladung durch das Formular (IP-Übermittlung an Google) sowie das Datum der Erklärung. Die
Hosting-Aussage (Hetzner, Server-Logs) ist plausibel, aber Log-Aufbewahrung ist nicht genannt. **Was zu tun ist,
entscheiden Konrad/Roger** (Text vom Anwalt/Generator, ggf. Consent für das Tracking oder Klaviyo-Loader nur auf
Einwilligung laden, Formular ohne Google Fonts konfigurieren). Kein Agent soll Rechtstexte erfinden.

**Impressum (`src/pages/impressum.astro`)**: Anbieter „Roger G" ohne Rechtsform, Wertstraße 35, 18057 Rostock,
`info@g-maltes.de`, „Geschäftsführer: Gregor Kurtz", Steuernummer 079/111/05785. Widersprüchlich in sich: ein
„Geschäftsführer" gehört zu einer Gesellschaft (dann fehlen Firma, Rechtsform, Registergericht/HRB), ein
Einzelunternehmer nennt seinen vollen Namen als Anbieter. Keine Telefonnummer, keine USt-IdNr. (nur Pflicht, soweit
vorhanden); eine **Steuernummer** ist nicht vorgeschrieben und wird wegen Missbrauchsrisiko üblicherweise nicht
veröffentlicht. Dieselbe Anschrift + Steuernummer steht im Shop-Footer-Impressum von g-maltes.de; g-laber.com nennt
Friedrichshöhe 3, Shop-Datenschutz/Shopify-Einstellung Platz der Freundschaft 13 c/o JAWOLLJA GmbH – die komplette
Gegenüberstellung aller Anschriften steht in `ROGER/g-laber-website/docs/NAVIGATION.md` §6. Entscheidung (welche
Anschrift, welche Rechtsform, Steuernummer raus?) liegt bei Konrad; Änderungsort hier sind allein die zwei Seiten.

## 7. Konfiguration (nur Namen, keine Werte)

- **Keine ENV-Variablen**, weder im Build noch zur Laufzeit; Coolify-App hat 0 Einträge. Kein `.env`.
- **Feste Werte im Code:** `site` in `astro.config.mjs`; Klaviyo `company_id UXG8NH` in `Layout.astro`, Form-ID
  `ULLBYj` in `Signup.astro`; Kontaktadresse `info@g-maltes.de`, Anschrift, Steuernummer in den Rechtsseiten.
- **Werkzeug-Umgebung (nur auf diesem Server):** `scripts/env.sh` (Chromium-Libs unter `~/chrome-libs`, Revision 1228
  unter `~/.cache/ms-playwright/`), `COOLIFY_API_TOKEN` in `~/claude-cloud/env` bzw. `~/claude-cloud/secrets/coolify-token`
  für den Deploy-Trigger. Nichts davon gehört ins Repo.

## 8. Testen & Verifizieren

| Was | Befehl | Erwartung (27.09.2026) |
|---|---|---|
| Unit-/Datentests | `npm test` | 16 pass (dates 9, tour 7), < 1 s, kein Netz; Node ≥ 22.12 (Type-Stripping) |
| Build | `npm run build` | 3 Seiten in ≈1,5 s, `dist/sitemap-index.xml` erzeugt; ungültiges Datum in `tour.ts` bricht den Build ab |
| Build-Inhalt prüfen | `grep -o 'Nächste Show[^/]*' dist/index.html`; JSON-LD: `python3 -c "…json.loads…"` auf die zwei `application/ld+json`-Blöcke | Hero nennt die nächste kommende Show; 9 + 8 `ComedyEvent` |
| Screenshots (Pflicht bei visuellen Änderungen) | `source scripts/env.sh; (cd dist && python3 -m http.server 4399 &)`; `node scripts/shot.mjs http://127.0.0.1:4399/ 390 out.png`; dito `1440`; Sektionen: `node scripts/scroll-shot.mjs <url> 390 '#termine' out.png` | 390 UND 1440 px ansehen; für Sektionen scroll-shot (ScrollTrigger) oder `--reduced` |
| Dev-Server | `npm run dev -- --host 127.0.0.1 --port 4321` | http://127.0.0.1:4321, Dev-Toolbar aus |
| Lighthouse | `npx lighthouse http://127.0.0.1:4321 --chrome-flags="--headless --no-sandbox" --output=json --output-path=lighthouse.json --quiet` (mit `source scripts/env.sh`) | Ziel laut CLAUDE.md Perf ≥ 95, SEO 100, A11y ≥ 95; 19.10.2026 (mit Klaviyo, `astro preview`): Perf 97 / A11y 96 / BP 100 / SEO 100 – einziger A11y-Fund: Kontrast des Klaviyo-Formular-Buttons (#ff69b4 auf Weiß, nur im Klaviyo-Editor änderbar) |
| Live-Smoke | `curl -sI https://roger-g.de/`, `…/impressum/`, `…/datenschutz/`, `…/sitemap-index.xml`, `…/og.jpg` | alle 200; `last-modified` = Zeitpunkt des Deploys; `/impressum` (ohne Slash) → 301 auf `http://…/impressum/` (nginx-Default) |
| Drittanbieter/Cookies live | Skript wie in §5 (Playwright, `context.cookies()`, `page.on('request')`) | siehe Tabelle §5 |

Tests liegen in `tests/*.test.mts` (node:test, `--experimental-strip-types`, Imports mit Dateiendung). Kein
Typecheck-Script (`npx astro check` wäre möglich, ungetestet); kein Linter.

## 9. Release & Deploy (so ist es tatsächlich gelaufen)

1. Änderung lokal, `npm test`, `npm run build`, Screenshots 390/1440.
2. `git commit` + `git push origin main` – **nur mit Konrads OK**.
3. **Deploy von Hand auslösen** (die GitHub-App-Quelle ist eingetragen, aber alle 9 Deploys in der Coolify-Historie
   waren manuell – 08.08. 12:40, 09.08. 11:46, 10.08. 08:54/10:03/11:22/11:58, 20.08. 13:06, 06.10. 13:24 (Rebuild 61bd641),
   19.10. 21:47 (API, fb6be5b) Berlin; die Pushes vom
   08.–10.08. lösten nichts aus):
   `curl -X POST -H "Authorization: Bearer $(cat ~/claude-cloud/secrets/coolify-token)" "https://coolify.jawollja.gmbh/api/v1/deploy?uuid=zk9l0fgnk0e9f5yqpyzqaa59"`
   (oder Cockpit/Coolify-UI). Build ≈ 1–2 min (npm ci mit devDependencies + astro build + nginx-Image).
4. Prüfen: `curl -sI https://roger-g.de/ | grep last-modified` (neuer Zeitstempel), Stichprobe `dist`-Inhalt vs. live,
   Historie `GET /api/v1/deployments/applications/zk9l0fgnk0e9f5yqpyzqaa59?take=3`.
- **Domains/DNS/TLS:** `roger-g.de` und `www.roger-g.de` → A 167.233.49.190 (kein AAAA). Getrennte Let's-Encrypt-
  Zertifikate über Traefik (Apex bis 08.12.2026, www bis 18.11.2026, Auto-Renew). Coolify `redirect: both` → **beide
  Hosts liefern die Seite** (kein www→Apex-Redirect); Canonical zeigt auf den Apex. http → 302 https (Traefik).
- **nginx-Default-Config im Container:** kein gzip (das 141-KB-JS geht unkomprimiert raus), keine Cache-Header, 404 =
  nginx-Standardseite, `absolute_redirect` an → Pfade ohne Slash bekommen 301 auf **http://**…/pfad/ (dann 302 https).
  Muster für eine eigene `nginx.conf`: `ROGER/g-laber-website/nginx.conf` (Dockerfile-Zeile `COPY nginx.conf /etc/nginx/conf.d/default.conf`).
- **Healthcheck** aus → Coolify-Status `running:unknown`; Pfad `/` liefert 200 und könnte aktiviert werden (UI/API, kein Code).
- **Übersicht aller Apps:** `~/claude-cloud/projects/DEPLOY-MATRIX.md` (Zeile „Roger G | roger-g.de").

## 10. Konventionen (beobachtet)

- Deutsch in Code-Kommentaren, Commit-Messages (Imperativ, Betreff + Absatz „warum"), UI-Texten, Doku. `lang="de"`.
- Termine, Städtezahl, Namen → nur `src/data/tour.ts`; Design-Werte → nur CSS-Variablen in `global.css`.
- Ticket-CTAs eindeutig („Tickets für Leer"), Copy locker im Roger-G.-Ton (`CLAUDE.md`).
- Mobile-first, 390 px primär; jede visuelle Änderung mit Screenshots 390 + 1440 belegen (Pflicht laut `CLAUDE.md`);
  Lighthouse nach größeren Änderungen.
- Bilder: AVIF + WebP, `width`/`height` gesetzt, `loading="lazy"` außer LCP; Originale nie einbinden.
- `prefers-reduced-motion` = komplett statisch; Screenreader bekommen sr-only-Kopien animierter Texte.
- Keine Abhängigkeit für Tests (node:test), Imports in Tests mit `.ts`/`.mts`-Endung.
- Datei-Kommentare erklären das **Warum** einer Regel (z. B. Slash in Footer-Links, `min-width:0` am Klaviyo-Container).

## 11. Wegweiser: „Ich soll … – wo schaue ich?"

| Aufgabe | Dateien / Befehle |
|---|---|
| Termin ergänzen/ändern, ausverkauft markieren | `src/data/tour.ts` (chronologisch einsortieren, Offset +02:00/+01:00 prüfen, `soldOut: true`) → `npm test` → `npm run build` → §9 |
| Neue Tour / Tour vorbei | `tour.ts` (Namen, Beschreibungen, Listen), Marquee-Items in `Marquee.astro`, Hero-Copy/Subline „Try Out Tour 26" in `Hero.astro`, `index.astro` (Titel/Description, Props der beiden TourDates), `og.jpg`, `About.astro` Footer „© 2026 … Try Out Tour 26" |
| „Nächste Show" falsch / gespielte Show mit Ticket-Button live | Seite ist statisch: neu deployen (§9); Logik `src/lib/dates.ts` (`nextShow`, `isPast`), Tests `tests/dates.test.mts` |
| Impressum/Datenschutz ändern | `src/pages/impressum.astro`, `src/pages/datenschutz.astro` (Text direkt in der Datei); Faktenlage §6; Anschriften-Vergleich `ROGER/g-laber-website/docs/NAVIGATION.md` §6 |
| Klaviyo-Formular ändern | Inhalt/Felder/Optik im Klaviyo-Editor (Form ULLBYj); Container + Breiten-Fixes `Signup.astro`; Loader `Layout.astro`; Tracking abschalten = Loader entfernen/auf Consent legen |
| Hero-Bild/Poster tauschen | Originale `design-reference/` (nur Server), `scripts/crop-motiv.mjs` (motiv-*), plakat-* von Hand per sharp; `<source>`-Sets in `Hero.astro`; `width`/`height` am `<img>` |
| Farben, Fonts, Abstände | `src/styles/global.css` (`:root`-Tokens); Fonts via `@fontsource` in `Layout.astro`; Begründung `CLAUDE.md` |
| Animation anpassen/entfernen | `src/scripts/animations.ts`; Sektionen brauchen `.dates-section`/`[data-reveal]`/`data-hero`-Marker |
| Neue Seite | `src/pages/<name>.astro` mit `Layout` → Sitemap automatisch; Footer-Link in `About.astro` MIT Slash |
| Visuell prüfen | §8 (`shot.mjs`, `scroll-shot.mjs`, `source scripts/env.sh`) |
| Deploy auslösen / Live prüfen | §9; Historie über die Coolify-API; Matrix `projects/DEPLOY-MATRIX.md` |
| www-Redirect, Healthcheck, gzip/Cache | Coolify-UI (Redirect-Einstellung, Healthcheck `/`); eigene `nginx.conf` nach g-laber-Muster + `Dockerfile` (Deploy nötig) |
| Lighthouse/Performance | §8; das Klaviyo-Skript und Google Fonts sind die einzigen Drittanbieter-Lasten |
| Playwright-MCP in einer interaktiven Sitzung | `.mcp.json` → `scripts/mcp-playwright.sh` (braucht Netz für `npx @playwright/mcp@latest`) |

## 12. Stolpersteine & Befunde (27.09.2026)

1. **Vergangene Show als „Nächste Show" (live seit 12.09.)**: Hero nahm `tourDates[0]`; Schleswig (11.09.) hatte bis
   heute einen Ticket-Button. Im Arbeitsbaum behoben (`src/lib/dates.ts`, Hero/TourDates), **live erst nach Commit +
   Deploy**. Bleibt strukturell: statische Seite → nach jeder Show neu deployen. Alternativen (Konrads Entscheidung):
   (a) kleiner Skript-Loop, der am Morgen nach jedem Termin aus `tour.ts` den Deploy-Trigger ruft; (b) Auswertung
   clientseitig in `animations.ts` (dann ist der Server-HTML-Stand egal, aber Flackern/JS-Pflicht).
2. **Datenschutzerklärung falsch** (§5/§6): Klaviyo-Tracking-Cookie `__kla_id` 400 Tage ohne Einwilligung, Google
   Fonts über das Formular, Klaviyo als Empfänger nicht genannt – seit 08.08.2026 live. Rechtstext + Consent-Frage → Konrad/Roger.
3. **Impressum in sich widersprüchlich** („Roger G" + „Geschäftsführer", Steuernummer öffentlich, drei verschiedene
   Anschriften über Rogers Auftritte) – Faktenlage §6 bzw. g-laber §6; Entscheidung Konrad.
4. **Kein Auto-Deploy durch Pushes** trotz GitHub-App-Quelle (seit 17.11.2026 deployt aber der Loop `roger-g-rebuild` täglich, §0); `DEPLOY.md` Schritt 4 behauptet „jeder Push deployt". Nach Push immer
   den API-Trigger rufen (§9) – oder im Coolify-UI Auto-Deploy prüfen/aktivieren.
5. **nginx-Default**: 301 auf `http://` für Pfade ohne Slash (Footer-Links seit 27.09. mit Slash; externe Links auf
   `/impressum` bleiben betroffen), kein gzip, keine Cache-Header, Standard-404. Eigene `nginx.conf` nach g-laber-Muster
   (Deploy nötig, Konrads OK).
6. **Kartenmeta „2026 Freitag"** (Jahr vor Wochentag) war ein `Intl`-Artefakt; seit 27.09. „Freitag 2026" (Screenshots 390/1440 geprüft).
7. **Städtezahl** stand im Laufband hart als „6" (About rechnete aus `tour.ts`) → jetzt beide aus `tourDates.length`; die Zahl zählt gespielte Shows mit.
8. **JSON-LD** listet gespielte Shows weiter als `EventScheduled`/`InStock` und ohne `price` – Google akzeptiert das, zeigt aber Warnungen zu optionalen Feldern; bewusst unverändert.
9. **Lighthouse** (19.10.2026, lokal, mit Klaviyo): 97/96/100/100. A11y-Rest: Klaviyo-Button-Kontrast 2,64:1 (Klaviyo-Editor). Achtung: per GSAP versteckte Sektionstitel (autoAlpha bis zum Scrollen) zählen für axe als nicht vorhanden – darum keine `<h3>` unter den Termin-`<h2>`.
10. **Screenshot-Skripte hängen an Chromium-Revision 1228** (`shot.mjs`, `scroll-shot.mjs`, `env.sh`); im Cache liegt auch 1234. Wenn 1228 verschwindet, sterben sie mit ENOENT – Muster für die Suche nach der neuesten Revision: `ROGER/g-laber-website/scripts/lib/browser.mjs`.
11. **Dockerfile installiert devDependencies** (lighthouse, playwright-core, sharp) in den Build-Container; `npm ci --omit=dev` wäre schneller – vorher testen, ob Astro ohne sharp baut (die Seite nutzt nur `public/`-Bilder).
12. **`redirect: both`**: www und Apex liefern beide Inhalt; Canonical rettet SEO, ein Redirect wäre sauberer (Coolify-UI).
13. **Healthcheck aus** → `running:unknown`; `/` liefert 200.
14. **Doku überholt**: `CLAUDE.md` TODOs (Ticketlinks „offen" – seit 09.08. drin; Domain „TBD" – gesetzt; Rechtstexte „Platzhalter" – gefüllt, aber s. 2/3), Deployment-Absatz; `HANDOVER.md` (Anton/Rubik, Setup-Schritte) historisch; `DEPLOY.md` Go-Live-Checkliste erledigt. Hinweisblöcke seit 27.09. im Kopf.
15. **Tourname vs. 2027**: Seit 19.10.2026 stehen Termine 2027 auf der Seite, Branding bleibt aber „Try Out Tour 26" (Hero-Subline, Laufband, Footer, `tourName`, Seitentitel „Try Out Tour 2026", Wasserzeichen „26", Plakat/OG-Bild). Umbenennen ist Konrads/Rogers Entscheidung (Wegweiser „Neue Tour" §11).
16. **`.playwright-mcp/`** (MCP-Sitzungsartefakte 09./10.08.) lag untracked im Baum – seit 27.09. in `.gitignore`; `.astro/dev.json` nennt einen toten Dev-Server-PID.

## 13. Doku-Landkarte

| Datei | Inhalt | Stand |
|---|---|---|
| `CLAUDE.md` | Briefing, Font-Wahl, Design-Richtung, Arbeitsregeln (Screenshots, Lighthouse, Daten nur in tour.ts), TODOs | 11.07.2026; Hinweisblock + TODO-Korrektur 27.09. |
| `docs/NAVIGATION.md` | diese Karte | 27.09.2026 |
| `README.md` | Quickstart | 11.07.2026 |
| `DEPLOY.md` | Coolify-Einrichtung, Go-Live-Checkliste | 11.07.2026 (Schritt 4 überholt, Checkliste erledigt) |
| `HANDOVER.md` | Übergabe an die Cloud-Instanz, Verifikations-Loop, Aufgabenfolge | 11.07.2026, historisch |
| `design-reference/README.md` | Plakat-Analyse + Arbeitsauftrag Design-Angleichung | 11.07.2026, erledigt |
| `tests/*.test.mts` | ausführbare Spezifikation von `tour.ts` und `dates.ts` | 27.09.2026 |
| `~/claude-cloud/projects/registry.json` → `ROGER/tryout-tour` | Zweck, Deploy-Weg, Status, TODO für Jarvis/Jobs | 27.09.2026 |
| `~/claude-cloud/projects/DEPLOY-MATRIX.md` | Coolify-App-Zeile, Deploy-Typ E („nur UI/API-Trigger") | 26.09.2026 |
| `ROGER/g-laber-website/docs/NAVIGATION.md` §6 | Gegenüberstellung aller Anschriften/Steuernummer über Rogers Auftritte | 27.09.2026 |
| `~/claude-cloud/projects/KNOWLEDGE-COMPACTION-STATUS.md` | Verlauf der Compaction-Läufe, offene Entscheidungen | laufend |

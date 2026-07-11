# Deploy — roger-g.de via Coolify

Statischer Astro-Build (`npm run build` → `dist/`). DNS: A-Record roger-g.de → 167.233.49.190 (gesetzt 2026-07-11).

## Coolify-Einrichtung (einmalig, im Coolify-UI)

1. **New Resource → Application → Private Repository (GitHub)**
   Repo: `Konradattelematika/roger-g.de`, Branch `main`.
2. **Build Pack: Dockerfile** (liegt im Repo-Root; baut mit Node 22 und served via nginx).
   Alternativ Build Pack **Static**: Build Command `npm run build`, Publish Directory `dist`.
3. **Domain:** `https://roger-g.de` eintragen → Let's-Encrypt-Zertifikat holt Coolify automatisch.
   Optional `www.roger-g.de` als zusätzliche Domain/Redirect.
4. **Deploy** klicken. Webhook/Auto-Deploy aktivieren → jeder Push auf `main` deployt neu.

## Vor dem ersten öffentlichen Go-Live

- [ ] Echte Ticketlinks + Uhrzeiten in `src/data/tour.ts`
- [ ] Impressum (`src/pages/impressum.astro`) mit echten Angaben füllen (§ 5 DDG)
- [ ] Datenschutz (`src/pages/datenschutz.astro`): Hosting-Abschnitt konkretisieren
- [ ] Branding-Freigabe durch Roger (Palette/Fonts sind vom Plakat abgeleitet)

# Deploy — roger-g.de via Coolify

> **Stand 27.09.2026:** App eingerichtet (uuid `zk9l0fgnk0e9f5yqpyzqaa59`, Dockerfile, Domains roger-g.de + www,
> live seit 08.08.2026). Schritt 4 trifft nicht zu: alle 7 Deploys bisher manuell, ein Push auf `main` löst nichts
> aus → nach dem Push `POST https://coolify.jawollja.gmbh/api/v1/deploy?uuid=zk9l0fgnk0e9f5yqpyzqaa59`
> (Token in `~/claude-cloud/secrets/coolify-token`). Ablauf, Domains/TLS, nginx-Befunde: `docs/NAVIGATION.md` §9.
> Die Go-Live-Checkliste unten ist abgearbeitet; was an den Rechtstexten offen ist, steht in `docs/NAVIGATION.md` §6.

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

- [x] Echte Ticketlinks in `src/data/tour.ts` (09.08.2026; Uhrzeiten 20:00 weiter Annahme)
- [x] Impressum (`src/pages/impressum.astro`) gefüllt (11.07.2026) – Rechtsform/Steuernummer/Anschrift offen, s. `docs/NAVIGATION.md` §6
- [x] Datenschutz (`src/pages/datenschutz.astro`): Hosting-Abschnitt konkretisiert – aber Klaviyo-Tracking/Cookie/Google Fonts fehlen, s. `docs/NAVIGATION.md` §5
- [ ] Branding-Freigabe durch Roger (Palette/Fonts sind vom Plakat abgeleitet)

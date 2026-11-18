// Termine für die Seite = handgepflegte Listen (tour.ts) + System One (Build-Zeit).
// Alle Komponenten holen ihre Termine HIER (getShows()), nicht direkt aus tour.ts.
//
// Ablauf beim `npm run build` (loadShows):
//  1. System-One-API live abfragen (alle Seiten, Timeout 15 s, bis zu 3 Versuche).
//     Einzelne unbrauchbare Datensätze werden mit Warnung übersprungen (mapResponse).
//  2. Klappt der Abruf nicht (Netz, 5xx, kaputtes JSON) oder ist KEIN einziger gelieferter
//     Datensatz lesbar, BRICHT DER BUILD AB. Dann bleibt die bisher deployte Version mit
//     ihren Terminen live (Coolify tauscht den Container nur nach einem erfolgreichen Build)
//     und der Loop roger-g-rebuild meldet den Fehlschlag per Mail. Es gibt bewusst keinen
//     automatischen Rückfall auf den Snapshot: der kann älter sein als der zuletzt
//     veröffentlichte Stand und würde seither veröffentlichte Termine wieder entfernen.
//  3. SYSTEMONE_OFFLINE=1 baut bewusst mit dem committeten Snapshot
//     src/data/systemone-snapshot.json (`npm run systemone:snapshot`) – nur für Arbeiten
//     ohne Netz, nicht als Ausfallsicherung.
//  4. SYSTEMONE_FIXTURE=<json> liest stattdessen eine Testdaten-Datei (kein Netz,
//     kein Snapshot) – nur für Vorschau/Tests (tests/fixtures/), NIE deployen.
// Besucher laden NICHTS von System One (kein Drittanbieter-Request im Browser,
// Datenschutzerklärung bleibt davon unberührt). Folge: neue Termine/Ausverkauft
// erscheinen erst nach einem neuen Build/Deploy.
import { readFileSync } from 'node:fs';
import {
  tourDates,
  soFreundeDates,
  abgeblasenDates,
} from './tour.ts';
import type { TourDate } from './tour.ts';
import snapshot from './systemone-snapshot.json' with { type: 'json' };
import {
  SYSTEMONE_ARTIST_ID,
  SYSTEMONE_URL,
  groupOther,
  mapResponse,
  mergeDates,
} from '../lib/systemone.ts';
import type { ExtraList, SystemOneResponse, SystemOneShow } from '../lib/systemone.ts';

export interface Shows {
  tryout: TourDate[];
  soFreunde: TourDate[];
  /** Neue Tour Abgeblasen (eigener Abschnitt, erscheint erst mit dem ersten Termin) */
  abgeblasen: TourDate[];
  /** Programme, die weder Try Out, So Freunde noch Abgeblasen sind (z. B. eine neue Tour) */
  other: ExtraList[];
  /** Woher die System-One-Daten stammen: live | snapshot | fixture (Testdaten) */
  source: 'live' | 'snapshot' | 'fixture';
  apiCount: number;
  /** Gelieferte Datensätze, die nicht lesbar waren und übersprungen wurden */
  skipped: number;
}

export function systemOneQuery(page: number): string {
  const q = new URLSearchParams({
    artistIds: String(SYSTEMONE_ARTIST_ID),
    lang: 'de-DE',
    per_page: '500',
    upcoming_limit: '730',
    cancelled: 'true',
    page: String(page),
  });
  return `${SYSTEMONE_URL}?${q}`;
}

/** Mehr Seiten ruft fetchSystemOne nicht ab – meldet die API mehr, ist das ein Fehler (keine Teilliste veröffentlichen). */
const MAX_PAGES = 10;

/** Alle Seiten der API laden (max. 10 × 500 Shows). Wirft bei jedem Fehler. */
export async function fetchSystemOne(fetchImpl: typeof fetch = fetch): Promise<SystemOneShow[]> {
  const all: SystemOneShow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchImpl(systemOneQuery(page), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as SystemOneResponse;
    if (!Array.isArray(body?.data)) throw new Error('Antwort ohne data-Array');
    if ((body.pagination?.pageCount ?? 1) > MAX_PAGES) {
      throw new Error(
        `${body.pagination?.pageCount} Seiten gemeldet, abgerufen werden höchstens ${MAX_PAGES} – die Liste wäre unvollständig`
      );
    }
    all.push(...body.data);
    if (!body.pagination || page >= body.pagination.pageCount) break;
  }
  return all;
}

export function buildShows(
  raw: SystemOneShow[],
  source: Shows['source'],
  warn: (message: string) => void = console.warn
): Shows {
  // Jede Warnung aus mapResponse steht für einen übersprungenen Datensatz.
  let skipped = 0;
  const api = mapResponse(raw, SYSTEMONE_ARTIST_ID, (message) => {
    skipped++;
    warn(message);
  });
  return {
    tryout: mergeDates(tourDates, api.filter((a) => a.list === 'tryout'), warn),
    soFreunde: mergeDates(soFreundeDates, api.filter((a) => a.list === 'soFreunde'), warn),
    abgeblasen: mergeDates(abgeblasenDates, api.filter((a) => a.list === 'abgeblasen'), warn),
    other: groupOther(api),
    source,
    apiCount: api.length,
    skipped,
  };
}

/** Inhalt von systemone-snapshot.json (scripts/systemone-snapshot.mjs). */
export interface SystemOneSnapshot {
  fetchedAt?: string;
  data?: SystemOneShow[];
}

export interface LoadOptions {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  snapshot?: SystemOneSnapshot;
  /** Versuche für den Live-Abruf – überbrückt kurze Aussetzer der API */
  attempts?: number;
  retryDelayMs?: number;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}

/**
 * Termine laden – Kern von getShows() ohne Cache, in Tests mit eigenem fetch/env/Snapshot
 * aufrufbar. Wirft, wenn System One nicht erreichbar ist oder keinen lesbaren Datensatz
 * liefert: lieber kein Deploy als eine Seite, auf der die Termine still fehlen.
 */
export async function loadShows(options: LoadOptions = {}): Promise<Shows> {
  const {
    fetchImpl = fetch,
    env = process.env,
    snapshot: snap = snapshot as SystemOneSnapshot,
    attempts = 3,
    retryDelayMs = 4000,
    log = console.log,
    warn = console.warn,
  } = options;

  const fromSnapshot = (reason: string): Shows => {
    const shows = buildShows(snap.data ?? [], 'snapshot', warn);
    log(
      `[systemone] Snapshot (${reason}, Stand ${snap.fetchedAt ?? 'unbekannt'}): ${shows.apiCount} Show(s)`
    );
    return shows;
  };
  const fixture = env.SYSTEMONE_FIXTURE;
  if (fixture) {
    const data = (JSON.parse(readFileSync(fixture, 'utf8')) as SystemOneResponse).data ?? [];
    warn(`[systemone] FIXTURE ${fixture} – nur Vorschau/Tests, NICHT deployen`);
    return buildShows(data, 'fixture', warn);
  }
  if (env.SYSTEMONE_OFFLINE === '1') return fromSnapshot('SYSTEMONE_OFFLINE=1');

  // Abruf und Umwandlung getrennt: ein Netzfehler ist etwas anderes als ein kaputter Datensatz.
  let raw: SystemOneShow[] | undefined;
  let lastError = '';
  for (let attempt = 1; attempt <= attempts && !raw; attempt++) {
    try {
      raw = await fetchSystemOne(fetchImpl);
    } catch (err) {
      lastError = (err as Error).message;
      warn(`[systemone] Abruf fehlgeschlagen (Versuch ${attempt}/${attempts}): ${lastError}`);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  if (!raw) {
    throw new Error(
      `System One nicht erreichbar (${lastError}). Build abgebrochen, damit keine Termine still von ` +
        `der Seite verschwinden – die bisher deployte Version bleibt live. Bewusst ohne API bauen: ` +
        `SYSTEMONE_OFFLINE=1 (nimmt den committeten Snapshot).`
    );
  }
  const shows = buildShows(raw, 'live', warn);
  // Leere Antwort = „keine sichtbaren Termine" (in Ordnung). Datensätze geliefert, aber keiner
  // lesbar = Datenfehler (z. B. geändertes Format) – nicht als leere Terminliste veröffentlichen.
  if (shows.apiCount === 0 && shows.skipped > 0) {
    throw new Error(
      `System One lieferte ${raw.length} Datensatz/Datensätze, aber keiner war lesbar ` +
        `(${shows.skipped} übersprungen). Build abgebrochen – die bisher deployte Version bleibt live.`
    );
  }
  log(`[systemone] live: ${shows.apiCount} Show(s) für Artist ${SYSTEMONE_ARTIST_ID}`);
  return shows;
}

let cached: Promise<Shows> | undefined;

/** Einmal pro Build laden (Hero, Marquee, Listen und About teilen sich das Ergebnis). */
export function getShows(): Promise<Shows> {
  cached ??= loadShows();
  return cached;
}

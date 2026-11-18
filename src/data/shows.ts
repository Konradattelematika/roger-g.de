// Termine für die Seite = handgepflegte Listen (tour.ts) + System One (Build-Zeit).
// Alle Komponenten holen ihre Termine HIER (getShows()), nicht direkt aus tour.ts.
//
// Ablauf beim `npm run build` (loadShows):
//  1. System-One-API live abfragen (alle Seiten, Timeout 15 s, bis zu 3 Versuche).
//     Einzelne kaputte Datensätze werden mit Warnung übersprungen (mapResponse).
//  2. Klappt der Abruf nicht (Netz, 5xx, kaputtes JSON):
//     - Snapshot src/data/systemone-snapshot.json, WENN er Termine enthält und höchstens
//       SNAPSHOT_MAX_AGE_DAYS alt ist (`npm run systemone:snapshot` + committen);
//     - sonst BRICHT DER BUILD AB. Dann bleibt die bisher deployte Version mit ihren
//       Terminen live (Coolify tauscht den Container nur nach einem erfolgreichen Build)
//       und der Loop roger-g-rebuild meldet den Fehlschlag per Mail. Vorher fiel der Build
//       still auf den (leeren) Snapshot zurück – die Termine wären von der Seite verschwunden.
//  3. SYSTEMONE_OFFLINE=1 baut bewusst mit dem Snapshot, egal wie alt (Arbeiten ohne
//     Netz, Notfall-Deploy bei längerem API-Ausfall).
// Besucher laden NICHTS von System One (kein Drittanbieter-Request im Browser,
// Datenschutzerklärung bleibt davon unberührt). Folge: neue Termine/Ausverkauft
// erscheinen erst nach einem neuen Build/Deploy.
import {
  tourDates,
  soFreundeDates,
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
  /** Programme, die weder Try Out noch So Freunde sind (z. B. eine neue Tour) */
  other: ExtraList[];
  /** Woher die System-One-Daten stammen: live | snapshot */
  source: 'live' | 'snapshot';
  apiCount: number;
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

/** Alle Seiten der API laden (max. 10 × 500 Shows). Wirft bei jedem Fehler. */
export async function fetchSystemOne(fetchImpl: typeof fetch = fetch): Promise<SystemOneShow[]> {
  const all: SystemOneShow[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetchImpl(systemOneQuery(page), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as SystemOneResponse;
    if (!Array.isArray(body?.data)) throw new Error('Antwort ohne data-Array');
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
  const api = mapResponse(raw, SYSTEMONE_ARTIST_ID, warn);
  return {
    tryout: mergeDates(tourDates, api.filter((a) => a.list === 'tryout')),
    soFreunde: mergeDates(soFreundeDates, api.filter((a) => a.list === 'soFreunde')),
    other: groupOther(api),
    source,
    apiCount: api.length,
  };
}

/** Inhalt von systemone-snapshot.json (scripts/systemone-snapshot.mjs). */
export interface SystemOneSnapshot {
  fetchedAt?: string;
  data?: SystemOneShow[];
}

/** So alt darf der Snapshot höchstens sein, um einen fehlgeschlagenen Abruf zu ersetzen. */
export const SNAPSHOT_MAX_AGE_DAYS = 3;

/** Alter des Snapshots in Tagen (Infinity ohne lesbares `fetchedAt`). */
export function snapshotAgeDays(snap: SystemOneSnapshot, now: Date = new Date()): number {
  const fetched = Date.parse(snap.fetchedAt ?? '');
  return Number.isNaN(fetched) ? Infinity : (now.getTime() - fetched) / 86_400_000;
}

export interface LoadOptions {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  snapshot?: SystemOneSnapshot;
  now?: Date;
  /** Versuche für den Live-Abruf – überbrückt kurze Aussetzer der API */
  attempts?: number;
  retryDelayMs?: number;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}

/**
 * Termine laden – Kern von getShows() ohne Cache, in Tests mit eigenem fetch/env/Snapshot
 * aufrufbar. Wirft, wenn System One nicht erreichbar ist und kein brauchbarer Snapshot
 * vorliegt: lieber kein Deploy als eine Seite, auf der die Termine still fehlen.
 */
export async function loadShows(options: LoadOptions = {}): Promise<Shows> {
  const {
    fetchImpl = fetch,
    env = process.env,
    snapshot: snap = snapshot as SystemOneSnapshot,
    now = new Date(),
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
  if (raw) {
    const shows = buildShows(raw, 'live', warn);
    log(`[systemone] live: ${shows.apiCount} Show(s) für Artist ${SYSTEMONE_ARTIST_ID}`);
    return shows;
  }

  const age = snapshotAgeDays(snap, now);
  if ((snap.data?.length ?? 0) > 0 && age <= SNAPSHOT_MAX_AGE_DAYS) {
    warn(`[systemone] API nicht erreichbar – nutze den Snapshot (${age.toFixed(1)} Tage alt)`);
    return fromSnapshot('API nicht erreichbar');
  }
  throw new Error(
    `System One nicht erreichbar (${lastError}) und kein brauchbarer Snapshot (leer oder älter als ` +
      `${SNAPSHOT_MAX_AGE_DAYS} Tage). Build abgebrochen, damit keine Termine still von der Seite ` +
      `verschwinden – die bisher deployte Version bleibt live. Notfall: SYSTEMONE_OFFLINE=1 baut ` +
      `bewusst mit dem Snapshot.`
  );
}

let cached: Promise<Shows> | undefined;

/** Einmal pro Build laden (Hero, Marquee, Listen und About teilen sich das Ergebnis). */
export function getShows(): Promise<Shows> {
  cached ??= loadShows();
  return cached;
}

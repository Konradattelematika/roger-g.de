// Termine für die Seite = handgepflegte Listen (tour.ts) + System One (Build-Zeit).
// Alle Komponenten holen ihre Termine HIER (getShows()), nicht direkt aus tour.ts.
//
// Ablauf beim `npm run build`:
//  1. System-One-API live abfragen (alle Seiten, Timeout 15 s).
//  2. Klappt das nicht (Netz, 5xx, kaputtes JSON) → letzter Stand aus
//     src/data/systemone-snapshot.json (per `npm run systemone:snapshot` aktualisieren).
//     Der Build bricht NICHT ab – die Seite soll auch ohne API deploybar sein.
//  3. SYSTEMONE_OFFLINE=1 erzwingt den Snapshot (Tests, Arbeiten ohne Netz).
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

export function buildShows(raw: SystemOneShow[], source: Shows['source']): Shows {
  const api = mapResponse(raw);
  return {
    tryout: mergeDates(tourDates, api.filter((a) => a.list === 'tryout')),
    soFreunde: mergeDates(soFreundeDates, api.filter((a) => a.list === 'soFreunde')),
    other: groupOther(api),
    source,
    apiCount: api.length,
  };
}

let cached: Promise<Shows> | undefined;

/** Einmal pro Build laden (Hero, Marquee, Listen und About teilen sich das Ergebnis). */
export function getShows(): Promise<Shows> {
  cached ??= (async () => {
    if (process.env.SYSTEMONE_OFFLINE !== '1') {
      try {
        const raw = await fetchSystemOne();
        const shows = buildShows(raw, 'live');
        console.log(`[systemone] live: ${shows.apiCount} Show(s) für Artist ${SYSTEMONE_ARTIST_ID}`);
        return shows;
      } catch (err) {
        console.warn(`[systemone] API nicht erreichbar (${(err as Error).message}) – nutze Snapshot`);
      }
    }
    const shows = buildShows((snapshot as SystemOneResponse).data ?? [], 'snapshot');
    console.log(`[systemone] Snapshot: ${shows.apiCount} Show(s)`);
    return shows;
  })();
  return cached;
}

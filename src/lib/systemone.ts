// Anbindung an System One (Tourmanagement-Software von Rogers Management).
// Reine Funktionen ohne Netz – das Laden passiert in src/data/shows.ts (Build-Zeit).
//
// API (öffentlich, ohne Schlüssel, CORS *):
//   GET https://client.systemonesoftware.com/api/v1/shows/<client-id>?artistIds=2105280&lang=de-DE&…
//   → { data: Show[], pagination: { total, page, perPage, maxPerPage, pageCount, hasResults } }
// Beobachtetes Schema (17.11.2026, 376 Shows anderer Künstler desselben Clients):
//   date.value       immer „YYYY-MM-DDT00:00:00Z" = nur der KALENDERTAG, die Uhrzeit steht separat
//   performanceTime  „20:00 Uhr" | „20:00" | „20:00 - 20:00" | „19:33 Uhr"
//   status.phase     „D" = findet statt, „C" = abgesagt (eventName dann oft „Abgesagt: …")
//   tickets          { url | null, onSaleDate | null, soldOut: boolean }
//   venue            { name, street, city, postalCode, countryCode, … }
//   production.name  Programmname (z. B. „Der Rest ist Hausaufgabe")
//   eventName        Anzeigename („Solo: …", „Preview: …", „Premiere: …")
import { berlinOffset } from './dates.ts';
import type { TourDate } from '../data/tour.ts';

export const SYSTEMONE_URL =
  'https://client.systemonesoftware.com/api/v1/shows/857d1e6c948d4788961e4968cc7cc061';
export const SYSTEMONE_ARTIST_ID = 2105280;

export interface SystemOneShow {
  id: number;
  date: { value: string };
  performanceTime?: string | null;
  eventName?: string | null;
  status?: { id?: number; phase?: string | null } | null;
  production?: { id?: number; name?: string | null } | null;
  artist?: { id?: number; name?: string | null } | null;
  venue?: {
    name?: string | null;
    street?: string | null;
    city?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
  } | null;
  tickets?: { url?: string | null; onSaleDate?: string | null; soldOut?: boolean | null } | null;
}

export interface SystemOneResponse {
  data: SystemOneShow[];
  pagination?: { page: number; pageCount: number; total: number };
}

/** Welcher Terminliste der Seite eine Show zugeordnet wird. */
export type ListKey = 'tryout' | 'soFreunde' | 'other';

/** Show aus System One, umgewandelt in das TourDate-Format der Seite. */
export interface ApiTourDate extends TourDate {
  systemOneId: number;
  /** Programm-/Eventname aus System One (für die Listen-Zuordnung) */
  production: string;
  list: ListKey;
}

/** „20:00 Uhr" / „20:00 - 20:00" / „19:30" → „20:00"; unbrauchbar → 20:00 (wie bei allen Try-Out-Shows angenommen). */
export function parsePerformanceTime(raw: string | null | undefined): string {
  const m = /(\d{1,2})[:.](\d{2})/.exec(raw ?? '');
  if (!m) return '20:00';
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return '20:00';
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/**
 * Kalendertag aus System One + lokale Uhrzeit → ISO mit Berliner Offset,
 * z. B. ("2027-01-07T00:00:00Z", "20:00 Uhr") → "2027-01-07T20:00:00+01:00".
 * Der Offset wird für genau diesen Zeitpunkt berechnet (Sommer-/Winterzeit).
 * Auslandsshows (AT/CH) liegen in derselben Zeitzone.
 */
export function toBerlinIso(dayValue: string, performanceTime?: string | null): string {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(dayValue)?.[1];
  if (!day) throw new Error(`System One: unlesbares Datum "${dayValue}"`);
  const time = parsePerformanceTime(performanceTime);
  // Erst mit Winter-Offset raten, dann den echten Offset dieses Moments nehmen.
  // Um die Umstellung (nachts) kann das nicht kippen, Shows liegen abends.
  const guess = `${day}T${time}:00+01:00`;
  return `${day}T${time}:00${berlinOffset(guess)}`;
}

/** Zuordnung nach Programmname: Try Out → Liste „Termine", So Freunde → „So Freunde!", sonst eigene Liste. */
export function classify(name: string): ListKey {
  const n = name.toLowerCase();
  if (/try[\s-]*out/.test(n)) return 'tryout';
  if (/so[\s,]*freunde/.test(n)) return 'soFreunde';
  return 'other';
}

/** Präfixe wie „Solo:", „Preview:", „Abgesagt:" vom Eventnamen entfernen (für Überschriften). */
export function cleanEventName(name: string): string {
  return name
    .replace(/^\s*(solo|preview|premiere|derniere|abgesagt|zusatzshow|zusatztermin)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Rohe Show → TourDate. Gibt `null` zurück für Shows ohne Datum/Stadt oder anderer Künstler. */
export function mapShow(raw: SystemOneShow, artistId = SYSTEMONE_ARTIST_ID): ApiTourDate | null {
  if (raw.artist?.id !== undefined && raw.artist.id !== artistId) return null;
  const city = clean(raw.venue?.city);
  if (!raw.date?.value || !city) return null;
  const production = clean(raw.production?.name) || cleanEventName(clean(raw.eventName));
  const cancelled =
    raw.status?.phase === 'C' || /^\s*abgesagt\b/i.test(raw.eventName ?? '');
  const url = clean(raw.tickets?.url);
  const country = clean(raw.venue?.countryCode).toUpperCase();
  const show: ApiTourDate = {
    systemOneId: raw.id,
    production,
    list: classify(`${production} ${raw.eventName ?? ''}`),
    date: toBerlinIso(raw.date.value, raw.performanceTime),
    city,
    venue: clean(raw.venue?.name) || city,
  };
  if (clean(raw.venue?.street)) show.street = clean(raw.venue?.street);
  if (clean(raw.venue?.postalCode)) show.postalCode = clean(raw.venue?.postalCode);
  if (country && country !== 'DE') show.country = country;
  if (/^https?:\/\//i.test(url)) show.ticketUrl = url;
  if (raw.tickets?.soldOut) show.soldOut = true;
  if (cancelled) show.cancelled = true;
  return show;
}

/** Alle Shows einer API-Antwort umwandeln; doppelte IDs nur einmal. */
export function mapResponse(shows: SystemOneShow[], artistId = SYSTEMONE_ARTIST_ID): ApiTourDate[] {
  const seen = new Set<number>();
  const out: ApiTourDate[] = [];
  for (const raw of shows) {
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    const show = mapShow(raw, artistId);
    if (show) out.push(show);
  }
  return out;
}

/** Erstes Wort der Stadt, klein, ohne Umlaut-Varianten: „Halle (Saale)" ≙ „Halle", „Frankfurt am Main" ≙ „Frankfurt". */
function cityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .split(/[\s(/,-]+/)
    .filter(Boolean)[0] ?? '';
}

/** Gleiche Show = gleicher Kalendertag (laut Datumsstring, Berlin) + gleiche Stadt. */
export function sameShow(a: TourDate, b: TourDate): boolean {
  return a.date.slice(0, 10) === b.date.slice(0, 10) && cityKey(a.city) === cityKey(b.city);
}

/**
 * Handgepflegte Liste (tour.ts) mit System-One-Shows zusammenführen.
 * - Show in beiden: System One gewinnt bei Uhrzeit, Venue, Ticketlink,
 *   Ausverkauft/Abgesagt; Adressfelder aus tour.ts bleiben, wenn System One keine hat.
 *   Ein in tour.ts gesetztes soldOut bleibt bestehen (z. B. Shows, die Konrad
 *   bewusst als ausverkauft markiert hat), System One kann es nur ergänzen.
 * - Nur in System One: wird ergänzt.
 * - Nur in tour.ts: bleibt unverändert (bisherige Recherche, gespielte Shows).
 * Ergebnis chronologisch.
 */
export function mergeDates(local: TourDate[], api: TourDate[]): TourDate[] {
  const merged: TourDate[] = local.map((d) => ({ ...d }));
  for (const a of api) {
    const i = merged.findIndex((d) => sameShow(d, a));
    // Nur TourDate-Felder übernehmen (ohne systemOneId/production/list)
    const { systemOneId: _id, production: _p, list: _l, ...fields } = a as ApiTourDate;
    if (i === -1) {
      merged.push(fields);
      continue;
    }
    const old = merged[i];
    merged[i] = {
      ...old,
      ...fields,
      street: fields.street ?? old.street,
      postalCode: fields.postalCode ?? old.postalCode,
      ticketUrl: fields.ticketUrl ?? old.ticketUrl,
      soldOut: old.soldOut || fields.soldOut || undefined,
      cancelled: fields.cancelled || undefined,
    };
    for (const k of Object.keys(merged[i]) as Array<keyof TourDate>) {
      if (merged[i][k] === undefined) delete merged[i][k];
    }
  }
  return merged.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
}

export interface ExtraList {
  /** Programmname aus System One, dient als Überschrift-Zusatz */
  production: string;
  dates: TourDate[];
}

/** Shows, die keiner bestehenden Liste zugeordnet werden können, nach Programm gruppiert (Reihenfolge: früheste Show zuerst). */
export function groupOther(api: ApiTourDate[]): ExtraList[] {
  const groups = new Map<string, TourDate[]>();
  for (const a of api.filter((x) => x.list === 'other')) {
    const key = a.production || 'Neue Termine';
    const { systemOneId: _id, production: _p, list: _l, ...fields } = a;
    groups.set(key, [...(groups.get(key) ?? []), fields]);
  }
  return [...groups.entries()]
    .map(([production, dates]) => ({ production, dates: mergeDates([], dates) }))
    .sort((a, b) => new Date(a.dates[0].date).getTime() - new Date(b.dates[0].date).getTime());
}

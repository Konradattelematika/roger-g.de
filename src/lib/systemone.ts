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
export type ListKey = 'tryout' | 'soFreunde' | 'abgeblasen' | 'other';

/** Show aus System One, umgewandelt in das TourDate-Format der Seite. */
export interface ApiTourDate extends TourDate {
  systemOneId: number;
  /** Programm-/Eventname aus System One (für die Listen-Zuordnung) */
  production: string;
  list: ListKey;
  /** false = System One nennt keine lesbare Uhrzeit → die 20:00 in `date` ist nur ein Platzhalter */
  timeKnown: boolean;
  /** false = System One nennt keinen Venue-Namen → `venue` ist ersatzweise die Stadt */
  venueKnown: boolean;
  /** true = System One nennt den Ausverkauft-Status ausdrücklich (true ODER false) → er gilt vor tour.ts */
  soldOutKnown: boolean;
}

/** „20:00 Uhr" / „20:00 - 20:00" / „19:30" → „20:00"; `null`, wenn keine brauchbare Uhrzeit drinsteht. */
export function readPerformanceTime(raw: string | null | undefined): string | null {
  const m = /(\d{1,2})[:.](\d{2})/.exec(raw ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** Wie readPerformanceTime, aber mit dem Platzhalter 20:00 (wie bei allen Try-Out-Shows angenommen), wenn die Uhrzeit fehlt. */
export function parsePerformanceTime(raw: string | null | undefined): string {
  return readPerformanceTime(raw) ?? '20:00';
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

/**
 * Zuordnung nach Programmname (Reihenfolge zählt): Try Out → Liste „Termine",
 * So Freunde → „So Freunde!", Abgeblasen → eigener Abschnitt, sonst eigene Liste.
 */
export function classify(name: string): ListKey {
  const n = name.toLowerCase();
  if (/try[\s-]*out/.test(n)) return 'tryout';
  if (/so[\s,]*freunde/.test(n)) return 'soFreunde';
  if (/abgeblasen/.test(n)) return 'abgeblasen';
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
  const venueName = clean(raw.venue?.name);
  const show: ApiTourDate = {
    systemOneId: raw.id,
    production,
    list: classify(`${production} ${raw.eventName ?? ''}`),
    // Platzhalter (20:00 / Stadt als Venue) kenntlich machen: mergeDates lässt sie
    // keine recherchierten Werte aus tour.ts überschreiben.
    timeKnown: readPerformanceTime(raw.performanceTime) !== null,
    venueKnown: venueName !== '',
    soldOutKnown: typeof raw.tickets?.soldOut === 'boolean',
    date: toBerlinIso(raw.date.value, raw.performanceTime),
    city,
    venue: venueName || city,
  };
  if (clean(raw.venue?.street)) show.street = clean(raw.venue?.street);
  if (clean(raw.venue?.postalCode)) show.postalCode = clean(raw.venue?.postalCode);
  if (country && country !== 'DE') show.country = country;
  if (/^https?:\/\//i.test(url)) show.ticketUrl = url;
  if (raw.tickets?.soldOut) show.soldOut = true;
  if (cancelled) show.cancelled = true;
  return show;
}

/**
 * Alle Shows einer API-Antwort umwandeln; doppelte IDs nur einmal.
 * Ein einzelner unbrauchbarer Datensatz (unlesbares Datum „TBA", fehlende Stadt) wird mit einer
 * Warnung übersprungen, statt die ganze Antwort zu verwerfen. Jede Warnung = ein übersprungener
 * Datensatz (buildShows zählt mit; sind ALLE unbrauchbar, bricht loadShows ab).
 */
export function mapResponse(
  shows: SystemOneShow[],
  artistId = SYSTEMONE_ARTIST_ID,
  warn: (message: string) => void = console.warn
): ApiTourDate[] {
  const seen = new Set<number>();
  const out: ApiTourDate[] = [];
  for (const raw of shows) {
    try {
      if (typeof raw.id === 'number') {
        if (seen.has(raw.id)) continue;
        seen.add(raw.id);
      }
      const show = mapShow(raw, artistId);
      if (show) out.push(show);
      else if (raw.artist?.id === undefined || raw.artist.id === artistId) {
        warn(`[systemone] Show ${raw.id ?? '?'} übersprungen: Datum oder Stadt fehlt`);
      }
    } catch (err) {
      const id = (raw as SystemOneShow | null)?.id ?? '?';
      warn(`[systemone] Show ${id} übersprungen: ${(err as Error).message}`);
    }
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

/**
 * Kandidat für dieselbe Show: gleicher Kalendertag (laut Datumsstring, Berlin) + gleiche Stadt.
 * Das ist nötig, aber nicht hinreichend – ob wirklich zusammengeführt wird, entscheidet matchStrength.
 */
export function sameShow(a: TourDate, b: TourDate): boolean {
  return a.date.slice(0, 10) === b.date.slice(0, 10) && cityKey(a.city) === cityKey(b.city);
}

/** Klein, ohne Akzente/ß, nur Buchstaben und Ziffern – als Wortliste. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Venue-Name als Wortliste ohne die Wörter der Stadt: „Stadthalle Rostock" (Rostock) → [stadthalle]. */
function venueWords(d: TourDate): string[] {
  const city = new Set(words(d.city));
  const all = words(d.venue);
  const own = all.filter((w) => !city.has(w));
  return own.length > 0 ? own : all;
}

/**
 * Dieselbe Spielstätte: gleiche Wörter, oder ein Name ist der Anfang des anderen
 * („Indra" ≙ „Indra Musikclub", „FZW" ≙ „FZW / Freizeitzentrum West"). Bewusst streng:
 * „Saal A" und „Saal B" oder „Comedy Club X" und „Comedy Club Y" sind verschieden.
 */
export function sameVenue(a: TourDate, b: TourDate): boolean {
  const x = venueWords(a);
  const y = venueWords(b);
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length > 0 && short.every((w, i) => long[i] === w);
}

/** Interne Felder der API-Show entfernen → reines TourDate für die Seite. */
function toTourDate(a: TourDate): TourDate {
  const {
    systemOneId: _id,
    production: _p,
    list: _l,
    timeKnown,
    venueKnown: _v,
    soldOutKnown: _s,
    ...fields
  } = a as ApiTourDate;
  // Unbekannte Beginnzeit bleibt im Seitenmodell erkennbar (JSON-LD/datetime nennen dann nur das Datum).
  return timeKnown === false ? { ...fields, timeUnknown: true } : fields;
}

/** Uhrzeit „HH:MM" aus dem ISO-String (Ortszeit der Show). */
const timeOfDay = (d: TourDate) => d.date.slice(11, 16);
const minutesOfDay = (d: TourDate) => Number(d.date.slice(11, 13)) * 60 + Number(d.date.slice(14, 16));

/**
 * So weit dürfen die Beginnzeiten auseinanderliegen, damit es als Zeitkorrektur DERSELBEN Show
 * gilt. Liegt mehr dazwischen, ist es eine eigene Show (z. B. Nachmittags- und Abendshow).
 */
export const SAME_SHOW_MAX_MINUTES = 90;

/**
 * Wie sicher sind tour.ts-Eintrag `d` und System-One-Show `a` dieselbe Veranstaltung?
 * Voraussetzung ist immer gleicher Tag + gleiche Stadt (sameShow). Darüber hinaus:
 *   2 = gleiche Beginnzeit – niemand spielt zeitgleich zwei Shows, also dieselbe Show,
 *       auch wenn der Venue-Name abweicht (Verlegung, andere Schreibweise).
 *   1 = die Spielstätte passt (oder System One nennt keine) UND die Beginnzeit liegt höchstens
 *       SAME_SHOW_MAX_MINUTES daneben (oder System One nennt keine) – eine Zeitkorrektur.
 *   0 = nicht zusammenführen: andere Spielstätte mit anderer Uhrzeit, oder dieselbe Spielstätte
 *       mit großem Zeitabstand (Zusatzshow). Beide Termine bleiben stehen – ein sichtbarer
 *       Doppeleintrag ist harmloser als ein überschriebener Termin samt Ticketlink.
 */
function matchStrength(d: TourDate, a: TourDate): 0 | 1 | 2 {
  if (!sameShow(d, a)) return 0;
  const flags = a as Partial<ApiTourDate>;
  const timeKnown = flags.timeKnown !== false;
  const venueKnown = flags.venueKnown !== false;
  if (timeKnown && timeOfDay(d) === timeOfDay(a)) return 2;
  const venueFits = !venueKnown || sameVenue(d, a);
  const timeFits = !timeKnown || Math.abs(minutesOfDay(d) - minutesOfDay(a)) <= SAME_SHOW_MAX_MINUTES;
  return venueFits && timeFits ? 1 : 0;
}

/**
 * Handgepflegte Liste (tour.ts) mit System-One-Shows zusammenführen.
 * - Zusammengeführt wird nur bei eindeutiger Zuordnung (matchStrength): gleicher Tag + Stadt
 *   UND gleiche Beginnzeit, oder gleiche Spielstätte mit ähnlicher Beginnzeit. Sonst bleiben
 *   beide Termine stehen und der Build-Log nennt den möglichen Doppeleintrag (`warn`).
 * - Zusammengeführte Show: System One gewinnt bei Uhrzeit, Venue, Ticketlink,
 *   Ausverkauft/Abgesagt – aber nur mit ECHTEN Werten: nennt System One keine Uhrzeit bzw.
 *   keinen Venue-Namen, bleiben Uhrzeit bzw. Venue aus tour.ts stehen (die Platzhalter
 *   20:00 / Stadt überschreiben keine Recherche). Der Ticketlink aus tour.ts bleibt, wenn
 *   System One keinen hat; Straße/PLZ aus tour.ts nur, wenn es dieselbe Spielstätte ist
 *   (nach einer Verlegung gehörte die alte Adresse sonst zum neuen Venue).
 *   Ausverkauft: nennt System One den Status ausdrücklich, gilt er – auch „wieder Karten
 *   da"; nur ohne Angabe bleibt der Stand aus tour.ts.
 * - Jeder tour.ts-Eintrag wird höchstens EINER System-One-Show zugeordnet, und
 *   System-One-Shows werden nie untereinander zusammengelegt (sie haben eigene IDs):
 *   zwei Shows am selben Tag in derselben Stadt (Doppel-/Zusatzshow) bleiben zwei Karten.
 * - Nur in System One: wird ergänzt.
 * - Nur in tour.ts: bleibt unverändert (bisherige Recherche, gespielte Shows).
 * Ergebnis chronologisch.
 */
export function mergeDates(
  local: TourDate[],
  api: TourDate[],
  warn: (message: string) => void = () => {}
): TourDate[] {
  const merged: TourDate[] = local.map((d) => ({ ...d }));
  // Zuordnung API-Show → Index des tour.ts-Eintrags. Gesucht wird nur in `local`
  // (nie in frisch ergänzten API-Shows), jeder Index wird höchstens einmal vergeben.
  const partner = new Map<TourDate, number>();
  const taken = new Set<number>();
  // Erst die sicheren Paare (gleiche Beginnzeit), dann die plausiblen (Stufe 1) –
  // bei mehreren Kandidaten der mit dem kleinsten Zeitabstand.
  for (const wanted of [2, 1] as const) {
    for (const a of api) {
      if (partner.has(a)) continue;
      const timeKnown = (a as Partial<ApiTourDate>).timeKnown !== false;
      let best = -1;
      let bestGap = Infinity;
      local.forEach((d, i) => {
        if (taken.has(i) || matchStrength(d, a) < wanted) return;
        const gap = timeKnown ? Math.abs(minutesOfDay(d) - minutesOfDay(a)) : 0;
        if (gap < bestGap) {
          best = i;
          bestGap = gap;
        }
      });
      if (best === -1) continue;
      partner.set(a, best);
      taken.add(best);
    }
  }
  for (const a of api) {
    const fields = toTourDate(a);
    const i = partner.get(a);
    if (i === undefined) {
      merged.push(fields);
      // Gleicher Tag + Stadt wie ein nicht zugeordneter tour.ts-Eintrag, aber zu verschieden
      // zum Zusammenführen: beide Karten bleiben – im Build-Log darauf hinweisen.
      const near = local.findIndex((d, idx) => !taken.has(idx) && sameShow(d, a));
      if (near !== -1) {
        warn(
          `[systemone] ${a.date.slice(0, 10)} ${a.city}: „${a.venue}" ${timeOfDay(a)} (System One) und ` +
            `„${local[near].venue}" ${timeOfDay(local[near])} (tour.ts) nicht zusammengeführt – andere ` +
            `Spielstätte/Uhrzeit, beide Karten bleiben. Ist es dieselbe Show, den tour.ts-Eintrag entfernen.`
        );
      }
      continue;
    }
    const old = merged[i];
    const flags = a as Partial<ApiTourDate>;
    const keepTime = flags.timeKnown === false;
    const keepVenue = flags.venueKnown === false;
    const venueUnchanged = keepVenue || sameVenue(old, a);
    merged[i] = {
      ...old,
      ...fields,
      date: keepTime ? old.date : fields.date,
      timeUnknown: keepTime ? old.timeUnknown : undefined,
      venue: keepVenue ? old.venue : fields.venue,
      street: fields.street ?? (venueUnchanged ? old.street : undefined),
      postalCode: fields.postalCode ?? (venueUnchanged ? old.postalCode : undefined),
      ticketUrl: fields.ticketUrl ?? old.ticketUrl,
      soldOut: flags.soldOutKnown ? fields.soldOut : old.soldOut || fields.soldOut || undefined,
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
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.entries()]
    .map(([production, dates]) => ({ production, dates: mergeDates([], dates) }))
    .sort((a, b) => new Date(a.dates[0].date).getTime() - new Date(b.dates[0].date).getTime());
}

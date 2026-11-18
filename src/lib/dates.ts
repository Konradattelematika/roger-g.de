// Datums-Helfer für Termine und Hero. Alle Ausgaben werden ausdrücklich in
// Europe/Berlin berechnet – unabhängig von der Zeitzone des Build-Rechners
// (Coolify baut im Docker-Container in UTC, der Dev-Server auf dem VPS ebenso).
// Vorher formatierten Hero.astro und TourDates.astro mit `new Date(iso)` ohne
// timeZone; das ging nur gut, weil alle Shows abends stattfinden.
import type { TourDate } from '../data/tour';

export const BERLIN = 'Europe/Berlin';

/**
 * `new Date(iso)` mit Prüfung: ungültiges Datum oder Jahr außerhalb 2000–2099
 * (z. B. Tippfehler „0026-…") stoppt den Build, statt still Unsinn auszuliefern.
 */
export function parseIso(iso: string): Date {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  if (Number.isNaN(d.getTime()) || year < 2000 || year > 2099) {
    throw new Error(
      `Ungültiges Datum "${iso}" (erwartet ISO-8601 mit Offset, z. B. 2026-10-02T20:00:00+02:00, siehe src/data/tour.ts)`
    );
  }
  return d;
}

/** Kalendertag `YYYY-MM-DD` eines Zeitpunkts in Berlin (Datumsvergleiche als String). */
export function berlinDay(instant: Date | string, timeZone = BERLIN): string {
  const d = typeof instant === 'string' ? parseIso(instant) : instant;
  return d.toLocaleDateString('sv-SE', { timeZone });
}

/** UTC-Offset von Europe/Berlin zu einem Zeitpunkt: `+01:00` (Winter) oder `+02:00` (Sommer). */
export function berlinOffset(instant: Date | string, timeZone = BERLIN): string {
  const d = typeof instant === 'string' ? parseIso(instant) : instant;
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+01:00';
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '');
}

function dayTwoDigit(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone, day: '2-digit' }).format(d);
}

/** Monat kurz ohne Punkt, wie auf dem Plakat: „Sep", „Okt", „Mär" (CSS macht Versalien daraus). */
function monthShort(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone, month: 'short' }).format(d).replace('.', '');
}

/**
 * Terminkarte: `big` „11 Sep" (Bubble-Schrift), `meta` „Freitag 2026".
 * Wochentag und Jahr werden getrennt formatiert und dann zusammengesetzt –
 * `{ weekday, year }` in einem Intl-Aufruf liefert in de-DE „2026 Freitag".
 */
export function posterDate(iso: string, timeZone = BERLIN): { big: string; meta: string } {
  const d = parseIso(iso);
  const weekday = new Intl.DateTimeFormat('de-DE', { timeZone, weekday: 'long' }).format(d);
  const year = new Intl.DateTimeFormat('de-DE', { timeZone, year: 'numeric' }).format(d);
  return { big: `${dayTwoDigit(d, timeZone)} ${monthShort(d, timeZone)}`, meta: `${weekday} ${year}` };
}

/** Hero-Zeile „Nächste Show": „02. Okt · Leer". */
export function nextShowLabel(show: TourDate, timeZone = BERLIN): string {
  const d = parseIso(show.date);
  return `${dayTwoDigit(d, timeZone)}. ${monthShort(d, timeZone)} · ${show.city}`;
}

/**
 * Vorbei = der Berliner Kalendertag der Show liegt vor dem Berliner Kalendertag
 * von `now`. Am Showtag selbst gilt die Show bis Mitternacht als bevorstehend.
 * Wird zur BUILD-Zeit ausgewertet (statische Seite) – nach jeder Show also neu deployen.
 */
export function isPast(iso: string, now: Date = new Date(), timeZone = BERLIN): boolean {
  return berlinDay(iso, timeZone) < berlinDay(now, timeZone);
}

const byDate = (a: TourDate, b: TourDate) => parseIso(a.date).getTime() - parseIso(b.date).getTime();

/** Früheste noch nicht vergangene Show – unabhängig von der Reihenfolge in tour.ts. */
export function nextShow(dates: TourDate[], now: Date = new Date(), timeZone = BERLIN): TourDate | undefined {
  return dates.filter((d) => !isPast(d.date, now, timeZone)).sort(byDate)[0];
}

/**
 * Terminliste in zwei Gruppen, je chronologisch: `upcoming` (Ticket-Button oder
 * „Ausverkauft") kommt auf der Seite zuerst, `past` („Schon gespielt") darunter –
 * sonst müsste man mobil erst an allen gespielten Shows vorbeiscrollen.
 */
export function splitByPast(
  dates: TourDate[],
  now: Date = new Date(),
  timeZone = BERLIN
): { upcoming: TourDate[]; past: TourDate[] } {
  const sorted = [...dates].sort(byDate);
  return {
    upcoming: sorted.filter((d) => !isPast(d.date, now, timeZone)),
    past: sorted.filter((d) => isPast(d.date, now, timeZone)),
  };
}

/**
 * Maschinenlesbares Datum einer Show für JSON-LD (`startDate`) und `<time datetime>`:
 * mit Uhrzeit – außer die Beginnzeit ist unbekannt (`timeUnknown`), dann nur der Kalendertag.
 * Eine nicht bestätigte Uhrzeit wird so nirgends als Tatsache veröffentlicht.
 */
export function machineDate(show: Pick<TourDate, 'date' | 'timeUnknown'>): string {
  return show.timeUnknown ? show.date.slice(0, 10) : show.date;
}

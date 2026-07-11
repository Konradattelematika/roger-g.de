// Zentrale Datenquelle für alle Tourtermine.
// UI und Schema.org-Markup werden hieraus generiert – Termine NUR hier pflegen.
// Quelle: Übersichtsplakat "Try Out Tour 26" (design-reference/14.png).
// TODO: Uhrzeiten (aktuell Annahme 20:00) und echte Ticketlinks ergänzen!

export interface TourDate {
  /** ISO-Datum mit Uhrzeit, z. B. "2026-10-02T20:00:00+02:00" */
  date: string;
  city: string;
  venue: string;
  /** Straße + Hausnummer für Schema.org (optional, verbessert Rich Results) */
  street?: string;
  postalCode?: string;
  ticketUrl: string;
  soldOut?: boolean;
}

export const tourName = 'Roger G – Try Out Tour 26';

export const tourDescription =
  'Stand Up Comedy: Roger G testet sein neues Programm live auf kleinen ' +
  'Bühnen. Neues Material, ungefiltert – was floppt, habt nur ihr gesehen.';

export const tourDates: TourDate[] = [
  {
    date: '2026-09-11T20:00:00+02:00',
    city: 'Schleswig',
    venue: 'Krögers Heimat',
    ticketUrl: 'https://roger-g.de/#tickets', // TODO
  },
  {
    date: '2026-10-02T20:00:00+02:00',
    city: 'Leer',
    venue: 'Zollhaus',
    ticketUrl: 'https://roger-g.de/#tickets', // TODO
  },
  {
    date: '2026-10-03T20:00:00+02:00',
    city: 'Wermelskirchen',
    venue: 'Kattwinkelsche Fabrik',
    ticketUrl: 'https://roger-g.de/#tickets', // TODO
  },
  {
    date: '2026-10-04T20:00:00+02:00',
    city: 'Mülheim an der Ruhr',
    venue: 'Ringlokschuppen Ruhr',
    ticketUrl: 'https://roger-g.de/#tickets', // TODO
  },
  {
    date: '2026-10-08T20:00:00+02:00',
    city: 'Flensburg',
    venue: 'Kühlhaus',
    ticketUrl: 'https://roger-g.de/#tickets', // TODO
  },
  {
    date: '2026-10-10T20:00:00+02:00',
    city: 'Saarlouis',
    venue: 'Theater am Ring',
    ticketUrl: 'https://roger-g.de/#tickets', // TODO
  },
];

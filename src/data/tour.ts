// Zentrale Datenquelle für alle Tourtermine.
// UI und Schema.org-Markup werden hieraus generiert – Termine NUR hier pflegen.
//
// Quellen (recherchiert 2026-08-08):
//  - Try Out Tour: Eventim-Artist-Seite 4096399 + Reservix + Venue-VVK.
//    Nicht alle Shows laufen über Eventim (Leer/Mülheim = Reservix,
//    Wermelskirchen = bergisch-live, Saarlouis = Kulturamt der Stadt).
//  - So Freunde!: Eventim-Artist-Seite 3763357 + Ticketmaster (München,
//    Stuttgart, Berlin). Stand 2026-08-09 komplett ausverkauft.

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

// ── Try Out Tour 26 (Haupttour dieser Seite) ──────────────────────
export const tourName = 'Roger G – Try Out Tour 26';

export const tourDescription =
  'Stand Up Comedy: Roger G testet sein neues Programm live auf kleinen ' +
  'Bühnen. Neues Material, ungefiltert – was floppt, habt nur ihr gesehen.';

export const tourDates: TourDate[] = [
  {
    date: '2026-09-11T20:00:00+02:00',
    city: 'Schleswig',
    venue: 'Krögers Heimat',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-try-out-tour-kroegers-heimat-21149527/',
  },
  {
    date: '2026-10-02T20:00:00+02:00',
    city: 'Leer',
    venue: 'Zollhaus',
    ticketUrl:
      'https://www.reservix.de/tickets-roger-g-try-out-tour-2026-in-leer-zollhaus-am-2-10-2026/e2533094',
  },
  {
    date: '2026-10-03T20:00:00+02:00',
    city: 'Wermelskirchen',
    venue: 'Kattwinkelsche Fabrik',
    // Venue-VVK (bergisch-live) – nicht über Eventim/Reservix erhältlich.
    ticketUrl: 'https://www.bergisch-live.de/Ort/470',
  },
  {
    date: '2026-10-04T20:00:00+02:00',
    city: 'Mülheim an der Ruhr',
    venue: 'Ringlokschuppen Ruhr',
    ticketUrl:
      'https://www.reservix.de/tickets-roger-g-try-out-tour-in-muelheim-an-der-ruhr-ringlokschuppen-ruhr-buehne-1-am-4-10-2026/e2549957',
  },
  {
    date: '2026-10-08T20:00:00+02:00',
    city: 'Flensburg',
    venue: 'Kühlhaus',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-try-out-tour-kuehlhaus-21344792/',
  },
  {
    date: '2026-10-10T20:00:00+02:00',
    city: 'Saarlouis',
    venue: 'Theater am Ring',
    // Präsentiert vom Kulturamt der Kreisstadt Saarlouis – VVK über die Stadt.
    ticketUrl: 'https://www.saarlouis.de/rathaus/aktuelles/theater-am-ring/',
  },
];

// ── So Freunde! (aktuelle Tour, zusätzlich auf der Seite gezeigt) ──
// Alle Termine sind ausverkauft (Stand 2026-08-09) → soldOut überall.
// Warteliste läuft über das Klaviyo-Anmeldeformular (Signup-Sektion).
export const soFreundeName = 'Roger G – So Freunde!';

export const soFreundeDescription =
  'Die erste große Live-Show von Roger G: schräge Geschichten, wilde ' +
  'Zeichnungen und jede Menge Chaos – Stand Up zwischen Kluger-Quatsch und ' +
  'Grenzüberschreitung.';

export const soFreundeDates: TourDate[] = [
  {
    date: '2026-09-16T20:00:00+02:00',
    city: 'München',
    venue: 'Technikum',
    ticketUrl:
      'https://www.ticketmaster.de/event/roger-g-so-freunde-tickets/910749789',
    soldOut: true,
  },
  {
    date: '2026-09-17T20:15:00+02:00',
    city: 'Stuttgart',
    venue: 'Theaterhaus (Halle T2)',
    ticketUrl:
      'https://www.ticketmaster.de/event/roger-g-so-freunde-tickets/627091708',
    soldOut: true,
  },
  {
    date: '2026-09-19T19:30:00+02:00',
    city: 'Neuss',
    venue: 'Landesgartenschau-Gelände',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-so-freunde-landesgartenschau-gelaende-neuss-20443572/',
    soldOut: true,
  },
  {
    date: '2026-09-27T19:00:00+02:00',
    city: 'Erfurt',
    venue: 'DASDIE Brettl',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-so-freunde-dasdie-brettl-21317065/',
    soldOut: true,
  },
  {
    date: '2026-09-28T20:00:00+02:00',
    city: 'Jena',
    venue: 'F-Haus',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-so-freunde-f-haus-21311075/',
    soldOut: true,
  },
  {
    date: '2026-11-01T19:00:00+01:00',
    city: 'Köln',
    venue: 'GLORIA',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-so-freunde-gloria-21685381/',
    soldOut: true,
  },
  {
    date: '2026-11-02T20:00:00+01:00',
    city: 'Dortmund',
    venue: 'FZW / Freizeitzentrum West',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-so-freunde-fzw-freizeitzentrum-west-20705450/',
    soldOut: true,
  },
  {
    date: '2026-11-06T20:00:00+01:00',
    city: 'Berlin',
    venue: 'PUNCH L!NE Club',
    ticketUrl:
      'https://www.ticketmaster.de/event/roger-g-so-freunde-tickets/1977173460',
    soldOut: true,
  },
];

// Zentrale Datenquelle für alle Tourtermine.
// UI und Schema.org-Markup werden hieraus generiert – Termine NUR hier pflegen.
//
// Quellen (recherchiert 2026-08-08):
//  - Try Out Tour: Eventim-Artist-Seite 4096399 + Reservix + Venue-VVK.
//    Nicht alle Shows laufen über Eventim (Leer/Mülheim = Reservix,
//    Wermelskirchen = bergisch-live, Saarlouis = Kulturamt der Stadt).
//  - So Freunde!: Eventim-Artist-Seite 3763357 + Ticketmaster (München,
//    Stuttgart, Berlin). Stand 2026-08-09 komplett ausverkauft.
//    Frankfurt 05.11.2026 und die „Letzte Runde" März 2027 (Plakat-Upload
//    2026-11-05): Veranstalterseiten Konzertbüro Schoneberg + Venue-Websites,
//    Ticketlinks so übernommen, wie die Venues sie verlinken (ohne Tracking).
//  - Try Out 2027: Rogers Ticketing-Tracking-Tabelle (Upload 2026-10-19,
//    Datum/Location/Ort/Ausverkauft) + Ticketseiten der Veranstalter.
//    Die Try-Out-Shows 2026 sind seit 2026-10-19 auf Konrads Wunsch als
//    ausverkauft markiert (Anzeige „Ausverkauft · Vorbei").

export interface TourDate {
  /** ISO-Datum mit Uhrzeit, z. B. "2026-10-02T20:00:00+02:00" */
  date: string;
  city: string;
  venue: string;
  /** Straße + Hausnummer für Schema.org (optional, verbessert Rich Results) */
  street?: string;
  postalCode?: string;
  /** Fehlt, solange der VVK-Link noch nicht bekannt ist → Karte zeigt „Tickets bald" */
  ticketUrl?: string;
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
    soldOut: true,
  },
  {
    date: '2026-10-02T20:00:00+02:00',
    city: 'Leer',
    venue: 'Zollhaus',
    ticketUrl:
      'https://www.reservix.de/tickets-roger-g-try-out-tour-2026-in-leer-zollhaus-am-2-10-2026/e2533094',
    soldOut: true,
  },
  {
    date: '2026-10-03T20:00:00+02:00',
    city: 'Wermelskirchen',
    venue: 'Kattwinkelsche Fabrik',
    // Venue-VVK (bergisch-live) – nicht über Eventim/Reservix erhältlich.
    ticketUrl: 'https://www.bergisch-live.de/Ort/470',
    soldOut: true,
  },
  {
    date: '2026-10-04T20:00:00+02:00',
    city: 'Mülheim an der Ruhr',
    venue: 'Ringlokschuppen Ruhr',
    ticketUrl:
      'https://www.reservix.de/tickets-roger-g-try-out-tour-in-muelheim-an-der-ruhr-ringlokschuppen-ruhr-buehne-1-am-4-10-2026/e2549957',
    soldOut: true,
  },
  {
    date: '2026-10-08T20:00:00+02:00',
    city: 'Flensburg',
    venue: 'Kühlhaus',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-try-out-tour-kuehlhaus-21344792/',
    soldOut: true,
  },
  {
    date: '2026-10-10T20:00:00+02:00',
    city: 'Saarlouis',
    venue: 'Theater am Ring',
    // Präsentiert vom Kulturamt der Kreisstadt Saarlouis – VVK über die Stadt.
    ticketUrl: 'https://www.saarlouis.de/rathaus/aktuelles/theater-am-ring/',
    soldOut: true,
  },
  // ── Try Out 2027 ── Beginn 20:00 nur in Hamburg/Indra belegt (rausgegangen.de,
  // Eventim), sonst wie bei allen Try-Out-Shows angenommen.
  {
    date: '2027-01-07T20:00:00+01:00',
    city: 'Hamburg',
    // „Freche Möwe Presents" (Stand-up-Reihe im Indra), lt. Tabelle ausverkauft.
    venue: 'Indra Musikclub',
    street: 'Große Freiheit 64',
    postalCode: '22767',
    // Eventim-Tourseite (Event-ID unbekannt: eventim.de sperrt diesen Server mit 403)
    ticketUrl: 'https://www.eventim.de/artist/roger-g/roger-g-try-out-tour-4096399/',
    soldOut: true,
  },
  {
    date: '2027-01-08T20:00:00+01:00',
    city: 'Berlin',
    venue: 'Mad Monkey Room',
    street: 'Danziger Straße 1',
    postalCode: '10435',
    // TODO: Ticketlink fehlt (19.10.2026 nirgends öffentlich gelistet) → „Tickets bald"
  },
  {
    date: '2027-03-10T20:00:00+01:00',
    city: 'Hamburg',
    venue: 'Reeperbahn Comedy Club',
    // TODO: Ticketlink fehlt (VVK läuft lt. Tabelle, Link nicht auffindbar) → „Tickets bald".
    // Adresse offen: Club spielt umbaubedingt zeitweise im St. Pauli Comedy Club.
  },
];

// ── So Freunde! (aktuelle Tour, zusätzlich auf der Seite gezeigt) ──
// Termine 2026 sind alle ausverkauft. Im März 2027 folgt die „Letzte Runde"
// (laut Plakat die letzten Shows der Tour), Rostock davon schon ausverkauft.
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
    date: '2026-11-05T20:00:00+01:00',
    city: 'Frankfurt am Main',
    venue: 'myticket Jahrhunderthalle Club',
    street: 'Pfaffenwiese 301',
    postalCode: '65929',
    // Ausverkauft, Schoneberg verlinkt keinen VVK mehr.
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
  // ── Letzte Runde (März 2027) ──
  {
    // Venue-Seite nennt 19:30, Eventim/mvp.de 20:00 – Ticketanbieter maßgeblich.
    date: '2027-03-01T20:00:00+01:00',
    city: 'Halle (Saale)',
    venue: 'Steintor-Varieté',
    street: 'Am Steintor 10',
    postalCode: '06112',
    // Link wie bei mvp.de (Ticketpartner der Venue) verlinkt, ohne affiliate=MMQ
    ticketUrl: 'https://www.eventim.de/noapp/event/22196368/',
  },
  {
    date: '2027-03-02T20:00:00+01:00',
    city: 'Krefeld',
    venue: 'Seidenweberhaus',
    street: 'Theaterplatz 1',
    postalCode: '47798',
    ticketUrl:
      'https://www.eventim.de/noapp/event/roger-g-so-freunde-seidenweberhaus-krefeld-22155699/',
  },
  {
    date: '2027-03-04T20:00:00+01:00',
    city: 'Würzburg',
    venue: 'Posthalle',
    street: 'Bahnhofplatz 2',
    postalCode: '97070',
    ticketUrl:
      'https://www.eventim.de/event/roger-g-so-freunde-posthalle-22195331/',
  },
  {
    date: '2027-03-16T20:00:00+01:00',
    city: 'Flensburg',
    venue: 'Deutsches Haus',
    street: 'Berliner Platz 1',
    postalCode: '24937',
    ticketUrl: 'https://www.ticketmaster.de/event/886781464',
  },
  {
    // „Hochverlegt": ursprünglich 18.03.2027 im Moya, wegen der Nachfrage in
    // die Stadthalle verlegt, alte Tickets gelten weiter (Schoneberg).
    date: '2027-03-23T20:00:00+01:00',
    city: 'Rostock',
    venue: 'Stadthalle Rostock',
    street: 'Südring 90',
    postalCode: '18059',
    // Ausverkauft, Schoneberg verlinkt keinen VVK mehr.
    soldOut: true,
  },
];

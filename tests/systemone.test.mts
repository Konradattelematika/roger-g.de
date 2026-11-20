// Tests für die System-One-Anbindung (src/lib/systemone.ts + src/data/shows.ts).
// Ohne Netz: Rohdaten im Format der echten API (Schema beobachtet 17.11.2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classify,
  cleanEventName,
  groupOther,
  mapResponse,
  mapShow,
  mergeDates,
  parsePerformanceTime,
  readPerformanceTime,
  sameVenue,
  toBerlinIso,
} from '../src/lib/systemone.ts';
import type { SystemOneShow } from '../src/lib/systemone.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildShows, fetchSystemOne, loadShows, systemOneQuery } from '../src/data/shows.ts';
import { machineDate } from '../src/lib/dates.ts';
import { tourDates, soFreundeDates, abgeblasenDates } from '../src/data/tour.ts';
import type { TourDate } from '../src/data/tour.ts';

const ROGER = 2105280;

function raw(over: Partial<SystemOneShow> & { day: string; city: string }): SystemOneShow {
  const { day, city, ...rest } = over;
  return {
    id: Math.floor(Math.random() * 1e9),
    date: { value: `${day}T00:00:00Z` },
    performanceTime: '20:00 Uhr',
    eventName: 'Solo: Neues Programm',
    status: { id: 28079, phase: 'D' },
    production: { id: 1, name: 'Neues Programm' },
    artist: { id: ROGER, name: 'Roger G' },
    venue: { name: 'Halle X', street: 'Weg 1', city, postalCode: '12345', countryCode: 'DE' },
    tickets: { url: 'https://www.eventim.de/event/x/', onSaleDate: null, soldOut: false },
    ...rest,
  };
}

test('parsePerformanceTime: alle beobachteten Formate', () => {
  assert.equal(parsePerformanceTime('20:00 Uhr'), '20:00');
  assert.equal(parsePerformanceTime('19:33 Uhr'), '19:33');
  assert.equal(parsePerformanceTime('20:00 - 20:00'), '20:00');
  assert.equal(parsePerformanceTime('9:30'), '09:30');
  assert.equal(parsePerformanceTime(null), '20:00');
  assert.equal(parsePerformanceTime('tba'), '20:00');
  assert.equal(parsePerformanceTime('25:00'), '20:00');
});

test('toBerlinIso: Kalendertag bleibt, Offset folgt Sommer-/Winterzeit', () => {
  assert.equal(toBerlinIso('2027-01-07T00:00:00Z', '20:00 Uhr'), '2027-01-07T20:00:00+01:00');
  assert.equal(toBerlinIso('2027-07-07T00:00:00Z', '19:30'), '2027-07-07T19:30:00+02:00');
  // Umstellungstag 28.03.2027: abends schon Sommerzeit
  assert.equal(toBerlinIso('2027-03-28T00:00:00Z', '20:00'), '2027-03-28T20:00:00+02:00');
  assert.throws(() => toBerlinIso('kaputt', '20:00'));
});

test('classify + cleanEventName', () => {
  assert.equal(classify('Try Out Tour 2027'), 'tryout');
  assert.equal(classify('Tryout'), 'tryout');
  assert.equal(classify('So Freunde!'), 'soFreunde');
  assert.equal(classify('Neues Programm'), 'other');
  assert.equal(classify('Abgeblasen'), 'abgeblasen');
  assert.equal(classify('Roger G – ABGEBLASEN Tour 2027'), 'abgeblasen');
  assert.equal(classify('Abgeblasen (Try Out)'), 'tryout');
  assert.equal(classify('Solo: ABGEBLASEN'), 'abgeblasen'); // Titel in System One (Chris, 20.11.2026)
  assert.equal(cleanEventName('Solo: ABGEBLASEN'), 'ABGEBLASEN');
  assert.equal(cleanEventName('Solo:  WE ARE THE GERMANS'), 'WE ARE THE GERMANS');
  assert.equal(cleanEventName('Preview ALLES WIRD GUT!'), 'ALLES WIRD GUT!');
});

test('mapShow: Felder, Ausverkauft, Abgesagt, Ausland, fremde Künstler', () => {
  const m = mapShow(raw({ day: '2027-05-01', city: 'Wien', venue: { name: 'Stadtsaal', city: 'Wien', countryCode: 'AT' } }));
  assert.ok(m);
  assert.equal(m.date, '2027-05-01T20:00:00+02:00');
  assert.equal(m.venue, 'Stadtsaal');
  assert.equal(m.country, 'AT');
  assert.equal(m.ticketUrl, 'https://www.eventim.de/event/x/');
  assert.equal(m.soldOut, undefined);
  assert.equal(m.list, 'other');

  const sold = mapShow(raw({ day: '2027-05-02', city: 'Kiel', tickets: { url: null, soldOut: true } }));
  assert.equal(sold?.soldOut, true);
  assert.equal(sold?.ticketUrl, undefined);
  assert.equal(sold?.country, undefined, 'DE wird nicht gesetzt');

  const off = mapShow(raw({ day: '2027-05-03', city: 'Kiel', status: { phase: 'C' } }));
  assert.equal(off?.cancelled, true);
  const off2 = mapShow(raw({ day: '2027-05-03', city: 'Kiel', eventName: 'Abgesagt: Neues Programm' }));
  assert.equal(off2?.cancelled, true);

  assert.equal(mapShow(raw({ day: '2027-05-04', city: 'Kiel', artist: { id: 1709959 } })), null);
  assert.equal(mapShow(raw({ day: '2027-05-04', city: '' })), null);
  const noHttp = mapShow(raw({ day: '2027-05-04', city: 'Kiel', tickets: { url: 'eventim.de/x', soldOut: false } }));
  assert.equal(noHttp?.ticketUrl, undefined, 'nur absolute Links werden Buttons');
});

test('mapResponse: doppelte IDs nur einmal', () => {
  const a = raw({ day: '2027-05-01', city: 'Kiel' });
  assert.equal(mapResponse([a, a]).length, 1);
});

test('mergeDates: gleiche Show wird angereichert statt doppelt angezeigt', () => {
  const local: TourDate[] = [
    { date: '2027-03-01T20:00:00+01:00', city: 'Halle (Saale)', venue: 'Steintor-Varieté', street: 'Am Steintor 10', ticketUrl: 'https://alt/' },
    { date: '2027-03-23T20:00:00+01:00', city: 'Rostock', venue: 'Stadthalle Rostock', soldOut: true },
  ];
  const api = mapResponse([
    raw({ day: '2027-03-01', city: 'Halle', performanceTime: '19:30 Uhr', venue: { name: 'Steintor-Varieté', city: 'Halle' }, tickets: { url: 'https://neu/', soldOut: true } }),
    raw({ day: '2027-03-23', city: 'Rostock', tickets: { url: 'https://r/', soldOut: false } }),
    raw({ day: '2027-03-30', city: 'Kiel' }),
  ]);
  const merged = mergeDates(local, api);
  assert.equal(merged.length, 3);
  const halle = merged[0];
  assert.equal(halle.date, '2027-03-01T19:30:00+01:00', 'Uhrzeit aus System One');
  assert.equal(halle.ticketUrl, 'https://neu/');
  assert.equal(halle.soldOut, true);
  assert.equal(halle.street, 'Am Steintor 10', 'Straße aus tour.ts bleibt, wenn System One keine hat');
  assert.equal(merged[1].soldOut, undefined, 'System One nennt den Status ausdrücklich (nicht ausverkauft) → gilt');
  assert.equal(merged[1].ticketUrl, 'https://r/');
  assert.equal(merged[2].city, 'Kiel');
  for (const d of merged) {
    for (const internal of ['systemOneId', 'production', 'list', 'timeKnown', 'venueKnown', 'soldOutKnown']) {
      assert.ok(!(internal in d), `keine API-Interna im TourDate (${internal})`);
    }
    for (const v of Object.values(d)) assert.notEqual(v, undefined);
  }
});

test('groupOther: neue Programme als eigene Listen, chronologisch', () => {
  const api = mapResponse([
    raw({ day: '2027-06-02', city: 'Kiel', production: { name: 'B-Programm' } }),
    raw({ day: '2027-06-01', city: 'Bonn', production: { name: 'A-Programm' } }),
    raw({ day: '2027-06-05', city: 'Ulm', production: { name: 'A-Programm' } }),
    raw({ day: '2027-06-03', city: 'Jena', production: { name: 'Try Out Tour' } }),
  ]);
  const groups = groupOther(api);
  assert.deepEqual(groups.map((g) => g.production), ['A-Programm', 'B-Programm']);
  assert.deepEqual(groups[0].dates.map((d) => d.city), ['Bonn', 'Ulm']);
});

test('buildShows: ohne API-Daten = genau die tour.ts-Listen', () => {
  const s = buildShows([], 'snapshot');
  assert.deepEqual(s.tryout, tourDates);
  assert.deepEqual(s.soFreunde, soFreundeDates);
  assert.deepEqual(s.other, []);
});

test('buildShows: Try-Out-Show aus System One landet in der Try-Out-Liste', () => {
  const s = buildShows([raw({ day: '2027-04-01', city: 'Kiel', production: { name: 'Try Out Tour 27' } })], 'live');
  assert.equal(s.tryout.length, tourDates.length + 1);
  assert.equal(s.soFreunde.length, soFreundeDates.length);
});

test('fetchSystemOne: blättert alle Seiten, wirft bei HTTP-Fehler', async () => {
  const pages = [
    { data: [raw({ day: '2027-01-01', city: 'A' })], pagination: { page: 1, pageCount: 2, total: 2 } },
    { data: [raw({ day: '2027-01-02', city: 'B' })], pagination: { page: 2, pageCount: 2, total: 2 } },
  ];
  const urls: string[] = [];
  const fake = (async (url: string) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    return new Response(JSON.stringify(pages[page - 1]), { status: 200 });
  }) as unknown as typeof fetch;
  const all = await fetchSystemOne(fake);
  assert.equal(all.length, 2);
  assert.equal(urls.length, 2);
  assert.match(urls[0], /artistIds=2105280/);
  assert.match(urls[0], /cancelled=true/);

  const broken = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
  await assert.rejects(fetchSystemOne(broken), /HTTP 503/);
  assert.equal(new URL(systemOneQuery(3)).searchParams.get('page'), '3');
});

// ---------------------------------------------------------------- Doppelshows (Review 18.11.2026, Befund 1)
// Vorher suchte mergeDates in der ganzen Ergebnisliste und verglich nur Tag + Stadt:
// die zweite Show eines Tages überschrieb die erste und verschwand von der Seite.
const hamburg = (time: string, url: string, over: Partial<SystemOneShow> = {}) =>
  raw({
    day: '2027-04-10',
    city: 'Hamburg',
    performanceTime: time,
    venue: { name: 'Halle X', city: 'Hamburg' },
    tickets: { url, soldOut: false },
    ...over,
  });
const slots = (dates: TourDate[]) => dates.map((d) => `${d.date.slice(11, 16)} ${d.ticketUrl ?? '-'}`);

test('mergeDates: zwei Shows am selben Tag in derselben Stadt bleiben zwei Karten (ohne tour.ts-Eintrag)', () => {
  const api = mapResponse([hamburg('17:00 Uhr', 'https://a/'), hamburg('20:30 Uhr', 'https://b/')]);
  assert.deepEqual(slots(mergeDates([], api)), ['17:00 https://a/', '20:30 https://b/']);
  // groupOther (Sektion „Neue Termine") geht denselben Weg
  const [group] = groupOther(api);
  assert.deepEqual(slots(group.dates), ['17:00 https://a/', '20:30 https://b/']);
  // … und buildShows für eine bestehende Liste ebenfalls
  const tryout = buildShows(
    [
      hamburg('17:00 Uhr', 'https://a/', { production: { name: 'Try Out Tour' } }),
      hamburg('20:30 Uhr', 'https://b/', { production: { name: 'Try Out Tour' } }),
    ],
    'live'
  ).tryout;
  assert.equal(tryout.length, tourDates.length + 2);
});

test('mergeDates: Doppelshow + EIN tour.ts-Eintrag → der Eintrag geht an die Show mit derselben Uhrzeit', () => {
  const local: TourDate[] = [
    { date: '2027-04-10T20:30:00+02:00', city: 'Hamburg', venue: 'Halle X', street: 'Alter Weg 5' },
  ];
  // Die 17-Uhr-Show steht in der API zuerst – sie darf den Eintrag trotzdem nicht bekommen.
  const api = mapResponse([hamburg('17:00 Uhr', 'https://a/'), hamburg('20:30 Uhr', 'https://b/')]);
  const merged = mergeDates(local, api);
  assert.deepEqual(slots(merged), ['17:00 https://a/', '20:30 https://b/']);
  assert.equal(merged[0].street, undefined, 'Zusatzshow erbt nichts vom tour.ts-Eintrag');
  assert.equal(merged[1].street, 'Alter Weg 5');
});

test('mergeDates: Doppelshow ohne exakt passende Uhrzeit → Eintrag geht an die zeitlich nahe Show, keine dritte Karte', () => {
  const local: TourDate[] = [{ date: '2027-04-10T20:00:00+02:00', city: 'Hamburg', venue: 'Halle X', street: 'Alter Weg 5' }];
  // 16:00 liegt 4 h daneben (eigene Show), 19:00 nur 1 h (Zeitkorrektur derselben Show in derselben Halle)
  const api = mapResponse([hamburg('16:00 Uhr', 'https://a/'), hamburg('19:00 Uhr', 'https://b/')]);
  const merged = mergeDates(local, api);
  assert.deepEqual(slots(merged), ['16:00 https://a/', '19:00 https://b/']);
  assert.deepEqual(merged.map((d) => d.street), [undefined, 'Alter Weg 5'], 'der tour.ts-Eintrag landet nur auf EINER Show');
});

test('mergeDates: zwei tour.ts-Einträge am selben Tag + zwei API-Shows → paarweise nach Uhrzeit', () => {
  const local: TourDate[] = [
    { date: '2027-04-10T17:00:00+02:00', city: 'Hamburg', venue: 'Halle X', street: 'Früh 1' },
    { date: '2027-04-10T20:30:00+02:00', city: 'Hamburg', venue: 'Halle X', street: 'Spät 2', soldOut: true },
  ];
  const api = mapResponse([
    hamburg('20:30 Uhr', 'https://b/', { tickets: { url: 'https://b/' } }), // ohne Ausverkauft-Angabe
    hamburg('17:00 Uhr', 'https://a/'),
  ]);
  const merged = mergeDates(local, api);
  assert.deepEqual(slots(merged), ['17:00 https://a/', '20:30 https://b/']);
  assert.deepEqual(merged.map((d) => d.street), ['Früh 1', 'Spät 2']);
  assert.deepEqual(merged.map((d) => d.soldOut), [undefined, true]);
});

// ---------------------------------------------------------------- Platzhalter (Befund 3)
test('readPerformanceTime + mapShow: fehlende Uhrzeit / fehlender Venue-Name werden als Platzhalter markiert', () => {
  assert.equal(readPerformanceTime('19:30 Uhr'), '19:30');
  assert.equal(readPerformanceTime(null), null);
  assert.equal(readPerformanceTime('tba'), null);
  assert.equal(readPerformanceTime('25:00'), null);

  const full = mapShow(raw({ day: '2027-05-01', city: 'Kiel' }));
  assert.equal(full?.timeKnown, true);
  assert.equal(full?.venueKnown, true);

  const bare = mapShow(raw({ day: '2027-05-01', city: 'Kiel', performanceTime: null, venue: { name: null, city: 'Kiel' } }));
  assert.equal(bare?.timeKnown, false);
  assert.equal(bare?.venueKnown, false);
  assert.equal(bare?.date, '2027-05-01T20:00:00+02:00', 'Platzhalter 20:00 nur für Shows ohne tour.ts-Eintrag');
  assert.equal(bare?.venue, 'Kiel');
});

test('mergeDates: Platzhalter aus System One überschreiben keine Daten aus tour.ts', () => {
  const local: TourDate[] = [
    { date: '2027-03-01T19:30:00+01:00', city: 'Halle (Saale)', venue: 'Steintor-Varieté', ticketUrl: 'https://alt/' },
  ];
  const api = mapResponse([
    raw({ day: '2027-03-01', city: 'Halle', performanceTime: null, venue: { name: null, city: 'Halle' }, tickets: { url: 'https://neu/', soldOut: true } }),
  ]);
  const [halle, ...rest] = mergeDates(local, api);
  assert.equal(rest.length, 0);
  assert.equal(halle.date, '2027-03-01T19:30:00+01:00', 'Uhrzeit aus tour.ts bleibt');
  assert.equal(halle.venue, 'Steintor-Varieté', 'Venue aus tour.ts bleibt');
  assert.equal(halle.ticketUrl, 'https://neu/', 'echte Werte aus System One gewinnen weiterhin');
  assert.equal(halle.soldOut, true);

  // Nennt System One nur die Uhrzeit, gewinnt nur die Uhrzeit – der Venue bleibt.
  const onlyTime = mergeDates(local, mapResponse([
    raw({ day: '2027-03-01', city: 'Halle', performanceTime: '20:00 Uhr', venue: { name: '', city: 'Halle' } }),
  ]))[0];
  assert.equal(onlyTime.date, '2027-03-01T20:00:00+01:00');
  assert.equal(onlyTime.venue, 'Steintor-Varieté');
});

// ---------------------------------------------------------------- kaputte Datensätze (Befund 4)
test('mapResponse: ein kaputter Datensatz wird mit Warnung übersprungen, der Rest bleibt', () => {
  const warnings: string[] = [];
  const bad = raw({ day: '2027-05-02', city: 'Bonn', id: 4711 });
  bad.date = { value: 'TBA' };
  const shows = mapResponse(
    [raw({ day: '2027-05-01', city: 'Kiel' }), bad, null as unknown as SystemOneShow, raw({ day: '2027-05-03', city: 'Ulm' })],
    ROGER,
    (m) => warnings.push(m)
  );
  assert.deepEqual(shows.map((s) => s.city), ['Kiel', 'Ulm']);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /Show 4711 übersprungen: .*TBA/);
});

// ---------------------------------------------------------------- Laden (Review-Befunde: kein stiller Verlust)
const quiet = { retryDelayMs: 0, log: () => {}, warn: () => {} };
const answering = (shows: SystemOneShow[], pageCount = 1) =>
  (async () =>
    new Response(JSON.stringify({ data: shows, pagination: { page: 1, pageCount, total: shows.length } }))) as unknown as typeof fetch;
const failing = (calls: { n: number }) =>
  (async () => {
    calls.n++;
    throw new Error('getaddrinfo ENOTFOUND');
  }) as unknown as typeof fetch;
const kiel = () => raw({ day: '2027-05-01', city: 'Kiel' });
const unreadable = () => {
  const bad = kiel();
  bad.date = { value: 'TBA' };
  return bad;
};

test('loadShows: Abruf klappt → live', async () => {
  const s = await loadShows({ fetchImpl: answering([kiel()]), env: {}, ...quiet });
  assert.equal(s.source, 'live');
  assert.equal(s.apiCount, 1);
  assert.equal(s.skipped, 0);
});

test('loadShows: API-Ausfall → Build bricht ab – auch mit frischem Snapshot (kein automatischer Rückfall)', async () => {
  // Der Snapshot kann älter sein als der zuletzt veröffentlichte Stand: Montag Snapshot mit Show A,
  // Dienstag live A + B veröffentlicht, Mittwoch API-Ausfall → der Snapshot würde B wieder entfernen.
  const calls = { n: 0 };
  const fresh = { fetchedAt: new Date().toISOString(), data: [kiel()] };
  await assert.rejects(
    loadShows({ fetchImpl: failing(calls), env: {}, snapshot: fresh, ...quiet }),
    /System One nicht erreichbar \(getaddrinfo ENOTFOUND\)\. Build abgebrochen/
  );
  assert.equal(calls.n, 3, 'drei Versuche vor dem Abbruch');
});

test('loadShows: SYSTEMONE_OFFLINE=1 baut bewusst mit dem Snapshot – ohne Abruf', async () => {
  const calls = { n: 0 };
  const s = await loadShows({
    fetchImpl: failing(calls),
    env: { SYSTEMONE_OFFLINE: '1' },
    snapshot: { fetchedAt: '2026-01-01T00:00:00Z', data: [kiel()] },
    ...quiet,
  });
  assert.equal(s.source, 'snapshot');
  assert.equal(s.apiCount, 1);
  assert.equal(calls.n, 0);
});

test('loadShows: einzelner unlesbarer Datensatz wird übersprungen, der Rest bleibt live', async () => {
  const warnings: string[] = [];
  const s = await loadShows({ fetchImpl: answering([kiel(), unreadable()]), env: {}, ...quiet, warn: (m) => warnings.push(m) });
  assert.equal(s.source, 'live');
  assert.equal(s.apiCount, 1);
  assert.equal(s.skipped, 1);
  assert.match(warnings[0], /übersprungen/);
});

test('loadShows: Antwort ohne einen lesbaren Datensatz → Abbruch; ausdrücklich leere Antwort → live mit 0 Shows', async () => {
  await assert.rejects(
    loadShows({ fetchImpl: answering([unreadable()]), env: {}, ...quiet }),
    /lieferte 1 Datensatz\/Datensätze, aber keiner war lesbar/
  );
  const empty = await loadShows({ fetchImpl: answering([]), env: {}, ...quiet });
  assert.equal(empty.source, 'live');
  assert.equal(empty.apiCount, 0);
});

test('fetchSystemOne: mehr Seiten als das Limit → Fehler statt Teilliste', async () => {
  await assert.rejects(fetchSystemOne(answering([kiel()], 11)), /11 Seiten gemeldet/);
  assert.equal((await fetchSystemOne(answering([kiel()], 1))).length, 1);
});

test('mapResponse: Show ohne Stadt wird mit Warnung übersprungen, fremde Künstler still', () => {
  const warnings: string[] = [];
  const shows = mapResponse(
    [raw({ day: '2027-05-01', city: '', id: 12 }), raw({ day: '2027-05-02', city: 'Kiel', artist: { id: 1709959 } }), kiel()],
    ROGER,
    (m) => warnings.push(m)
  );
  assert.equal(shows.length, 1);
  assert.deepEqual(warnings, ['[systemone] Show 12 übersprungen: Datum oder Stadt fehlt']);
});

// ---------------------------------------------------------------- eindeutige Zuordnung (Review 18.11.2026, zweiter Prüfer)
// Vorher reichte „gleicher Tag + gleiche Stadt" zum Zusammenführen: eine eigenständige Show
// überschrieb dann einen tour.ts-Termin samt Ticketlink.
const card = (d: TourDate) => `${d.date.slice(11, 16)} ${d.venue} ${d.ticketUrl ?? '-'}`;
const saalA = (): TourDate[] => [
  { date: '2027-04-10T20:00:00+02:00', city: 'Hamburg', venue: 'Saal A', street: 'A-Straße 1', postalCode: '20095', ticketUrl: 'https://saal-a/' },
];

test('mergeDates: andere Spielstätte + andere Uhrzeit → beide Termine bleiben, tour.ts-Eintrag unverändert, Hinweis im Log', () => {
  const api = mapResponse([hamburg('20:30 Uhr', 'https://saal-b/', { venue: { name: 'Saal B', city: 'Hamburg' } })]);
  const hints: string[] = [];
  const local = saalA();
  const merged = mergeDates(local, api, (m) => hints.push(m));
  assert.deepEqual(merged.map(card), ['20:00 Saal A https://saal-a/', '20:30 Saal B https://saal-b/']);
  assert.deepEqual(merged[0], local[0], 'der tour.ts-Termin bleibt Feld für Feld erhalten');
  assert.equal(hints.length, 1);
  assert.match(hints[0], /2027-04-10 Hamburg: „Saal B" 20:30 \(System One\) und „Saal A" 20:00 \(tour\.ts\) nicht zusammengeführt/);
});

test('mergeDates: gleiche Beginnzeit, anderer Venue-Name (Verlegung) → EINE Karte, alte Adresse wird nicht übernommen', () => {
  const moved = mergeDates(saalA(), mapResponse([hamburg('20:00 Uhr', 'https://neu/', { venue: { name: 'Große Freiheit 36', city: 'Hamburg' } })]));
  assert.deepEqual(moved.map(card), ['20:00 Große Freiheit 36 https://neu/']);
  assert.equal(moved[0].street, undefined, 'Straße von Saal A gehört nicht zur neuen Spielstätte');
  assert.equal(moved[0].postalCode, undefined);

  const withAddress = mergeDates(saalA(), mapResponse([
    hamburg('20:00 Uhr', 'https://neu/', { venue: { name: 'Große Freiheit 36', street: 'Große Freiheit 36', postalCode: '22767', city: 'Hamburg' } }),
  ]));
  assert.equal(withAddress[0].street, 'Große Freiheit 36');
  assert.equal(withAddress[0].postalCode, '22767');
});

test('mergeDates: gleiche Spielstätte – kleine Zeitabweichung ist eine Korrektur, großer Abstand eine eigene Show', () => {
  const local = (): TourDate[] => [{ date: '2027-04-10T20:00:00+02:00', city: 'Hamburg', venue: 'Indra Musikclub', street: 'Große Freiheit 64' }];
  const indra = (time: string) => hamburg(time, 'https://indra/', { venue: { name: 'Indra', city: 'Hamburg' } });

  const corrected = mergeDates(local(), mapResponse([indra('19:30 Uhr')]));
  assert.deepEqual(corrected.map(card), ['19:30 Indra https://indra/']);
  assert.equal(corrected[0].street, 'Große Freiheit 64', 'dieselbe Spielstätte → Adresse aus tour.ts bleibt');

  const hints: string[] = [];
  const extra = mergeDates(local(), mapResponse([indra('16:00 Uhr')]), (m) => hints.push(m));
  assert.deepEqual(extra.map(card), ['16:00 Indra https://indra/', '20:00 Indra Musikclub -']);
  assert.equal(hints.length, 1);
});

test('mergeDates: System One ohne Uhrzeit, aber mit anderer Spielstätte → beide bleiben', () => {
  const api = mapResponse([raw({ day: '2027-04-10', city: 'Hamburg', performanceTime: null, venue: { name: 'Saal B', city: 'Hamburg' }, tickets: { url: 'https://saal-b/', soldOut: false } })]);
  const merged = mergeDates(saalA(), api);
  assert.deepEqual(merged.map((d) => d.venue).sort(), ['Saal A', 'Saal B']);
});

test('sameVenue: gleiche Wörter oder Namensanfang, Stadtname zählt nicht mit', () => {
  const v = (venue: string, city = 'Hamburg'): TourDate => ({ date: '2027-04-10T20:00:00+02:00', city, venue });
  assert.ok(sameVenue(v('Indra Musikclub'), v('Indra')));
  assert.ok(sameVenue(v('FZW / Freizeitzentrum West', 'Dortmund'), v('FZW', 'Dortmund')));
  assert.ok(sameVenue(v('Stadthalle Rostock', 'Rostock'), v('Stadthalle', 'Rostock')));
  assert.ok(sameVenue(v('Steintor-Varieté', 'Halle (Saale)'), v('Steintor Variete', 'Halle')));
  assert.ok(!sameVenue(v('Saal A'), v('Saal B')));
  assert.ok(!sameVenue(v('Reeperbahn Comedy Club'), v('St. Pauli Comedy Club')));
  assert.ok(!sameVenue(v('Comedy Club X'), v('Comedy Club Y')));
});

// ---------------------------------------------------------------- Ausverkauft-Status (maßgeblich: System One)
test('mergeDates: ausdrücklicher Ausverkauft-Status aus System One gilt, ohne Angabe bleibt tour.ts', () => {
  const local = (): TourDate[] => [{ date: '2027-04-10T20:00:00+02:00', city: 'Hamburg', venue: 'Halle X', soldOut: true }];
  const merged = (tickets: SystemOneShow['tickets']) => mergeDates(local(), mapResponse([hamburg('20:00 Uhr', 'https://x/', { tickets })]))[0];

  const released = merged({ url: 'https://karten/', soldOut: false });
  assert.equal(released.soldOut, undefined, 'wieder Karten da → kein „Ausverkauft" mehr');
  assert.equal(released.ticketUrl, 'https://karten/');
  assert.equal(merged({ url: 'https://karten/' }).soldOut, true, 'keine Angabe → Stand aus tour.ts bleibt');
  assert.equal(merged(null).soldOut, true);
  assert.equal(merged({ url: null, soldOut: true }).soldOut, true);

  const fresh = mergeDates(
    [{ date: '2027-04-10T20:00:00+02:00', city: 'Hamburg', venue: 'Halle X' }],
    mapResponse([hamburg('20:00 Uhr', 'https://x/', { tickets: { url: 'https://x/', soldOut: true } })])
  )[0];
  assert.equal(fresh.soldOut, true);
});

// ---------------------------------------------------------------- unbekannte Beginnzeit
test('Beginnzeit unbekannt: timeUnknown im Seitenmodell, machineDate nennt dann nur das Datum', () => {
  const noTime = raw({ day: '2027-05-01', city: 'Kiel', performanceTime: null });
  const [alone] = mergeDates([], mapResponse([noTime]));
  assert.equal(alone.timeUnknown, true);
  assert.equal(alone.date, '2027-05-01T20:00:00+02:00', 'intern bleibt der Platzhalter (Sortierung, Vorbei-Logik)');
  assert.equal(machineDate(alone), '2027-05-01');

  const [timed] = mergeDates([], mapResponse([kiel()]));
  assert.equal(timed.timeUnknown, undefined);
  assert.equal(machineDate(timed), '2027-05-01T20:00:00+02:00');

  // Mit tour.ts-Eintrag: dessen Uhrzeit bleibt und gilt als bekannt
  const [known] = mergeDates(
    [{ date: '2027-05-01T19:30:00+02:00', city: 'Kiel', venue: 'Halle X' }],
    mapResponse([noTime])
  );
  assert.equal(known.timeUnknown, undefined);
  assert.equal(machineDate(known), '2027-05-01T19:30:00+02:00');
});

test('buildShows: Abgeblasen-Show landet im eigenen Abschnitt, other bleibt leer', () => {
  const s = buildShows([raw({ day: '2027-09-10', city: 'Kiel', production: { name: 'Abgeblasen' } })], 'live');
  assert.equal(s.abgeblasen.length, abgeblasenDates.length + 1);
  assert.equal(s.tryout.length, tourDates.length);
  assert.deepEqual(s.other, []);
});

test('buildShows: ohne API-Daten = abgeblasenDates aus tour.ts', () => {
  assert.deepEqual(buildShows([], 'snapshot').abgeblasen, abgeblasenDates);
});

test('Fixture tests/fixtures/systemone-demo.json: Zuordnung aller Listen', () => {
  const { data } = JSON.parse(readFileSync(new URL('./fixtures/systemone-demo.json', import.meta.url), 'utf8'));
  const s = buildShows(data, 'fixture');
  assert.equal(s.source, 'fixture');
  assert.equal(s.abgeblasen.length, 6);
  assert.equal(s.abgeblasen.filter((d) => d.cancelled).length, 1);
  assert.equal(s.abgeblasen.filter((d) => d.soldOut).length, 1);
  assert.equal(s.abgeblasen.filter((d) => !d.ticketUrl).length, 1);
  assert.equal(s.abgeblasen.filter((d) => d.country === 'AT').length, 1);
  assert.equal(s.abgeblasen.filter((d) => d.timeUnknown).length, 1, 'eine Demo-Show ohne Beginnzeit');
  // Berlin 08.01.2027 wird mit dem tour.ts-Eintrag zusammengeführt (jetzt mit ticketUrl)
  assert.equal(s.tryout.length, tourDates.length);
  assert.ok(s.tryout.find((d) => d.date.startsWith('2027-01-08'))?.ticketUrl);
  assert.equal(s.other.length, 1);
});

test('buildShows: Abgeblasen-Doppelshow (Zusatzshow am selben Tag) bleibt zwei Karten', () => {
  const s = buildShows(
    [
      hamburg('17:00 Uhr', 'https://a/', { production: { name: 'Abgeblasen' } }),
      hamburg('20:30 Uhr', 'https://b/', { production: { name: 'Abgeblasen' } }),
    ],
    'live'
  );
  assert.deepEqual(slots(s.abgeblasen), ['17:00 https://a/', '20:30 https://b/']);
});

test('loadShows: SYSTEMONE_FIXTURE liest die Testdaten-Datei – ohne Abruf, mit Warnung', async () => {
  const calls = { n: 0 };
  const warnings: string[] = [];
  const s = await loadShows({
    fetchImpl: failing(calls),
    env: { SYSTEMONE_FIXTURE: fileURLToPath(new URL('./fixtures/systemone-demo.json', import.meta.url)) },
    ...quiet,
    warn: (m) => warnings.push(m),
  });
  assert.equal(s.source, 'fixture');
  assert.equal(s.abgeblasen.length, 6);
  assert.equal(calls.n, 0);
  assert.match(warnings[0], /FIXTURE/);
});

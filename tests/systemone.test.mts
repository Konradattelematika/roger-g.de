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
  toBerlinIso,
} from '../src/lib/systemone.ts';
import type { SystemOneShow } from '../src/lib/systemone.ts';
import {
  SNAPSHOT_MAX_AGE_DAYS,
  buildShows,
  fetchSystemOne,
  loadShows,
  snapshotAgeDays,
  systemOneQuery,
} from '../src/data/shows.ts';
import { tourDates, soFreundeDates } from '../src/data/tour.ts';
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
  assert.equal(merged[1].soldOut, true, 'soldOut aus tour.ts bleibt bestehen');
  assert.equal(merged[2].city, 'Kiel');
  for (const d of merged) {
    for (const internal of ['systemOneId', 'production', 'list', 'timeKnown', 'venueKnown']) {
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

test('mergeDates: Doppelshow ohne passende Uhrzeit → ein Eintrag wird genau einmal zugeordnet, keine dritte Karte', () => {
  const local: TourDate[] = [{ date: '2027-04-10T20:00:00+02:00', city: 'Hamburg', venue: 'Halle X', soldOut: true }];
  const api = mapResponse([hamburg('16:00 Uhr', 'https://a/'), hamburg('19:00 Uhr', 'https://b/')]);
  const merged = mergeDates(local, api);
  assert.deepEqual(slots(merged), ['16:00 https://a/', '19:00 https://b/']);
  assert.deepEqual(merged.map((d) => d.soldOut), [true, undefined], 'soldOut aus tour.ts landet nur auf EINER Show');
});

test('mergeDates: zwei tour.ts-Einträge am selben Tag + zwei API-Shows → paarweise nach Uhrzeit', () => {
  const local: TourDate[] = [
    { date: '2027-04-10T17:00:00+02:00', city: 'Hamburg', venue: 'Halle X', street: 'Früh 1' },
    { date: '2027-04-10T20:30:00+02:00', city: 'Hamburg', venue: 'Halle X', street: 'Spät 2', soldOut: true },
  ];
  const api = mapResponse([hamburg('20:30 Uhr', 'https://b/'), hamburg('17:00 Uhr', 'https://a/')]);
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

// ---------------------------------------------------------------- Laden + Rückfall (Befund 2)
const quiet = { retryDelayMs: 0, log: () => {}, warn: () => {} };
const answering = (shows: SystemOneShow[]) =>
  (async () =>
    new Response(JSON.stringify({ data: shows, pagination: { page: 1, pageCount: 1, total: shows.length } }))) as unknown as typeof fetch;
const failing = (calls: { n: number }) =>
  (async () => {
    calls.n++;
    throw new Error('getaddrinfo ENOTFOUND');
  }) as unknown as typeof fetch;
const NOW = new Date('2026-11-27T10:00:00Z');
const kiel = () => raw({ day: '2027-05-01', city: 'Kiel' });

test('loadShows: Abruf klappt → live', async () => {
  const s = await loadShows({ fetchImpl: answering([kiel()]), env: {}, ...quiet });
  assert.equal(s.source, 'live');
  assert.equal(s.apiCount, 1);
});

test('loadShows: API-Ausfall + leerer oder alter Snapshot → Build bricht ab (kein stiller Verlust der Termine)', async () => {
  const calls = { n: 0 };
  await assert.rejects(
    loadShows({ fetchImpl: failing(calls), env: {}, now: NOW, snapshot: { fetchedAt: '2026-11-27T09:00:00Z', data: [] }, ...quiet }),
    /System One nicht erreichbar \(getaddrinfo ENOTFOUND\).*Build abgebrochen/s
  );
  assert.equal(calls.n, 3, 'drei Versuche vor dem Abbruch');
  await assert.rejects(
    loadShows({ fetchImpl: failing({ n: 0 }), env: {}, now: NOW, snapshot: { fetchedAt: '2026-11-17T09:39:45Z', data: [kiel()] }, ...quiet }),
    /kein brauchbarer Snapshot/
  );
  await assert.rejects(
    loadShows({ fetchImpl: failing({ n: 0 }), env: {}, now: NOW, snapshot: { data: [kiel()] }, ...quiet }),
    /kein brauchbarer Snapshot/,
    'Snapshot ohne fetchedAt gilt als zu alt'
  );
});

test('loadShows: API-Ausfall + frischer Snapshot mit Terminen → Snapshot', async () => {
  const s = await loadShows({
    fetchImpl: failing({ n: 0 }),
    env: {},
    now: NOW,
    snapshot: { fetchedAt: '2026-11-26T08:00:00Z', data: [kiel()] },
    ...quiet,
  });
  assert.equal(s.source, 'snapshot');
  assert.equal(s.apiCount, 1);
});

test('loadShows: SYSTEMONE_OFFLINE=1 baut bewusst mit dem Snapshot – ohne Abruf, auch wenn er alt ist', async () => {
  const calls = { n: 0 };
  const s = await loadShows({
    fetchImpl: failing(calls),
    env: { SYSTEMONE_OFFLINE: '1' },
    now: NOW,
    snapshot: { fetchedAt: '2026-01-01T00:00:00Z', data: [kiel()] },
    ...quiet,
  });
  assert.equal(s.source, 'snapshot');
  assert.equal(calls.n, 0);
});

test('loadShows: kaputter Datensatz in der Live-Antwort verwirft nicht die ganze Antwort', async () => {
  const warnings: string[] = [];
  const bad = kiel();
  bad.date = { value: 'TBA' };
  const s = await loadShows({ fetchImpl: answering([kiel(), bad]), env: {}, ...quiet, warn: (m) => warnings.push(m) });
  assert.equal(s.source, 'live', 'kein Rückfall auf den Snapshot wegen eines einzelnen Datensatzes');
  assert.equal(s.apiCount, 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /übersprungen/);
});

test('snapshotAgeDays: Alter in Tagen, ohne fetchedAt unendlich', () => {
  assert.equal(snapshotAgeDays({ fetchedAt: '2026-11-26T10:00:00Z' }, NOW), 1);
  assert.equal(snapshotAgeDays({}, NOW), Infinity);
  assert.ok(SNAPSHOT_MAX_AGE_DAYS >= 1);
});

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
  toBerlinIso,
} from '../src/lib/systemone.ts';
import type { SystemOneShow } from '../src/lib/systemone.ts';
import { buildShows, fetchSystemOne, systemOneQuery } from '../src/data/shows.ts';
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
    assert.ok(!('systemOneId' in d) && !('list' in d), 'keine API-Interna im TourDate');
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

// Tests für src/lib/dates.ts: Terminkarten-Datum, „Nächste Show", Vorbei-Logik – alles in Europe/Berlin.
// Läuft ohne Netz und ohne zusätzliche Abhängigkeiten:
//   npm test   (= node --experimental-strip-types --test tests/*.test.mts, Node ≥ 22.12)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  berlinDay,
  berlinOffset,
  isPast,
  nextShow,
  nextShowLabel,
  parseIso,
  posterDate,
} from '../src/lib/dates.ts';
import type { TourDate } from '../src/data/tour.ts';

const show = (date: string, city = 'Teststadt'): TourDate => ({
  date,
  city,
  venue: 'Halle',
  ticketUrl: 'https://example.test/',
});

// ---------------------------------------------------------------- posterDate
test('posterDate: Tag + Monat kurz ohne Punkt, Wochentag vor dem Jahr', () => {
  assert.deepEqual(posterDate('2026-10-02T20:00:00+02:00'), { big: '02 Okt', meta: 'Freitag 2026' });
  assert.deepEqual(posterDate('2026-11-01T19:00:00+01:00'), { big: '01 Nov', meta: 'Sonntag 2026' });
  assert.deepEqual(posterDate('2026-03-05T20:00:00+01:00'), { big: '05 Mär', meta: 'Donnerstag 2026' });
  // Abkürzung für September schwankt zwischen ICU-Versionen („Sep." / „Sept.") – der Punkt ist immer weg
  const sep = posterDate('2026-09-11T20:00:00+02:00');
  assert.match(sep.big, /^11 Sept?$/);
  assert.equal(sep.meta, 'Freitag 2026'); // vorher live: „2026 Freitag"
});

test('posterDate: rechnet in Europe/Berlin, nicht in der Zeitzone des Build-Rechners', () => {
  // 00:30 Berliner Sommerzeit = 22:30 UTC des Vortags
  const iso = '2026-10-02T00:30:00+02:00';
  assert.equal(posterDate(iso).big, '02 Okt');
  assert.equal(posterDate(iso, 'UTC').big, '01 Okt');
  const prev = process.env.TZ;
  try {
    for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = tz;
      assert.deepEqual(posterDate(iso), { big: '02 Okt', meta: 'Freitag 2026' }, `TZ=${tz}`);
    }
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
});

test('parseIso/posterDate: ungültiges Datum oder Jahr außerhalb 2000–2099 stoppt den Build', () => {
  for (const bad of [
    '2026-13-45T20:00:00+02:00',
    'morgen',
    '',
    '0026-10-02T20:00:00+02:00',
    '2126-10-02T20:00:00+02:00',
  ]) {
    assert.throws(() => posterDate(bad), /Ungültiges Datum/, `posterDate(${JSON.stringify(bad)})`);
    assert.throws(() => parseIso(bad), /src\/data\/tour\.ts/, `parseIso(${JSON.stringify(bad)})`);
  }
  assert.equal(parseIso('2026-10-02T20:00:00+02:00').toISOString(), '2026-10-02T18:00:00.000Z');
});

// ---------------------------------------------------------------- nextShowLabel
test('nextShowLabel: „02. Okt · Leer"', () => {
  assert.equal(nextShowLabel(show('2026-10-02T20:00:00+02:00', 'Leer')), '02. Okt · Leer');
  assert.equal(nextShowLabel(show('2026-11-06T20:00:00+01:00', 'Berlin')), '06. Nov · Berlin');
});

// ---------------------------------------------------------------- berlinDay / berlinOffset
test('berlinDay: Kalendertag in Berlin, Sommer- und Winterzeit', () => {
  assert.equal(berlinDay('2026-10-01T22:30:00Z'), '2026-10-02'); // Sommerzeit: +2 h
  assert.equal(berlinDay('2026-11-06T23:30:00Z'), '2026-11-07'); // Winterzeit: +1 h
  assert.equal(berlinDay(new Date('2026-09-27T12:00:00Z')), '2026-09-27');
  assert.equal(berlinDay('2026-10-01T22:30:00Z', 'UTC'), '2026-10-01');
});

test('berlinOffset: +02:00 im Sommer, +01:00 im Winter, Umstellung 25.10.2026 01:00 UTC', () => {
  assert.equal(berlinOffset('2026-10-10T18:00:00Z'), '+02:00');
  assert.equal(berlinOffset('2026-11-01T18:00:00Z'), '+01:00');
  assert.equal(berlinOffset('2026-10-25T00:59:00Z'), '+02:00'); // 02:59 MESZ
  assert.equal(berlinOffset('2026-10-25T01:00:00Z'), '+01:00'); // 02:00 MEZ
  assert.equal(berlinOffset(new Date('2026-03-29T01:00:00Z')), '+02:00'); // Beginn Sommerzeit 2026
  assert.equal(berlinOffset('2026-03-29T00:59:00Z'), '+01:00');
});

// ---------------------------------------------------------------- isPast / nextShow
test('isPast: Show gilt am Showtag (Berlin) bis Mitternacht als bevorstehend', () => {
  const erfurt = '2026-09-27T19:00:00+02:00';
  assert.equal(isPast(erfurt, new Date('2026-09-26T12:00:00Z')), false);
  assert.equal(isPast(erfurt, new Date('2026-09-27T21:30:00Z')), false); // 23:30 Berlin, Showtag
  assert.equal(isPast(erfurt, new Date('2026-09-27T22:30:00Z')), true); // 00:30 Berlin am 28.09.
  const berlin = '2026-11-06T20:00:00+01:00';
  assert.equal(isPast(berlin, new Date('2026-11-06T22:59:00Z')), false); // 23:59 MEZ
  assert.equal(isPast(berlin, new Date('2026-11-06T23:00:00Z')), true); // 00:00 MEZ am 07.11.
});

test('nextShow: früheste nicht vergangene Show, unabhängig von der Reihenfolge; ohne Kandidat undefined', () => {
  const dates = [
    show('2026-10-08T20:00:00+02:00', 'Flensburg'),
    show('2026-09-11T20:00:00+02:00', 'Schleswig'),
    show('2026-10-02T20:00:00+02:00', 'Leer'),
  ];
  assert.equal(nextShow(dates, new Date('2026-09-27T04:00:00Z'))?.city, 'Leer');
  assert.equal(nextShow(dates, new Date('2026-09-01T04:00:00Z'))?.city, 'Schleswig');
  assert.equal(nextShow(dates, new Date('2026-10-08T21:00:00Z'))?.city, 'Flensburg'); // 23:00 Berlin am Showtag
  assert.equal(nextShow(dates, new Date('2026-10-09T04:00:00Z')), undefined);
  assert.equal(nextShow([], new Date()), undefined);
  assert.deepEqual(
    dates.map((d) => d.city),
    ['Flensburg', 'Schleswig', 'Leer'],
    'Eingabe bleibt unsortiert'
  );
});

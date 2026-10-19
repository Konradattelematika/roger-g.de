// Tests für src/data/tour.ts: Datenprüfung der Tourtermine – Form, Datumsformat,
// Offset zu Europe/Berlin, Chronologie, Dubletten, Ticketlinks, Texte.
// Läuft ohne Netz und ohne zusätzliche Abhängigkeiten:
//   npm test   (= node --experimental-strip-types --test tests/*.test.mts, Node ≥ 22.12)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berlinDay, berlinOffset, parseIso } from '../src/lib/dates.ts';
import {
  soFreundeDates,
  soFreundeDescription,
  soFreundeName,
  tourDates,
  tourDescription,
  tourName,
} from '../src/data/tour.ts';
import type { TourDate } from '../src/data/tour.ts';

const lists: Array<[string, TourDate[]]> = [
  ['tourDates', tourDates],
  ['soFreundeDates', soFreundeDates],
];

// ---------------------------------------------------------------- Form
test('Form: beide Terminlisten sind nicht leer, Pflichtfelder sind nicht-leere Strings', () => {
  for (const [name, dates] of lists) {
    assert.ok(dates.length > 0, `${name}: Liste ist leer`);
    for (const d of dates) {
      for (const field of ['date', 'city', 'venue', 'ticketUrl'] as const) {
        const value = d[field];
        assert.equal(typeof value, 'string', `${name} ${d.city}: ${field} ist kein String`);
        assert.ok(value.trim().length > 0, `${name} ${d.city}: ${field} ist leer`);
      }
      assert.ok(
        d.soldOut === undefined || typeof d.soldOut === 'boolean',
        `${name} ${d.city}: soldOut ist weder undefined noch boolean`
      );
      for (const field of ['street', 'postalCode'] as const) {
        const value = d[field];
        if (value === undefined) continue;
        assert.equal(typeof value, 'string', `${name} ${d.city}: ${field} ist kein String`);
        assert.ok(value.trim().length > 0, `${name} ${d.city}: ${field} ist leer`);
      }
    }
  }
});

// ---------------------------------------------------------------- Datumsformat
test('Datumsformat: date ist ISO-8601 mit Offset, parseIso akzeptiert es, Kalendertag stimmt mit Berlin überein', () => {
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  for (const [name, dates] of lists) {
    for (const d of dates) {
      assert.match(d.date, isoPattern, `${name} ${d.city}: date "${d.date}" ist kein ISO-8601-Datum mit Offset`);
      assert.doesNotThrow(() => parseIso(d.date), `${name} ${d.city}: parseIso wirft für "${d.date}"`);
      assert.equal(
        d.date.slice(0, 10),
        berlinDay(d.date),
        `${name} ${d.city}: Kalendertag im Datumsstring stimmt nicht mit Europe/Berlin überein`
      );
    }
  }
});

// ---------------------------------------------------------------- Offset
test('Offset passt zu Europe/Berlin (fängt z. B. +02:00 an einem Novembertermin)', () => {
  for (const [name, dates] of lists) {
    for (const d of dates) {
      const ist = d.date.slice(-6);
      const soll = berlinOffset(d.date);
      assert.equal(
        ist,
        soll,
        `${name} ${d.city}: Offset ${ist} passt nicht zu Europe/Berlin am ${d.date.slice(0, 10)} (erwartet ${soll})`
      );
    }
  }
});

// ---------------------------------------------------------------- Chronologisch
test('Chronologisch: Termine stehen innerhalb jeder Liste in aufsteigender Reihenfolge', () => {
  for (const [name, dates] of lists) {
    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i - 1];
      const curr = dates[i];
      assert.ok(
        parseIso(prev.date).getTime() < parseIso(curr.date).getTime(),
        `${name}: ${prev.city} (${prev.date}) steht vor ${curr.city} (${curr.date}) – ` +
          `tour.ts: Termine chronologisch eintragen (Terminliste zeigt die Reihenfolge der Datei)`
      );
    }
  }
});

// ---------------------------------------------------------------- Dubletten
test('Keine Dubletten: date-Strings sind innerhalb jeder Liste eindeutig', () => {
  for (const [name, dates] of lists) {
    const seen = new Map<string, string>();
    for (const d of dates) {
      assert.ok(
        !seen.has(d.date),
        `${name}: date "${d.date}" ist doppelt vergeben (${seen.get(d.date)} und ${d.city})`
      );
      seen.set(d.date, d.city);
    }
  }
});

// ---------------------------------------------------------------- Ticketlinks
test('Ticketlinks: gültige https-URL ohne affiliate-Parameter', () => {
  for (const [name, dates] of lists) {
    for (const d of dates) {
      let url: URL | undefined;
      assert.doesNotThrow(() => {
        url = new URL(d.ticketUrl);
      }, `${name} ${d.city}: ticketUrl "${d.ticketUrl}" ist keine gültige URL`);
      assert.equal(url?.protocol, 'https:', `${name} ${d.city}: ticketUrl ist kein https-Link`);
      assert.equal(
        url?.searchParams.has('affiliate'),
        false,
        `${name} ${d.city}: ticketUrl enthält affiliate-Parameter – Commit 5148c83 hat ` +
          `?affiliate=TUG bewusst entfernt, der Code gehört nicht dem Betreiber`
      );
    }
  }
});

// ---------------------------------------------------------------- Texte
test('Texte: Namen und Beschreibungen sind nicht-leere Strings, Namen beginnen mit „Roger G"', () => {
  const texts: Array<[string, string]> = [
    ['tourName', tourName],
    ['tourDescription', tourDescription],
    ['soFreundeName', soFreundeName],
    ['soFreundeDescription', soFreundeDescription],
  ];
  for (const [label, value] of texts) {
    assert.equal(typeof value, 'string', `${label} ist kein String`);
    assert.ok(value.trim().length > 0, `${label} ist leer`);
  }
  assert.ok(tourName.startsWith('Roger G'), `tourName "${tourName}" beginnt nicht mit "Roger G"`);
  assert.ok(soFreundeName.startsWith('Roger G'), `soFreundeName "${soFreundeName}" beginnt nicht mit "Roger G"`);
});

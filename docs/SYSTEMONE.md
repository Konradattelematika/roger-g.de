# System One – Tourtermine automatisch (seit 17.11.2026)

Rogers Management pflegt Termine in **System One**. Die Seite holt sie **beim Build** über die öffentliche API
(kein Schlüssel nötig) und führt sie mit `src/data/tour.ts` zusammen.

- API: `https://client.systemonesoftware.com/api/v1/shows/857d1e6c948d4788961e4968cc7cc061?artistIds=2105280&lang=de-DE&per_page=500&upcoming_limit=730&cancelled=true&page=N`
  (Link kam von Chris/Management per Mail; nur auf „sichtbar" gestellte Shows erscheinen. Stand 17.11.2026: 0 Shows.)
- Code: `src/lib/systemone.ts` (Mapping, Zuordnung, Merge – reine Funktionen), `src/data/shows.ts` (Laden + `getShows()`,
  von Hero/Marquee/About/index benutzt), Tests `tests/systemone.test.mts`.
- **Zuordnung** nach Programmname: „Try Out…" → Liste „Termine", „So Freunde…" → „So Freunde!", alles andere →
  eigene Sektion „Neue Termine" mit dem Programmnamen als Annotation (pro Programm eine). Leer → keine Sektion.
- **Merge:** gleiche Show = gleicher Kalendertag + gleiche Stadt (erstes Wort, „Halle (Saale)" ≙ „Halle").
  System One gewinnt bei Uhrzeit, Venue, Ticketlink, Abgesagt; `soldOut` aus tour.ts bleibt erhalten.
  Ticketlinks aus System One werden unverändert übernommen (inkl. Affiliate/UTM des Managements).
- **Status:** `tickets.soldOut` → „Ausverkauft"; `status.phase == "C"` oder Eventname „Abgesagt…" → „Abgesagt"
  (Karte gedimmt, JSON-LD `EventCancelled`). Uhrzeit aus `performanceTime` („20:00 Uhr"), fehlt sie → 20:00.
- **Ausfallsicherheit:** API nicht erreichbar → `src/data/systemone-snapshot.json` (letzter Stand, committet).
  Aktualisieren: `npm run systemone:snapshot` + commit. `SYSTEMONE_OFFLINE=1 npm run build` erzwingt den Snapshot.
- **Aktualität:** Besucher laden nichts von System One (Datenschutz unverändert). Neue Termine/Ausverkauft erscheinen
  nach einem neuen Deploy – das macht seit 17.11.2026 der Skript-Loop **`roger-g-rebuild`**
  (`~/claude-cloud/loops/roger-g-rebuild/run.sh`, stündlich :07 UTC, kein Claude): Deploy, wenn sich die
  System-One-Antwort geändert hat (sha256 der `data`) oder heute (Berlin) noch kein Loop-Deploy lief → hält auch
  „Nächste Show"/„Vorbei" aktuell. Zustand in `loops/roger-g-rebuild/state/`, Log `run.log`, Mail an Konrad bei
  Fehlern (1×/Tag je Art). Abschalten: `loopctl disable roger-g-rebuild`.
  Achtung: Code-Pushes auf `main` gehen damit spätestens am nächsten Tag automatisch live.

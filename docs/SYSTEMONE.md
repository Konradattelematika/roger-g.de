# System One – Tourtermine automatisch (seit 17.11.2026)

Rogers Management pflegt Termine in **System One**. Die Seite holt sie **beim Build** über die öffentliche API
(kein Schlüssel nötig) und führt sie mit `src/data/tour.ts` zusammen.

- API: `https://client.systemonesoftware.com/api/v1/shows/857d1e6c948d4788961e4968cc7cc061?artistIds=2105280&lang=de-DE&per_page=500&upcoming_limit=730&cancelled=true&page=N`
  (Link kam von Chris/Management per Mail; nur auf „sichtbar" gestellte Shows erscheinen. Stand 17.11.2026: 0 Shows.)
- Code: `src/lib/systemone.ts` (Mapping, Zuordnung, Merge – reine Funktionen), `src/data/shows.ts` (Laden + `getShows()`,
  von Hero/Marquee/About/index benutzt), Tests `tests/systemone.test.mts`.
- **Zuordnung** nach Programmname: „Try Out…" → Liste „Termine", „So Freunde…" → „So Freunde!", alles andere →
  eigene Sektion „Neue Termine" mit dem Programmnamen als Annotation (pro Programm eine). Leer → keine Sektion.
- **Merge (seit 18.11.2026 nur bei eindeutiger Zuordnung):** Kandidat ist ein tour.ts-Eintrag am selben Kalendertag in
  derselben Stadt (erstes Wort, „Halle (Saale)" ≙ „Halle"). Zusammengeführt wird er mit einer System-One-Show nur, wenn
  (a) die Beginnzeit gleich ist – dann auch bei anderem Venue-Namen (Verlegung, andere Schreibweise) – oder
  (b) die Spielstätte dieselbe ist (gleiche Wörter oder Namensanfang, „Indra" ≙ „Indra Musikclub") und die Beginnzeit
  höchstens 90 Minuten abweicht. Fehlt in System One die Uhrzeit oder der Venue-Name, zählt die jeweilige Angabe nicht
  als Widerspruch. **Sonst bleiben beide Termine stehen** (andere Spielstätte + andere Uhrzeit, oder Zusatzshow in
  derselben Halle) und der Build-Log nennt den möglichen Doppeleintrag („nicht zusammengeführt") – ist es doch dieselbe
  Show, den tour.ts-Eintrag entfernen. Jeder tour.ts-Eintrag wird höchstens EINER Show zugeordnet, System-One-Shows
  werden nie untereinander zusammengelegt.
  Bei einer zusammengeführten Show gewinnt System One mit echten Werten: Uhrzeit, Venue, Ticketlink, Abgesagt und der
  **Ausverkauft-Status, sobald System One ihn ausdrücklich nennt** (auch „wieder Karten da"; ohne Angabe bleibt der Stand
  aus tour.ts). Straße/PLZ aus tour.ts bleiben nur bei derselben Spielstätte. Ticketlinks aus System One werden
  unverändert übernommen (inkl. Affiliate/UTM des Managements).
- **Status:** `tickets.soldOut` → „Ausverkauft"; `status.phase == "C"` oder Eventname „Abgesagt…" → „Abgesagt"
  (Karte gedimmt, JSON-LD `EventCancelled`). Uhrzeit aus `performanceTime` („20:00 Uhr"). Nennt System One keine und gibt
  es keinen tour.ts-Eintrag, trägt die Show intern den Platzhalter 20:00 und das Kennzeichen `timeUnknown`: JSON-LD
  (`startDate`) und `<time datetime>` geben dann nur das Datum aus (`machineDate` in `src/lib/dates.ts`).
  Einzelne unbrauchbare Datensätze (Datum „TBA", fehlende Stadt) werden mit Warnung im Build-Log übersprungen.
- **Ausfallsicherheit (seit 18.11.2026):** Der Abruf wird bis zu 3× versucht. Bleibt die API unerreichbar – oder liefert
  sie Datensätze, von denen KEINER lesbar ist –, **bricht der Build ab**: die bisher deployte Version bleibt mit ihren
  Terminen live, der Loop `roger-g-rebuild` mailt den fehlgeschlagenen Deploy und versucht es stündlich erneut. Es gibt
  bewusst keinen automatischen Rückfall auf den Snapshot (er kann älter sein als der zuletzt veröffentlichte Stand und
  würde neuere Termine wieder entfernen). `src/data/systemone-snapshot.json` (`npm run systemone:snapshot`) wird nur mit
  `SYSTEMONE_OFFLINE=1` benutzt (Arbeiten ohne Netz). Achtung Notfall-Deploy: Im Coolify-Build kommt die Variable nur an,
  wenn das Dockerfile sie als `ARG`/`ENV` durchreicht – das tut es bisher nicht.
- **Aktualität:** Besucher laden nichts von System One (Datenschutz unverändert). Neue Termine/Ausverkauft erscheinen
  nach einem neuen Deploy – das macht seit 17.11.2026 der Skript-Loop **`roger-g-rebuild`**
  (`~/claude-cloud/loops/roger-g-rebuild/run.sh`, stündlich :07 UTC, kein Claude): Deploy, wenn sich die
  System-One-Antwort geändert hat (sha256 der `data`) oder heute (Berlin) noch kein Loop-Deploy lief → hält auch
  „Nächste Show"/„Vorbei" aktuell. Zustand in `loops/roger-g-rebuild/state/`, Log `run.log`, Mail an Konrad bei
  Fehlern (1×/Tag je Art). Abschalten: `loopctl disable roger-g-rebuild`.
  Achtung: Code-Pushes auf `main` gehen damit spätestens am nächsten Tag automatisch live.

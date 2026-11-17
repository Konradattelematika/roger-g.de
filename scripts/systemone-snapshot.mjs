// Aktualisiert src/data/systemone-snapshot.json = Rückfallstand, falls die
// System-One-API beim Build nicht erreichbar ist (src/data/shows.ts).
//   npm run systemone:snapshot
// Danach committen – der Snapshot ist Teil des Repos (Coolify baut aus GitHub).
import { writeFile } from 'node:fs/promises';

const URL_BASE =
  'https://client.systemonesoftware.com/api/v1/shows/857d1e6c948d4788961e4968cc7cc061';
const ARTIST = 2105280;
const out = new URL('../src/data/systemone-snapshot.json', import.meta.url);

const data = [];
for (let page = 1; page <= 10; page++) {
  const q = new URLSearchParams({
    artistIds: String(ARTIST), lang: 'de-DE', per_page: '500',
    upcoming_limit: '730', cancelled: 'true', page: String(page),
  });
  const res = await fetch(`${URL_BASE}?${q}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`System One: HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body?.data)) throw new Error('System One: Antwort ohne data-Array');
  data.push(...body.data);
  if (!body.pagination || page >= body.pagination.pageCount) break;
}
const fetchedAt = new Date().toISOString();
await writeFile(out, JSON.stringify({ fetchedAt, artistId: ARTIST, data }, null, 2) + '\n');
console.log(`Snapshot: ${data.length} Show(s), Stand ${fetchedAt} → ${out.pathname}`);

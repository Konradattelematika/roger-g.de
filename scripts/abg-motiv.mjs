// Erzeugt das Foto-Motiv des Abgeblasen-Abschnitts (public/img/abg-motiv-*).
// Quelle = vorläufige Ankündigungsgrafik des Managements (Dropbox „Backup Grafiken",
// 17.11.2026), wird ersetzt, sobald die finalen Dateien da sind.
// Ganzes Bild, kein Zuschnitt, kein Hochskalieren (Original 900×600).
// Aufruf: node scripts/abg-motiv.mjs
import sharp from 'sharp';

const SRC = 'design-reference/abgeblasen/11.jpeg';
const meta = await sharp(SRC).metadata();
console.log(`Quelle: ${meta.width}x${meta.height}`);

for (const w of [480, 768, 900]) {
  const base = sharp(SRC).resize({ width: w, withoutEnlargement: true });
  await base.clone().webp({ quality: 78 }).toFile(`public/img/abg-motiv-${w}.webp`);
  await base.clone().avif({ quality: 55 }).toFile(`public/img/abg-motiv-${w}.avif`);
  console.log(`OK abg-motiv-${w} (webp+avif)`);
}

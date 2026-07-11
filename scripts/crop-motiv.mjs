// Erzeugt das textfreie Hero-Motiv für mobil aus dem Original-Plakat:
// Pink-Rahmen und eingebackene Titel-Typo werden weggeschnitten, damit die
// HTML-Typo nicht mit der Plakat-Typo kollidiert.
// Aufruf: node scripts/crop-motiv.mjs
import sharp from 'sharp';

const SRC = 'design-reference/1.png';
const meta = await sharp(SRC).metadata();
console.log(`Quelle: ${meta.width}x${meta.height}`);

// Anteile am Original: 4,2 % Rahmen seitlich, 23 % Titelzone oben,
// unten vor dem Verlaufs-Band abschneiden (92 %).
const left = Math.round(meta.width * 0.042);
const top = Math.round(meta.height * 0.23);
const width = meta.width - 2 * left;
const height = Math.round(meta.height * 0.895) - top;

for (const w of [480, 768, 1080]) {
  const base = sharp(SRC).extract({ left, top, width, height }).resize(w);
  await base
    .clone()
    .webp({ quality: 78 })
    .toFile(`public/img/motiv-${w}.webp`);
  await base
    .clone()
    .avif({ quality: 55 })
    .toFile(`public/img/motiv-${w}.avif`);
  console.log(`OK motiv-${w} (webp+avif)`);
}
console.log(`Crop: ${width}x${height} ab (${left},${top})`);

// Portrait-Variante für schmale Phones (~9:19,5): volle Motivhöhe,
// Ausschnitt um Rogers Gesicht (47 % der Breite), Gebäude bleibt links im Bild.
const pWidth = Math.round(height * 0.52);
const faceX = left + Math.round(width * 0.47);
const pLeft = Math.min(
  Math.max(left, faceX - Math.round(pWidth / 2)),
  left + width - pWidth
);
for (const w of [480, 768]) {
  const base = sharp(SRC)
    .extract({ left: pLeft, top, width: pWidth, height })
    .resize(w);
  await base
    .clone()
    .webp({ quality: 78 })
    .toFile(`public/img/motiv-hoch-${w}.webp`);
  await base
    .clone()
    .avif({ quality: 55 })
    .toFile(`public/img/motiv-hoch-${w}.avif`);
  console.log(`OK motiv-hoch-${w} (webp+avif)`);
}
console.log(`Portrait: ${pWidth}x${height} ab (${pLeft},${top})`);

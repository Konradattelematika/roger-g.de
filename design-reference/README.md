# Design-Referenz: Tourplakate

Die Grafiken in diesem Ordner sind die offiziellen Tourplakate der
Try Out Tour 26. Sie sind die MASSGEBLICHE Design-Vorlage für die Seite.

Dateien: `1.png` (Hauptplakat ohne Datum), `2.png`–`6.png` (Stadt-Varianten),
`14.png` (Übersichtsplakat mit allen Terminen), PDF = Druckvorlage Hauptplakat.

## Analyse (vorab extrahiert – beim Arbeiten verifizieren)

- **Signature-Pink (Titel/Bubble-Font):** ~#e890c0
- **Rahmen/Verlauf (Mauve-Pink):** ~#c67fab, dunkler auslaufend ~#8e627d
- **Text:** Weiß mit rosa Neon-Glow (text-shadow), Schwarz nur als weicher Schatten hinter dem Titel
- **Hintergrund:** Pastellfarbener Plattenbau (rosa/mint/gelb/blau), leicht entsättigt
- **Typo:** Titel + Daten in runder Bubble-/Marker-Schrift (handgezeichnet wirkend),
  Sublines in fetter, leicht condensed Sans (weiß, uppercase)
- **Vibe:** 90s-Hip-Hop trifft Ostsee-Plattenbau, frech, bunt, nahbar –
  NICHT dunkel/edgy

## Arbeitsauftrag für Claude Code

1. Plakate selbst ansehen (Read-Tool) und die Analyse oben verifizieren/verfeinern.
2. Design-Tokens in `src/styles/global.css` ERSETZEN: Die dort noch vorhandene
   Platzhalter-Palette (Bühnenschwarz/Amber/Stempelrot) entspricht NICHT den
   Plakaten. Neue Basis: heller Pink-Verlauf als Rahmen/Hintergrundakzent,
   Signature-Pink für Headlines/CTAs, Weiß mit Glow für Sublines.
3. Fonts: Bubble-Charakter des Titels mit freiem Fontsource-Äquivalent
   nachbilden (Kandidaten prüfen: "Baloo 2", "Fredoka", "Titan One");
   Subline-Sans: "Poppins" oder ähnlich fette geometrische Sans. Wahl in
   CLAUDE.md dokumentieren und begründen.
4. Hero: Das Hauptplakat-Motiv (Roger im Fisheye vor Plattenbau) darf als
   Hero-Bild verwendet werden – vorher zu WebP/AVIF konvertieren und auf
   Webgröße skalieren (Originale sind ~10 MB PNG, NIE direkt einbinden).
   Freistellen/Zuschneiden für responsive Varianten ist erlaubt.
5. Der bisherige "UNGETESTET"-Stempel darf bleiben, aber im Plakat-Stil
   (Pink/Bubble statt Rot/Stencil) – oder ersatzlos raus, wenn er nicht passt.
6. Nach der Anpassung: Screenshot-Vergleich Seite vs. Plakat (390 px) –
   die Seite muss sich wie das Plakat "anfühlen", nicht es kopieren.

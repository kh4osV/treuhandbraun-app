// Rastert die Icon-SVGs in 1024x1024-PNGs (EAS/Expo erzeugt daraus alle
// Plattform-Groessen). Aufruf: node scripts/render-icons.mjs
import sharp from 'sharp';

const jobs = [
  ['assets/icon.svg', 'assets/icon.png'],
  ['assets/adaptive-icon.svg', 'assets/adaptive-icon.png']
];

for (const [src, out] of jobs) {
  await sharp(src, { density: 512 }).resize(1024, 1024).png().toFile(out);
  console.log('rendered', out);
}

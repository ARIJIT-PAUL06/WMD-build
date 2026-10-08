// One-off: converts the large PNG/JPG hero & documentary assets to WebP next to the originals.
// Usage: node scripts/optimize-images.mjs   (requires the `sharp` devDependency)
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const targets = [
  'public/lungs-panoramic.png',
  'public/assets/truck_cargo_master.png',
  ...['public/assets/documentary', 'public/assets/documentary/vehicles']
    .flatMap((dir) => readdirSync(dir).map((f) => join(dir, f)))
    .filter((f) => ['.jpg', '.jpeg'].includes(extname(f))),
];

let before = 0;
let after = 0;
for (const src of targets) {
  const out = src.replace(/\.(png|jpe?g)$/i, '.webp');
  await sharp(src).webp({ quality: 78, effort: 6 }).toFile(out);
  before += statSync(src).size;
  after += statSync(out).size;
  console.log(`${src} -> ${out}  ${(statSync(src).size / 1024) | 0}KB -> ${(statSync(out).size / 1024) | 0}KB`);
}
console.log(`total ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`);

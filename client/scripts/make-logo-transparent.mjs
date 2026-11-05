import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "../public/educhat-logo.png");
const outPath = path.join(__dirname, "../public/educhat-logo-transparent.png");

const { data, info } = await sharp(logoPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const hardCutoff = 38;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = (r + g + b) / 3;

  if (lum <= hardCutoff) {
    data[i + 3] = 0;
    continue;
  }

  if (lum <= 72) {
    const t = (lum - hardCutoff) / (72 - hardCutoff);
    data[i + 3] = Math.round(data[i + 3] * t);
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim({ threshold: 12 })
  .png()
  .toFile(outPath);

const trimmed = await sharp(outPath).metadata();
console.log(`Wrote ${outPath} (${trimmed.width}x${trimmed.height})`);

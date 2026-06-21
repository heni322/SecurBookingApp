/**
 * Provalk Client â€” app launcher icon pipeline.
 *
 * Source of truth:  branding/proValk_Client.png  (transparent landscape wordmark)
 * Brand background:  palette.bg = #0c1220  (src/theme/colors.ts)
 *
 * The source is a transparent wordmark (~913x588 content on a 1000x1000 canvas),
 * NOT a square full-bleed icon. This pipeline therefore composites the trimmed
 * wordmark, centered, onto an OPAQUE brand-navy square before fanning out to
 * every platform size. That guarantees:
 *   - no transparent gaps on Android launchers
 *   - no black bars on iOS (iOS renders icon alpha as black)
 *   - App Store compliance (every iOS size is flattened â†’ zero alpha)
 *
 * Generates:
 *   Android  - legacy launcher PNGs, 5 densities, square + round
 *            - adaptive icon (Android 8+/API 26): solid background color +
 *              foreground PNGs sized to the 66% safe zone + anydpi-v26 XML
 *   iOS      - full AppIcon.appiconset (all sizes) + Contents.json, alpha-flattened
 *
 * Does NOT touch in-app branding (src/assets/logo*.png) â€” the login hero is
 * driven by a separate asset and is intentionally left unchanged.
 *
 * Run:  npm run icon:generate   (idempotent â€” all outputs are overwritten)
 */
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');

// â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROOT       = path.resolve(__dirname, '..');
const SRC        = path.join(ROOT, 'branding', 'proValk_Client.png');
const ANDROID    = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_ICON   = path.join(ROOT, 'ios', 'SecurBookingApp', 'Images.xcassets', 'AppIcon.appiconset');

// Brand navy â€” must equal palette.bg in src/theme/colors.ts.
const BG = { r: 0x0c, g: 0x12, b: 0x20 };       // #0c1220
const BG_HEX = '#0c1220';

// How much of a FULL-BLEED square the wordmark spans (iOS + Android legacy).
// iOS only rounds corners (~22%), so a wide mark at 0.78 is safe and looks full.
const FULLBLEED_RATIO = 0.78;

// How much of the ADAPTIVE foreground canvas the wordmark spans. Adaptive icons
// are masked to arbitrary shapes (circle/squircle/teardrop); only the central
// ~66% is guaranteed visible, so the wordmark is scaled down to survive any mask.
const ADAPTIVE_RATIO = 0.52;

// Android legacy launcher densities â†’ square px.
const ANDROID_LEGACY = {
  'mipmap-mdpi':    48,
  'mipmap-hdpi':    72,
  'mipmap-xhdpi':   96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
};

// Android adaptive foreground densities â†’ 108dp canvas px.
const ANDROID_ADAPTIVE = {
  'mipmap-mdpi':    108,
  'mipmap-hdpi':    162,
  'mipmap-xhdpi':   216,
  'mipmap-xxhdpi':  324,
  'mipmap-xxxhdpi': 432,
};

// iOS AppIcon required sizes (iOS 14+). { size, scale, idiom, filename }.
const IOS_ICONS = [
  { size: 20, scale: 2, idiom: 'iphone', filename: 'icon-20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'icon-20@3x.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'icon-29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'icon-29@3x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'icon-40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'icon-40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'icon-60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'icon-60@3x.png' },
  { size: 20,   scale: 1, idiom: 'ipad', filename: 'icon-20.png' },
  { size: 20,   scale: 2, idiom: 'ipad', filename: 'icon-20@2x-ipad.png' },
  { size: 29,   scale: 1, idiom: 'ipad', filename: 'icon-29.png' },
  { size: 29,   scale: 2, idiom: 'ipad', filename: 'icon-29@2x-ipad.png' },
  { size: 40,   scale: 1, idiom: 'ipad', filename: 'icon-40.png' },
  { size: 40,   scale: 2, idiom: 'ipad', filename: 'icon-40@2x-ipad.png' },
  { size: 76,   scale: 1, idiom: 'ipad', filename: 'icon-76.png' },
  { size: 76,   scale: 2, idiom: 'ipad', filename: 'icon-76@2x.png' },
  { size: 83.5, scale: 2, idiom: 'ipad', filename: 'icon-83.5@2x.png' },
  { size: 1024, scale: 1, idiom: 'ios-marketing', filename: 'icon-1024.png' },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function circularMask(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
     </svg>`,
  );
}

/**
 * Trim the transparent border off the source wordmark once, returning a tight
 * PNG buffer. Resizing from this tight crop keeps the mark crisp at every size.
 */
async function trimmedWordmark() {
  return sharp(SRC).trim({ threshold: 10 }).png().toBuffer();
}

/**
 * Compose the wordmark, centered, onto a `size`x`size` canvas.
 *   - opaque=true  â†’ brand-navy background, zero alpha (icons)
 *   - opaque=false â†’ transparent background (adaptive foreground)
 * `ratio` is the fraction of the canvas the wordmark's bounding box may span.
 */
async function compose(mark, size, ratio, opaque) {
  const inner = Math.round(size * ratio);
  const fitted = await sharp(mark)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: opaque ? { ...BG, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  let pipe = base.composite([{ input: fitted, gravity: 'center' }]);
  if (opaque) pipe = pipe.flatten({ background: BG }).removeAlpha(); // opaque RGB, no alpha channel (App Store rule)
  return pipe.png({ compressionLevel: 9 }).toBuffer();
}

// â”€â”€ Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function run() {
  if (!fs.existsSync(SRC)) { console.error(`âœ— Source not found: ${SRC}`); process.exit(1); }

  const meta = await sharp(SRC).metadata();
  console.log(`âœ“ Source: ${meta.width}x${meta.height} ${meta.format} (alpha: ${meta.hasAlpha})`);
  console.log(`âœ“ Background: ${BG_HEX}\n`);

  const mark = await trimmedWordmark();

  // â”€â”€ Android legacy launcher icons (square + round) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log('â— Android legacy launcher icons');
  for (const [folder, size] of Object.entries(ANDROID_LEGACY)) {
    const dir = path.join(ANDROID, folder);
    ensureDir(dir);

    const square = await compose(mark, size, FULLBLEED_RATIO, true);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), square);

    const round = await sharp(square)
      .composite([{ input: circularMask(size), blend: 'dest-in' }])
      .png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), round);

    console.log(`  ${folder.padEnd(18)} ${size}x${size}  (square + round)`);
  }

  // â”€â”€ Android adaptive icon (API 26+) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log('\nâ— Android adaptive icon (API 26+)');
  for (const [folder, size] of Object.entries(ANDROID_ADAPTIVE)) {
    const dir = path.join(ANDROID, folder);
    ensureDir(dir);
    const fg = await compose(mark, size, ADAPTIVE_RATIO, false); // transparent fg
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg);
    console.log(`  ${folder.padEnd(18)} ${size}x${size}  (foreground)`);
  }

  // Background color resource.
  const valuesDir = path.join(ANDROID, 'values');
  ensureDir(valuesDir);
  fs.writeFileSync(
    path.join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG_HEX}</color>\n</resources>\n`,
  );
  console.log('  values/ic_launcher_background.xml');

  // anydpi-v26 adaptive descriptors (square + round share the same layers).
  const anydpi = path.join(ANDROID, 'mipmap-anydpi-v26');
  ensureDir(anydpi);
  const adaptiveXml =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n` +
    `    <background android:drawable="@color/ic_launcher_background"/>\n` +
    `    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n` +
    `</adaptive-icon>\n`;
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptiveXml);
  console.log('  mipmap-anydpi-v26/ic_launcher.xml + ic_launcher_round.xml');

  // â”€â”€ iOS AppIcon.appiconset (alpha-flattened) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log('\nâ— iOS app icons');
  ensureDir(IOS_ICON);
  for (const icon of IOS_ICONS) {
    const px = Math.round(icon.size * icon.scale);
    const buf = await compose(mark, px, FULLBLEED_RATIO, true); // opaque â†’ no alpha
    fs.writeFileSync(path.join(IOS_ICON, icon.filename), buf);
    console.log(`  ${icon.filename.padEnd(28)} ${px}x${px}`);
  }
  const contents = {
    images: IOS_ICONS.map(i => ({
      size: `${i.size}x${i.size}`, idiom: i.idiom, filename: i.filename, scale: `${i.scale}x`,
    })),
    info: { version: 1, author: 'xcode' },
  };
  fs.writeFileSync(path.join(IOS_ICON, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log('  Contents.json (manifest)');

  console.log('\nâœ“ Launcher icons generated. Rebuild the native apps to see them.\n');
}

run().catch(err => { console.error('âœ— Icon generation failed:', err); process.exit(1); });

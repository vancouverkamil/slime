const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'supabase', 'functions', 'slime', 'public');
const functionDir = path.join(root, 'supabase', 'functions', 'slime');
const assetsFile = path.join(functionDir, 'assets.ts');

const files = [
  'slime_volleyball.html',
  'ws-config.js',
  'progression.js',
  'Input.js',
  'SlimeAI.js',
  'MentalSlimeAI.js',
  'physics.js',
  'vball.png',
  'slime175green.png',
  'slime175red.png',
  'sky2.jpg',
  'cave.jpg',
  'sunset.jpg',
  'css/slime.css',
  'js/client-state.js',
  'js/accounts.js',
  'js/inventory-ui.js',
  'js/render-maps.js',
  'js/render-game.js',
  'js/local-game.js',
  'js/online-state.js',
  'js/feature-cards.js',
  'js/calling-cards.js',
  'js/tournament-mode.js',
  'js/online-effects.js',
  'js/lobby-ui.js',
  'js/online-game.js',
  'js/multiverse-physics.js',
  'js/slimeverse.js',
  'js/menus.js',
  'js/replay.js',
  'js/customization-hats.js',
  'js/hat-studio.js',
  'js/options-ui.js',
  'js/audio.js',
  'js/bootstrap.js',
];

function supabaseAssetHtml(html) {
  return html
    .replace('<head>', '<head><script>window.SLIME_SUPABASE_FUNCTION_ASSETS=true;</script>')
    .replace(/(src|href)="([^":#?]+)"/g, (match, attr, value) => {
      if (!files.includes(value)) return match;
      return `${attr}="?file=${value}"`;
    });
}

fs.rmSync(out, { recursive: true, force: true });

const assets = {};

for (const file of files) {
  const src = path.join(root, file);
  const dest = path.join(out, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);

  let bytes = fs.readFileSync(src);
  if (file === 'slime_volleyball.html') {
    const html = supabaseAssetHtml(bytes.toString('utf8'));
    bytes = Buffer.from(html, 'utf8');
  }
  assets[file.replaceAll('\\', '/')] = bytes.toString('base64');
}

fs.writeFileSync(
  assetsFile,
  `export const ASSETS: Record<string, string> = ${JSON.stringify(assets, null, 2)};\n`,
);

console.log(`Copied ${files.length} files to ${path.relative(root, out)}`);
console.log(`Generated ${path.relative(root, assetsFile)}`);

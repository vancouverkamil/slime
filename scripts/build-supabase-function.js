const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'supabase', 'functions', 'slime', 'public');
const functionDir = path.join(root, 'supabase', 'functions', 'slime');
const assetsFile = path.join(functionDir, 'assets.ts');

function filesUnder(relativeDirectory, extension) {
  const directory = path.join(root, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(relativeDirectory, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) return filesUnder(relative, extension);
    return !extension || entry.name.endsWith(extension) ? [relative] : [];
  });
}

const files = [...new Set([
  'slime_volleyball.html',
  'ws-config.js',
  'progression.js',
  'Input.js',
  ...fs.readdirSync(root).filter((file) => /^(?:SlimeAI|MentalSlimeAI)(?:\.part-\d+)?\.js$/.test(file)),
  'physics.js',
  'vball.png',
  'slime175green.png',
  'slime175red.png',
  'sky2.jpg',
  'cave.jpg',
  'sunset.jpg',
  ...filesUnder('css', '.css'),
  ...filesUnder('js', '.js'),
])];

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
  } else if (file === 'css/slime.css') {
    const css = bytes.toString('utf8').replace(
      /@import url\("components\/([^\"]+)"\);/g,
      '@import url("?file=css/components/$1");'
    );
    bytes = Buffer.from(css, 'utf8');
  }
  assets[file.replaceAll('\\', '/')] = bytes.toString('base64');
}

fs.writeFileSync(
  assetsFile,
  `export const ASSETS: Record<string, string> = ${JSON.stringify(assets, null, 2)};\n`,
);

console.log(`Copied ${files.length} files to ${path.relative(root, out)}`);
console.log(`Generated ${path.relative(root, assetsFile)}`);

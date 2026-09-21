// Copies the frontend-only files (no server.js, server/, db/, stores/,
// account-store.js, etc.) into www/, which Capacitor bundles into the
// native iOS/Android app. Run before `npx cap sync`.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

// Capacitor requires the webDir root entry point to be named index.html.
const ENTRY_HTML = 'slime_volleyball.html';

const files = [
  'slime-config.js',
  'ws-config.js',
  'progression.js',
  'Input.js',
  'SlimeAI.js',
  'SlimeAI.part-2.js',
  'SlimeAI.part-3.js',
  'SlimeAI.part-4.js',
  'SlimeAI.part-5.js',
  'MentalSlimeAI.js',
  'MentalSlimeAI.part-2.js',
  'cave.jpg',
  'sky2.jpg',
  'sunset.jpg',
  'slime175green.png',
  'slime175red.png',
  'vball.png',
];
const dirs = ['css', 'js'];

function copyFile(relativePath) {
  const src = path.join(ROOT, relativePath);
  const dest = path.join(OUT, relativePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(relativePath) {
  const src = path.join(ROOT, relativePath);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const childRelative = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      copyDir(childRelative);
    } else {
      copyFile(childRelative);
    }
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(ROOT, ENTRY_HTML), path.join(OUT, 'index.html'));
files.forEach(copyFile);
dirs.forEach(copyDir);

console.log(`ok - copied ${files.length} files and ${dirs.length} directories into www/`);

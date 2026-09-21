const fs = require('fs');
const path = require('path');

const MAX_LINES = 200;
const ROOT = path.resolve(__dirname, '..');
const extensions = new Set(['.js', '.html', '.css']);
const ignoredDirectories = new Set(['.git', 'node_modules', 'supabase']);
const ignoredPrefixes = [];

function sourceFiles(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const childRelative = path.join(relative, entry.name);
    if (ignoredPrefixes.some((prefix) => childRelative.startsWith(prefix))) continue;
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...sourceFiles(path.join(directory, entry.name), childRelative));
      }
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(childRelative);
    }
  }
  return files;
}

const oversized = sourceFiles(ROOT).map((file) => ({
  file,
  lines: fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/).length,
})).filter(({ lines }) => lines > MAX_LINES);

if (oversized.length) {
  oversized.forEach(({ file, lines }) => console.error(`${lines} lines: ${file}`));
  process.exitCode = 1;
} else {
  console.log(`ok - all first-party HTML, CSS, and JavaScript files are ${MAX_LINES} lines or fewer`);
}

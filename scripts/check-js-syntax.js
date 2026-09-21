const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'supabase']);
const ignoredPrefix = '__never__';

function javascriptFiles(directory, relative = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const childRelative = path.join(relative, entry.name);
    if (childRelative.startsWith(ignoredPrefix)) continue;
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...javascriptFiles(path.join(directory, entry.name), childRelative));
      }
    } else if (entry.name.endsWith('.js')) {
      files.push(childRelative);
    }
  }
  return files;
}

const files = javascriptFiles(ROOT);
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'inherit' });
}
console.log(`ok - syntax checked ${files.length} JavaScript files`);

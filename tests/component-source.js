const fs = require('fs');
const path = require('path');

function readComponent(file) {
  const extension = path.extname(file);
  const stem = file.slice(0, -extension.length);
  const parts = [file];
  for (let index = 2; ; index++) {
    const part = `${stem}.part-${index}${extension}`;
    if (!fs.existsSync(part)) break;
    parts.push(part);
  }
  return parts.map((part) => fs.readFileSync(part, 'utf8')).join('\n');
}

function readStylesheet(file) {
  const source = fs.readFileSync(file, 'utf8');
  return source.replace(/@import url\("([^"]+)"\);/g, (_match, imported) =>
    fs.readFileSync(path.join(path.dirname(file), imported), 'utf8')
  );
}

module.exports = { readComponent, readStylesheet };

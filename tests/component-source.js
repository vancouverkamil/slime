const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Browser scripts in the order the page loads them: the html shell's <script>
// tags, then the on-demand Slimeverse files listed in js/slimeverse/loader.js.
function slimeverseScripts() {
  const sandbox = {};
  const source = fs.readFileSync('js/slimeverse/loader.js', 'utf8');
  vm.runInNewContext(source.match(/var SLIMEVERSE_SCRIPTS = \[[\s\S]*?\];/)[0], sandbox);
  return sandbox.SLIMEVERSE_SCRIPTS;
}

function pageScripts() {
  const html = fs.readFileSync('slime_volleyball.html', 'utf8');
  const tags = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  return tags.concat(slimeverseScripts());
}

// readComponent('js/tournament')          -> every script in that section, in load order
// readComponent('js/game/state.js')       -> one file
// readComponent(['a.js', 'b.js'])         -> several files, concatenated
function readComponent(target) {
  const files = Array.isArray(target)
    ? target
    : fs.statSync(target).isDirectory()
      ? pageScripts().filter((f) => f.startsWith(target.replace(/\/$/, '') + '/'))
      : [target];
  if (!files.length) throw new Error('no scripts found for ' + target);
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
}

function readStylesheet(file) {
  const source = fs.readFileSync(file, 'utf8');
  return source.replace(/@import url\("([^"]+)"\);/g, (_match, imported) =>
    fs.readFileSync(path.join(path.dirname(file), imported), 'utf8')
  );
}

module.exports = { readComponent, readStylesheet, pageScripts, slimeverseScripts };

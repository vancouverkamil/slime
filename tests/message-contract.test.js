// Wiring contract between server and client: every message type the server sends
// has exactly one client handler, so a new server message can't be silently dropped.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (err) { console.error(`not ok - ${name}`); throw err; }
}

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
}
const read = (files) => files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const matches = (src, re) => [...src.matchAll(re)].map((m) => m[1]);

const serverSrc = read(['server/core', 'server/rooms', 'server/tournament', 'server/social'].flatMap(filesUnder));
const sentByServer = new Set(matches(serverSrc, /type:\s*'([a-z_]+)'/g));
const clientSrc = read(filesUnder('js'));
const registered = matches(clientSrc, /onServerMessage\('([a-z_]+)'/g);

test('every message the game server sends has a client handler', () => {
  const missing = [...sentByServer].filter((t) => !registered.includes(t));
  assert.deepStrictEqual(missing, [], 'no client handler for: ' + missing.join(', '));
});

test('no message type has two client handlers', () => {
  const dupes = registered.filter((t, i) => registered.indexOf(t) !== i);
  assert.deepStrictEqual(dupes, []);
});

test('every Slimeverse server message is handled by the Slimeverse client', () => {
  const svSent = new Set(matches(read(filesUnder('server/slimeverse')), /type:\s*'([a-z_]+)'/g));
  const svHandled = matches(fs.readFileSync('js/slimeverse/network.js', 'utf8'), /msg\.type === '([a-z_]+)'/g);
  const missing = [...svSent].filter((t) => !svHandled.includes(t));
  assert.deepStrictEqual(missing, []);
});

test('the message router loads before any script that registers handlers', () => {
  const html = fs.readFileSync('slime_volleyball.html', 'utf8');
  const order = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  const routerAt = order.indexOf('js/online/message-router.js');
  assert.ok(routerAt >= 0);
  order.forEach((f, i) => {
    if (f.startsWith('js/') && /onServerMessage\(/.test(fs.readFileSync(f, 'utf8')) && f !== 'js/online/message-router.js')
      assert.ok(i > routerAt, f + ' registers handlers before the router exists');
  });
});

test('every message the client sends has a server handler', () => {
  const sent = new Set(matches(clientSrc, /lobbySocket\.send\(JSON\.stringify\(\{\s*type:\s*'([a-z_]+)'/g));
  const conn = fs.readFileSync('server/core/connection.js', 'utf8');
  const table = conn.slice(conn.indexOf('const HANDLERS = {'), conn.indexOf('};', conn.indexOf('const HANDLERS = {')));
  const handled = new Set(matches(table, /^\s+([a-z_]+):/gm));
  // Game input goes to the running game's handler instead of the lobby table.
  const gameSrc = fs.readFileSync('server/rooms/game.js', 'utf8');
  ['rps_choice', 'emote'].forEach((t) => { assert.ok(gameSrc.includes("'" + t + "'"), t + ' is not handled by the game'); handled.add(t); });
  const missing = [...sent].filter((t) => !handled.has(t));
  assert.ok(sent.size > 10, 'found the client messages');
  assert.deepStrictEqual(missing, [], 'no server handler for: ' + missing.join(', '));
});

// Installs every server component onto the shared runtime, in dependency order.
// A module may only destructure names defined by server.js or by a module listed
// before it; anything later must be read as ctx.name at call time.
// tests/server-wiring.test.js enforces this.
const MODULES = [
  './core/api',
  './core/lobby-state',
  './rooms/game',
  './rooms/rooms',
  './tournament/tournaments',
  './tournament/matches',
  './tournament/rooms',
  './tournament/spectate',
  './core/connection',
  './social',
  './slimeverse',
];

function installServer(runtime) {
  MODULES.forEach((mod) => require(mod)(runtime));
  return runtime;
}

// Main game sockets on every path except /slimeverse, which gets its own identity.
function routeUpgrades(server, runtime) {
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const target = pathname === runtime.SLIMEVERSE_PATH ? runtime.slimeverseWss : runtime.wss;
    target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
  });
}

module.exports = { installServer, routeUpgrades, MODULES };

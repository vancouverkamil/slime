module.exports = function install(ctx) {
  const { app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES, newBall, newSlime, initRound, tick, send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, getPublicPlayer, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat, broadcastSlimeverse, leaveSlimeverse, enterSlimeverse, slimeverseSnapshot, chatAllowed, parseCookies, getReqToken, handleCustomize, relayChat, handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, startRoomGame, rankedQueue } = ctx;
const TOURN_BRACKETS = [
  { id: 'rookie',     name: 'Rookie Cup',     minLevel: 1,  maxLevel: 15  },
  { id: 'challenger', name: 'Challenger Cup', minLevel: 16, maxLevel: 35  },
  { id: 'elite',      name: 'Elite Cup',      minLevel: 36, maxLevel: 60  },
  { id: 'master',     name: 'Master Cup',     minLevel: 61, maxLevel: 100 },
];
const TOURN_SIZE = 8;
const TOURN_BOT_ROSTER = [
  { name: 'Rust Belly',   color: '#a95522', xp: 150   },
  { name: 'Static Slime', color: '#55ccff', xp: 800   },
  { name: 'Mire Unit',    color: '#5b7f2a', xp: 1800  },
  { name: 'Tar Pit',      color: '#363036', xp: 3500  },
  { name: 'Ghost Gel',    color: '#eeeeff', xp: 5500  },
  { name: 'Scarlet Vex',  color: '#ff335f', xp: 9000  },
  { name: 'Hazard King',  color: '#ffb000', xp: 15000 },
  { name: 'Iron Maw',     color: '#8899bb', xp: 400   },
];

const tournamentLobbies = new Map();

function xpToBotLevel(xp) {
  if (xp < 1000)  return 1;
  if (xp < 5000)  return 2;
  if (xp < 15000) return 3;
  return 4;
}

function getTournLobby(bracketId) {
  if (!tournamentLobbies.has(bracketId)) {
    const def = TOURN_BRACKETS.find(b => b.id === bracketId);
    if (!def) return null;
    tournamentLobbies.set(bracketId, {
      bracketId, name: def.name,
      minLevel: def.minLevel, maxLevel: def.maxLevel,
      players: [], status: 'waiting',
    });
  }
  return tournamentLobbies.get(bracketId);
}

function broadcastTournLobby(lobby) {
  const msg = JSON.stringify({
    type: 'tournament_lobby',
    bracketId: lobby.bracketId,
    bracketName: lobby.name,
    minLevel: lobby.minLevel,
    maxLevel: lobby.maxLevel,
    players: lobby.players.map(p => ({
      username: p.info.username,
      name: p.info.name,
      level: p.info.progression ? p.info.progression.level : 1,
      xp: p.xp,
      ready: p.ready,
      color: p.info.bodyColor || '#00ff00',
    })),
    totalSlots: TOURN_SIZE,
    readyCount: lobby.players.filter(p => p.ready).length,
    status: lobby.status,
  });
  allClients.forEach((_, ws) => { if (ws.readyState === 1) ws.send(msg); });
}

function buildTournBracket(lobby) {
  const sorted = [...lobby.players].sort((a, b) => b.xp - a.xp);
  sorted.forEach((p, i) => { p.seed = i + 1; });

  const bots = [];
  const needed = TOURN_SIZE - sorted.length;
  for (let i = 0; i < needed; i++) {
    const t = TOURN_BOT_ROSTER[i % TOURN_BOT_ROSTER.length];
    const seed = sorted.length + i + 1;
    bots.push({ id: 'bot_' + seed, name: t.name, color: t.color, xp: t.xp, botLevel: xpToBotLevel(t.xp), seed, bot: true });
  }

  // Standard 8-seed bracket placement: 1v8, 4v5, 2v7, 3v6
  const seedOrder = [1, 8, 4, 5, 2, 7, 3, 6];
  const entrantBySeed = (seed) => {
    if (seed <= sorted.length) {
      const p = sorted[seed - 1];
      const prog = p.info.progression;
      return {
        id: p.info.username, name: p.info.name,
        color: p.info.bodyColor || '#00ff00',
        hat: p.info.hat || 'none', hatAnim: p.info.hatAnim || 'none', hatDrawing: p.info.hatDrawing || [],
        level: prog ? prog.level : 1, xp: p.xp, botLevel: xpToBotLevel(p.xp),
        seed, bot: false, username: p.info.username,
      };
    }
    return bots[seed - sorted.length - 1];
  };

  const ordered = seedOrder.map(entrantBySeed);
  const m = (a, b, round, slot) => ({ round, slot, a, b, winsA: 0, winsB: 0, winner: null, status: 'upcoming' });
  return [
    [m(ordered[0], ordered[1], 0, 0), m(ordered[2], ordered[3], 0, 1), m(ordered[4], ordered[5], 0, 2), m(ordered[6], ordered[7], 0, 3)],
    [{ round:1, slot:0, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }, { round:1, slot:1, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }],
    [{ round:2, slot:0, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }],
  ];
}

function tryStartTournament(lobby) {
  if (lobby.players.length < 2 || !lobby.players.every(p => p.ready)) return;
  lobby.status = 'starting';
  const rounds = buildTournBracket(lobby);
  const msg = JSON.stringify({
    type: 'tournament_start',
    bracketId: lobby.bracketId,
    bracketName: lobby.name,
    rounds,
    participants: lobby.players.map(p => ({ username: p.info.username, seed: p.seed })),
  });
  lobby.players.forEach(({ ws }) => { if (ws.readyState === 1) ws.send(msg); });
  setTimeout(() => { tournamentLobbies.delete(lobby.bracketId); }, 10000);
}

function handleTournamentJoin(ws, info, msg) {
  if (!info.userId) { send(ws, { type: 'tournament_error', error: 'Sign in to join tournaments.' }); return; }
  const bracketId = String(msg.bracketId || '').slice(0, 20);
  const lobby = getTournLobby(bracketId);
  if (!lobby) { send(ws, { type: 'tournament_error', error: 'Invalid bracket.' }); return; }
  if (lobby.status !== 'waiting') { send(ws, { type: 'tournament_error', error: 'This bracket already started.' }); return; }
  const level = info.progression ? info.progression.level : 1;
  if (level < lobby.minLevel || level > lobby.maxLevel) {
    send(ws, { type: 'tournament_error', error: 'Your level (' + level + ') doesn\'t qualify for this bracket (L' + lobby.minLevel + '-' + lobby.maxLevel + ').' });
    return;
  }
  if (lobby.players.find(p => p.info.userId === info.userId)) { broadcastTournLobby(lobby); return; }
  if (lobby.players.length >= TOURN_SIZE) { send(ws, { type: 'tournament_error', error: 'This bracket is full.' }); return; }
  handleTournamentLeave(ws, info);
  const xp = info.progression ? (info.progression.xp || 0) : 0;
  lobby.players.push({ ws, info, xp, level, ready: false, seed: null });
  info.tournamentBracket = bracketId;
  broadcastTournLobby(lobby);
}

function handleTournamentReady(ws, info) {
  const bracketId = info.tournamentBracket;
  if (!bracketId) return;
  const lobby = tournamentLobbies.get(bracketId);
  if (!lobby || lobby.status !== 'waiting') return;
  const p = lobby.players.find(x => x.ws === ws);
  if (!p) return;
  p.ready = !p.ready;
  broadcastTournLobby(lobby);
  tryStartTournament(lobby);
}

function handleTournamentLeave(ws, info) {
  const bracketId = info.tournamentBracket;
  if (!bracketId) return;
  const lobby = tournamentLobbies.get(bracketId);
  if (lobby) {
    lobby.players = lobby.players.filter(x => x.ws !== ws);
    if (lobby.players.length === 0) tournamentLobbies.delete(bracketId);
    else broadcastTournLobby(lobby);
  }
  info.tournamentBracket = null;
}

  Object.assign(ctx, { handleTournamentJoin, handleTournamentReady, handleTournamentLeave });
};

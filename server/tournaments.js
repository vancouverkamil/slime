module.exports = function install(ctx) {
  const { app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES, newBall, newSlime, initRound, tick, send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, getPublicPlayer, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat, broadcastSlimeverse, leaveSlimeverse, enterSlimeverse, slimeverseSnapshot, chatAllowed, parseCookies, getReqToken, handleCustomize, relayChat, handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, startRoomGame, rankedQueue } = ctx;
const TOURN_BRACKETS = [
  { id: 'rookie', name: 'Rookie Cup', minLevel: 1, maxLevel: 15 }, { id: 'challenger', name: 'Challenger Cup', minLevel: 16, maxLevel: 35 },
  { id: 'elite', name: 'Elite Cup', minLevel: 36, maxLevel: 60 }, { id: 'master', name: 'Master Cup', minLevel: 61, maxLevel: 100 },
];
const TOURN_SIZE = 8;
const TOURN_BOT_ROSTER = [
  { name: 'Rust Belly', color: '#a95522', xp: 150 }, { name: 'Static Slime', color: '#55ccff', xp: 800 },
  { name: 'Mire Unit', color: '#5b7f2a', xp: 1800 }, { name: 'Tar Pit', color: '#363036', xp: 3500 },
  { name: 'Ghost Gel', color: '#eeeeff', xp: 5500 }, { name: 'Scarlet Vex', color: '#ff335f', xp: 9000 },
  { name: 'Hazard King', color: '#ffb000', xp: 15000 }, { name: 'Iron Maw', color: '#8899bb', xp: 400 },
];

const tournamentLobbies = new Map();
const activeTournaments = new Map();

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
    tournamentLobbies.set(bracketId, { bracketId, name: def.name, minLevel: def.minLevel, maxLevel: def.maxLevel, players: [], status: 'waiting' });
  }
  return tournamentLobbies.get(bracketId);
}

function broadcastTournLobby(lobby) {
  const msg = JSON.stringify({ type: 'tournament_lobby', bracketId: lobby.bracketId, bracketName: lobby.name, minLevel: lobby.minLevel, maxLevel: lobby.maxLevel,
    players: lobby.players.map(p => ({ username: p.info.username, name: p.info.name, level: p.info.progression ? p.info.progression.level : 1, xp: p.xp, ready: p.ready, color: p.info.bodyColor || '#00ff00' })),
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
  const m = (a, b, round, slot) => ({ id:'r'+round+'m'+slot, round, slot, a, b, winsA: 0, winsB: 0, winner: null, status: 'upcoming' });
  return [
    [m(ordered[0], ordered[1], 0, 0), m(ordered[2], ordered[3], 0, 1), m(ordered[4], ordered[5], 0, 2), m(ordered[6], ordered[7], 0, 3)],
    [{ round:1, slot:0, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }, { round:1, slot:1, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }],
    [{ round:2, slot:0, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }],
  ];
}

function tryStartTournament(lobby) {
  if (lobby.players.length < 2 || !lobby.players.every(p => p.ready)) return;
  lobby.status = 'active'; lobby.rounds = buildTournBracket(lobby); lobby.champion = null;
  activeTournaments.set(lobby.bracketId, lobby);
  broadcastTournState(lobby); tickTourn(lobby);
}

function tournClients(lobby) { return [...allClients].filter(([,i]) => i.tournamentBracket === lobby.bracketId); }
function broadcastTournState(lobby) {
  const msg = JSON.stringify({ type:'tournament_update', bracketId:lobby.bracketId, bracketName:lobby.name, rounds:lobby.rounds, champion:lobby.champion, now:Date.now() });
  tournClients(lobby).forEach(([ws]) => { if (ws.readyState === 1) ws.send(msg); });
}
function advance(lobby, match) {
  const nextRound = lobby.rounds[match.round + 1];
  if (!nextRound) { lobby.champion = match.winner; broadcastTournState(lobby); return; }
  const next = nextRound[Math.floor(match.slot / 2)];
  if (match.slot % 2 === 0) next.a = match.winner; else next.b = match.winner;
  next.status = next.a && next.b ? 'upcoming' : 'waiting';
}
function resolveMatch(lobby, match, winner, loser) {
  if (!match || match.status === 'final') return;
  match.winner = winner; match.status = 'final'; match.winsA = winner === match.a ? 2 : Math.max(match.winsA || 0, 0); match.winsB = winner === match.b ? 2 : Math.max(match.winsB || 0, 0);
  if (loser) loser.disqualified = !!loser.username; advance(lobby, match); broadcastTournState(lobby); setTimeout(() => tickTourn(lobby), 800);
}
function scoreBot(match) {
  const ax = (match.a.xp || 0) + (match.a.botLevel || match.a.level || 1) * 700, bx = (match.b.xp || 0) + (match.b.botLevel || match.b.level || 1) * 700;
  const salt = (match.id + ':' + match.a.id + ':' + match.b.id).split('').reduce((n,c)=>n+c.charCodeAt(0),0);
  return ax + (salt % 900) >= bx + ((salt * 7) % 900) ? match.a : match.b;
}
function tickTourn(lobby) {
  if (!lobby || lobby.champion) return; const now = Date.now();
  for (const round of lobby.rounds) for (const match of round) {
    if (match.status === 'awaiting' && match.acceptDeadline && now > match.acceptDeadline) {
      const aOk = !match.a.username || match.acceptedA, bOk = !match.b.username || match.acceptedB;
      return resolveMatch(lobby, match, aOk && !bOk ? match.a : match.b, aOk && !bOk ? match.b : match.a);
    }
    if (match.status === 'bot_live' && now > match.resolveAt) return resolveMatch(lobby, match, scoreBot(match), null);
    if (match.status !== 'upcoming' || !match.a || !match.b) continue;
    if (!match.a.username && !match.b.username) { match.status = 'bot_live'; match.resolveAt = now + 8000; broadcastTournState(lobby); return setTimeout(() => tickTourn(lobby), 8200); }
    match.status = 'awaiting'; match.acceptDeadline = now + 60000; match.acceptedA = !match.a.username; match.acceptedB = !match.b.username; broadcastTournState(lobby); sendAccepts(lobby, match); return setTimeout(() => tickTourn(lobby), 61000);
  }
}
function sendAccepts(lobby, match) {
  tournClients(lobby).forEach(([ws, info]) => {
    if (info.username === (match.a && match.a.username) || info.username === (match.b && match.b.username))
      send(ws, { type:'tournament_match_ready', bracketId:lobby.bracketId, bracketName:lobby.name, rounds:lobby.rounds, champion:lobby.champion, matchId:match.id, deadline:match.acceptDeadline });
  });
}
function findMatch(lobby, id) { for (const r of lobby.rounds) for (const m of r) if (m.id === id) return m; return null; }

function handleTournamentJoin(ws, info, msg) {
  if (!info.userId) { send(ws, { type: 'tournament_error', error: 'Sign in to join tournaments.' }); return; }
  const bracketId = String(msg.bracketId || '').slice(0, 20);
  const lobby = getTournLobby(bracketId);
  if (!lobby) { send(ws, { type: 'tournament_error', error: 'Invalid bracket.' }); return; }
  if (lobby.status === 'active') { info.tournamentBracket = bracketId; broadcastTournState(lobby); return; }
  if (lobby.status !== 'waiting') { send(ws, { type: 'tournament_error', error: 'This bracket already started.' }); return; }
  const level = info.progression ? info.progression.level : 1;
  if (level < lobby.minLevel || level > lobby.maxLevel) { send(ws, { type: 'tournament_error', error: 'Your level (' + level + ') doesn\'t qualify for this bracket (L' + lobby.minLevel + '-' + lobby.maxLevel + ').' }); return; }
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
function handleTournamentAccept(ws, info, msg) {
  const lobby = activeTournaments.get(info.tournamentBracket); if (!lobby) return;
  const match = findMatch(lobby, msg.matchId); if (!match || match.status !== 'awaiting') return;
  if (match.a && match.a.username === info.username) match.acceptedA = true;
  if (match.b && match.b.username === info.username) match.acceptedB = true;
  if (match.acceptedA && match.acceptedB) { match.status = 'live'; match.acceptDeadline = 0; }
  broadcastTournState(lobby);
}
function handleTournamentResult(ws, info, msg) {
  const lobby = activeTournaments.get(info.tournamentBracket); if (!lobby) return;
  const match = findMatch(lobby, msg.matchId); if (!match || match.status === 'final') return;
  if (!match.a || !match.b || (match.a.username !== info.username && match.b.username !== info.username)) return;
  const won = !!msg.won, meA = match.a.username === info.username;
  if (won === meA) match.winsA++; else match.winsB++;
  match.status = match.winsA >= 2 || match.winsB >= 2 ? 'final' : 'awaiting';
  if (match.status === 'final') resolveMatch(lobby, match, match.winsA >= 2 ? match.a : match.b, null);
  else { match.status = 'live'; match.acceptDeadline = 0; broadcastTournState(lobby); }
}
function handleTournamentScore(ws, info, msg) {
  const lobby = activeTournaments.get(info.tournamentBracket); if (!lobby) return; const match = findMatch(lobby, msg.matchId);
  const meA = match && match.a && match.a.username === info.username, meB = match && match.b && match.b.username === info.username; if (!match || match.status === 'final' || (!meA && !meB)) return;
  match.scoreA = Math.max(0, Math.min(WIN_AMOUNT, Number(meA ? msg.scoreFor : msg.scoreAgainst) || 0)); match.scoreB = Math.max(0, Math.min(WIN_AMOUNT, Number(meA ? msg.scoreAgainst : msg.scoreFor) || 0)); broadcastTournState(lobby);
}

  Object.assign(ctx, { handleTournamentJoin, handleTournamentReady, handleTournamentLeave, handleTournamentAccept, handleTournamentResult, handleTournamentScore });
};

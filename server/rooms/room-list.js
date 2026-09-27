// The persistent Quick Play rooms: ten per visible map.
const ROOM_NAMES = [
  'Sky Court', 'Cave Court', 'Sunset Court', 'Storm Court',
  'Jungle Court', 'Frozen Court', 'Desert Court', 'Neon Court',
  'Space Court', 'Volcano Court', 'Ocean Court',
  'Overpass Court', 'Bunker Court', 'Reactor Court', 'Void Court',
  'Championship Court',
];
const QUICKPLAY_MAP_IDS = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 15];
const LOBBIES_PER_MAP = 10;

function createRooms() {
  return QUICKPLAY_MAP_IDS.flatMap((mapId) =>
    Array.from({ length: LOBBIES_PER_MAP }, (_, lobbyIndex) => ({
      id: mapId * LOBBIES_PER_MAP + lobbyIndex,
      mapId,
      lobbyIndex,
      name: ROOM_NAMES[mapId],
      players:          [], // [{ ws, info }], max 2
      spectators:       [], // [{ ws, info }], unlimited
      state:            null,
      interval:         null,
      phase:            'empty', // 'empty' | 'waiting' | 'playing'
      pendingReconnect: null,    // { side, userId, rejoinToken, timer, resumeGame }
    })));
}

module.exports = { createRooms, ROOM_NAMES, QUICKPLAY_MAP_IDS, LOBBIES_PER_MAP };

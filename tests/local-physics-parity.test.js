const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { newBall, newSlime, initRound, tick } = require('../physics');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

function makeServerState(mapId) {
  const state = {
    ball: newBall(),
    slimeLeft: newSlime(true),
    slimeRight: newSlime(false),
    inputLeft: { movement: 0, jump: false },
    inputRight: { movement: 0, jump: false },
    mapId,
  };
  initRound(state, true);
  return state;
}

function makeClientContext(mapId) {
  const context = {
    console,
    Math,
    Date,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: { getElementById() { return null; } },
    lobbySocket: null,
    screenFxEnabled: false,
    keysDown: {},
    KEY_A: 65,
    KEY_D: 68,
    KEY_W: 87,
    KEY_LEFT: 37,
    KEY_RIGHT: 39,
    KEY_UP: 38,
    playSfx() {},
    spawnParticles() {},
    endPoint() {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/client-state.js', 'utf8'), context);
  context.onePlayer = false;
  context.localMapId = mapId;
  context.ball = { x: 200, y: 356, velocityX: 0, velocityY: 0, radius: 25 };
  context.slimeLeft = { x: 200, y: 0, velocityX: 0, velocityY: 0, radius: 100 };
  context.slimeRight = { x: 800, y: 0, velocityX: 0, velocityY: 0, radius: 100 };
  return context;
}

function setClientKeys(context, leftInput, rightInput) {
  context.keysDown = {};
  if (leftInput.movement === 1) context.keysDown[context.KEY_A] = true;
  if (leftInput.movement === 2) context.keysDown[context.KEY_D] = true;
  if (leftInput.jump) context.keysDown[context.KEY_W] = true;
  if (rightInput.movement === 1) context.keysDown[context.KEY_LEFT] = true;
  if (rightInput.movement === 2) context.keysDown[context.KEY_RIGHT] = true;
  if (rightInput.jump) context.keysDown[context.KEY_UP] = true;
}

function snapshotServer(state) {
  return {
    ball: { x: state.ball.x, y: state.ball.y, velocityX: state.ball.velocityX, velocityY: state.ball.velocityY },
    slimeLeft: { x: state.slimeLeft.x, y: state.slimeLeft.y, velocityX: state.slimeLeft.velocityX, velocityY: state.slimeLeft.velocityY },
    slimeRight: { x: state.slimeRight.x, y: state.slimeRight.y, velocityX: state.slimeRight.velocityX, velocityY: state.slimeRight.velocityY },
  };
}

function snapshotClient(context) {
  return {
    ball: { x: context.ball.x, y: context.ball.y, velocityX: context.ball.velocityX, velocityY: context.ball.velocityY },
    slimeLeft: { x: context.slimeLeft.x, y: context.slimeLeft.y, velocityX: context.slimeLeft.velocityX, velocityY: context.slimeLeft.velocityY },
    slimeRight: { x: context.slimeRight.x, y: context.slimeRight.y, velocityX: context.slimeRight.velocityX, velocityY: context.slimeRight.velocityY },
  };
}

function runParity(mapId) {
  const server = makeServerState(mapId);
  const client = makeClientContext(mapId);
  const inputs = [
    [{ movement: 2, jump: true }, { movement: 1, jump: true }],
    [{ movement: 2, jump: false }, { movement: 1, jump: false }],
    [{ movement: 0, jump: false }, { movement: 0, jump: false }],
    [{ movement: 1, jump: false }, { movement: 2, jump: false }],
    [{ movement: 1, jump: true }, { movement: 2, jump: true }],
  ];

  for (let frame = 0; frame < 80; frame++) {
    const [left, right] = inputs[frame % inputs.length];
    server.inputLeft = { ...left };
    server.inputRight = { ...right };
    setClientKeys(client, left, right);
    tick(server);
    vm.runInContext('updateFrame()', client);
    assert.deepStrictEqual(snapshotClient(client), snapshotServer(server), `frame ${frame}`);
  }
}

test('local quickplay ball physics matches server/shared physics on standard courts', () => {
  runParity(null);
});

test('local quickplay ball physics matches server/shared physics on barrier courts', () => {
  runParity(11);
});

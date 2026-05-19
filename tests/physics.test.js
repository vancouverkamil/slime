const assert = require('assert');
const { newBall, newSlime, initRound, tick } = require('../physics');

function newState(mapId) {
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

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

test('initRound positions left serve exactly', () => {
  const state = newState();
  assert.deepStrictEqual(
    {
      ball: { x: state.ball.x, y: state.ball.y, velocityX: state.ball.velocityX, velocityY: state.ball.velocityY },
      left: { x: state.slimeLeft.x, y: state.slimeLeft.y, velocityX: state.slimeLeft.velocityX, velocityY: state.slimeLeft.velocityY },
      right: { x: state.slimeRight.x, y: state.slimeRight.y, velocityX: state.slimeRight.velocityX, velocityY: state.slimeRight.velocityY },
    },
    {
      ball: { x: 200, y: 356, velocityX: 0, velocityY: 0 },
      left: { x: 200, y: 0, velocityX: 0, velocityY: 0 },
      right: { x: 800, y: 0, velocityX: 0, velocityY: 0 },
    }
  );
});

test('initRound positions right serve exactly', () => {
  const state = newState();
  initRound(state, false);
  assert.strictEqual(state.ball.x, 800);
  assert.strictEqual(state.ball.y, 356);
});

test('left slime movement and jump use current frame values', () => {
  const state = newState();
  state.inputLeft.movement = 1;
  state.inputLeft.jump = true;

  tick(state);

  assert.strictEqual(state.slimeLeft.x, 192);
  assert.strictEqual(state.slimeLeft.y, 29);
  assert.strictEqual(state.slimeLeft.velocityX, -8);
  assert.strictEqual(state.slimeLeft.velocityY, 29);
  assert.strictEqual(state.inputLeft.jump, false);
});

test('slimes stay inside their court bounds', () => {
  const state = newState();
  state.slimeLeft.x = 51;
  state.slimeRight.x = 949;
  state.inputLeft.movement = 1;
  state.inputRight.movement = 2;

  tick(state);

  assert.strictEqual(state.slimeLeft.x, 50);
  assert.strictEqual(state.slimeRight.x, 950);
});

test('side wall bounce preserves scoring state', () => {
  const state = newState();
  state.ball.x = 990;
  state.ball.y = 300;
  state.ball.velocityX = 10;
  state.ball.velocityY = 0;

  const result = tick(state);

  assert.strictEqual(result, 0);
  assert.strictEqual(state.ball.x, 985);
  assert.strictEqual(state.ball.velocityX, -10);
});

test('net top bounce matches legacy values', () => {
  const state = newState();
  state.ball.x = 500;
  state.ball.y = 140;
  state.ball.velocityX = 0;
  state.ball.velocityY = -5;

  const result = tick(state);

  assert.strictEqual(result, 0);
  assert.strictEqual(state.ball.y, 130);
  assert.strictEqual(state.ball.velocityY, 6);
});

test('ground contact scores for the opposite side', () => {
  const state = newState();
  state.ball.x = 700;
  state.ball.y = 0;
  state.ball.velocityY = -5;

  assert.strictEqual(tick(state), 1);

  state.ball.x = 300;
  state.ball.y = 0;
  state.ball.velocityY = -5;

  assert.strictEqual(tick(state), 2);
});

test('special map barriers bounce the ball', () => {
  const state = newState(11);
  state.ball.x = 200;
  state.ball.y = 240;
  state.ball.velocityX = 0;
  state.ball.velocityY = -5;

  const result = tick(state);

  assert.strictEqual(result, 0);
  assert.strictEqual(state.ball.y, 257);
  assert.strictEqual(state.ball.velocityY, 6);
});

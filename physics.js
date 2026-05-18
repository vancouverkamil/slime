// Server-side physics — pure JS, no browser APIs
Math.trunc = Math.trunc || function(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); };

const gameWidth  = 1000;
const gameHeight = 1000;
const MAX_VELOCITY_X = 15;
const MAX_VELOCITY_Y = 22;
const FUDGE = 5;

function newBall() {
  return { x: 0, y: 0, velocityX: 0, velocityY: 0, radius: 25 };
}

function newSlime(onLeft) {
  return { x: 0, y: 0, velocityX: 0, velocityY: 0, radius: 100, onLeft };
}

function initRound(state, leftServes) {
  state.ball.x = leftServes ? 200 : 800;
  state.ball.y = 356;
  state.ball.velocityX = 0;
  state.ball.velocityY = 0;
  state.slimeLeft.x  = 200; state.slimeLeft.y  = 0;
  state.slimeLeft.velocityX  = 0; state.slimeLeft.velocityY  = 0;
  state.slimeRight.x = 800; state.slimeRight.y = 0;
  state.slimeRight.velocityX = 0; state.slimeRight.velocityY = 0;
}

function applyInput(s, input) {
  if      (input.movement === 1) s.velocityX = -8;
  else if (input.movement === 2) s.velocityX =  8;
  else                           s.velocityX =  0;
  if (input.jump && s.y === 0) s.velocityY = 31;
}

function stepSlime(s, leftLimit, rightLimit) {
  if (s.velocityX !== 0) {
    s.x += s.velocityX;
    if (s.x < leftLimit) s.x = leftLimit;
    else if (s.x > rightLimit) s.x = rightLimit;
  }
  if (s.velocityY !== 0 || s.y > 0) {
    s.velocityY -= 2;
    s.y += s.velocityY;
    if (s.y < 0) { s.y = 0; s.velocityY = 0; }
  }
}

function collide(ball, s) {
  const dx   = 2 * (ball.x - s.x);
  const dy   = ball.y - s.y;
  const dist = Math.trunc(Math.sqrt(dx * dx + dy * dy));
  if (dy <= 0 || dist >= ball.radius + s.radius || dist <= FUDGE) return;

  ball.x = s.x + Math.trunc(Math.trunc((s.radius + ball.radius) / 2) * dx / dist);
  ball.y = s.y + Math.trunc((s.radius + ball.radius) * dy / dist);

  const dvx = ball.velocityX - s.velocityX;
  const dvy = ball.velocityY - s.velocityY;
  const dot = Math.trunc((dx * dvx + dy * dvy) / dist);
  if (dot <= 0) {
    ball.velocityX += Math.trunc(s.velocityX - 2 * dx * dot / dist);
    ball.velocityY += Math.trunc(s.velocityY - 2 * dy * dot / dist);
    if (ball.velocityX < -MAX_VELOCITY_X) ball.velocityX = -MAX_VELOCITY_X;
    else if (ball.velocityX >  MAX_VELOCITY_X) ball.velocityX =  MAX_VELOCITY_X;
    if (ball.velocityY < -MAX_VELOCITY_Y) ball.velocityY = -MAX_VELOCITY_Y;
    else if (ball.velocityY >  MAX_VELOCITY_Y) ball.velocityY =  MAX_VELOCITY_Y;
  }
}

// Returns 0 = no score, 1 = left scores, 2 = right scores
function stepBall(state) {
  const ball = state.ball;
  ball.velocityY = Math.max(ball.velocityY - 1, -MAX_VELOCITY_Y);
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  collide(ball, state.slimeLeft);
  collide(ball, state.slimeRight);

  if (ball.x < 15)  { ball.x = 15;  ball.velocityX = -ball.velocityX; }
  else if (ball.x > 985) { ball.x = 985; ball.velocityX = -ball.velocityX; }

  if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
    if (ball.velocityY < 0 && ball.y > 130) {
      ball.velocityY *= -1; ball.y = 130;
    } else if (ball.x < 500) {
      ball.x = 480;
      ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX;
    } else {
      ball.x = 520;
      ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX;
    }
  }

  if (ball.y < 0) return ball.x > 500 ? 1 : 2;
  return 0;
}

function tick(state) {
  applyInput(state.slimeLeft,  state.inputLeft);
  applyInput(state.slimeRight, state.inputRight);
  state.inputLeft.jump  = false;
  state.inputRight.jump = false;
  stepSlime(state.slimeLeft,  50,  445);
  stepSlime(state.slimeRight, 555, 950);
  return stepBall(state);
}

module.exports = { newBall, newSlime, initRound, tick, gameWidth, gameHeight };

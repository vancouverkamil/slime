// ── Mental Slime AI — The Final 4 ────────────────────────────────────────────
// Standalone file. Does not touch SlimeAI.js.

function setMentalSlime(ai, level) {
  level = level || 1;
  ai.level = level;
  ai.state = -1;

  // Simulate ball physics to find landing X when ball reaches yLimit
  ai.precisePredict = function(yLimit) {
    var x  = this.ballToEnemyWall;
    var vx = this.ballVXToEnemyWall;
    var y  = ball.y;
    var vy = ball.velocityY;
    for (var i = 0; i < 400; i++) {
      vy = Math.max(vy - 1, -22);
      y  += vy;
      x  += vx;
      if      (x < 0)    { x = -x;        vx = -vx; }
      else if (x > 1000) { x = 2000 - x;  vx = -vx; }
      if (y <= yLimit) return x;
    }
    return x;
  };

  // Choose where to aim based on enemy (player) position
  ai.readEnemy = function() {
    var epos = this.enemyToTheirWall; // player's distance from their left wall
    if (epos < 150) return 645;        // player is deep → aim short near net
    if (epos > 380) return 888;        // player is near net → spike deep to wall
    if (level >= 3)  return epos > 265 ? 872 : 652;
    return 750;
  };

  // Positional error margin (px) — shrinks with level
  ai.margin = [18, 9, 4, 1][level - 1];

  ai.moveLogic = function(me, enemy) {
    // ── Serve detection ───────────────────────────────────────
    if (this.ballVXToEnemyWall === 0 && this.ballToEnemyWall === 800) {
      if (this.state === -1) this.state = this.pickServe();
    }
    if (this.state >= 20) { this.doServe(me); return; }
    if (this.state !== -1 && this.ballToEnemyWall < 500) this.state = -1;
    if (this.state !== -1) { this.doServe(me); return; }

    // ── Ball on enemy's side — pre-position ───────────────────
    if (this.ballToEnemyWall < 500) {
      var aimX = this.readEnemy();
      var m = this.margin * 1.6;
      if      (Math.abs(this.meToEnemyWall - aimX) < m) this.stopMovement();
      else if (aimX < this.meToEnemyWall)                this.moveToNet();
      else                                               this.moveToWall();
      return;
    }

    // ── Ball on my side — intercept and redirect ───────────────
    var landY = me.y + me.velocityY + 22;
    var landX = this.precisePredict(landY);
    var m2    = this.margin;

    if      (Math.abs(this.meToEnemyWall - landX) < m2) this.stopMovement();
    else if (landX < this.meToEnemyWall)                 this.moveToNet();
    else                                                 this.moveToWall();

    this.decideJump(me);
  };

  ai.decideJump = function(me) {
    var chance = [0.62, 0.78, 0.92, 0.98][level - 1];

    // Proximity-based hit
    var dsq = Math.pow(this.ballToEnemyWall - this.meToEnemyWall, 2) * 2 +
              Math.pow(ball.y - me.y, 2);
    if (dsq < Math.pow(195, 2) && Math.random() < chance) { this.jump(); return; }

    // Wall spike: back up and smash
    if (this.meToEnemyWall >= 858 && this.ballToEnemyWall > 818 &&
        level >= 2 && Math.random() < chance) { this.jump(); return; }

    // Net stuff: rush and tip ball straight down
    if (this.meToEnemyWall <= 592 && this.ballToEnemyWall < 562 &&
        Math.abs(this.ballToEnemyWall - this.meToEnemyWall) < 85 &&
        Math.random() < chance) { this.jump(); return; }

    // Height-based opportunistic jump
    if (Math.abs(this.ballToEnemyWall - this.meToEnemyWall) < 165 &&
        ball.y > 55 && ball.y < 310 && Math.random() < chance * 0.88) {
      this.jump(); return;
    }

    // Level 3+: proactive spike setup
    if (level >= 3 && this.meToEnemyWall >= 840 && ball.y < 200 &&
        this.ballToEnemyWall > 775 && Math.random() < 0.75) { this.jump(); return; }

    // Level 4: emergency net denial — don't let anything through the net
    if (level >= 4 && this.meToEnemyWall <= 578 && ball.y < 190 &&
        this.ballToEnemyWall > 530 && Math.random() < 0.88) { this.jump(); }
  };

  ai.pickServe = function() {
    var n = Math.min(level + 1, 5); // more patterns unlocked at higher levels
    return 20 + Math.trunc(Math.random() * n);
  };

  ai.doServe = function(me) {
    var s = this.state;

    if (s === 20) {
      // Turbo wall spike — backs up all the way, hammers ball flat across court
      var j = level >= 3 ? 878 : 857;
      if (ball.velocityY > 10 && this.meToEnemyWall < j)        this.moveToWall();
      if (this.meToEnemyWall >= j)                               this.stopMovement();
      if (ball.velocityY === -3 && this.meToEnemyWall !== 800)   this.jump();
      if (ball.velocityY < -10 && me.y > 0 && this.meToEnemyWall >= j - 15) this.moveToNet();
      if (this.ballToEnemyWall < 700) this.state = -1;
      return;
    }

    if (s === 21) {
      // Net rush — charges the net and tips ball straight down
      var lim = level >= 3 ? 556 : 570;
      if (ball.velocityY > 10 && this.meToEnemyWall > lim) this.moveToNet();
      if (this.meToEnemyWall <= lim)                        this.stopMovement();
      if (ball.velocityY === -2 && this.meToEnemyWall !== 800) this.jump();
      if (me.y > 0 && this.ballToEnemyWall > 815)           this.state = 25; // follow-through
      if (this.ballToEnemyWall < 700) this.state = -1;
      return;
    }

    if (s === 22) {
      // Float lob — soft pop, ball drifts slowly, hard to read timing
      if (ball.velocityY > 7 && this.meToEnemyWall < 828)   this.moveToWall();
      if (this.meToEnemyWall >= 828)                         this.stopMovement();
      if (ball.velocityY === -1)                             this.jump();
      if (this.ballToEnemyWall < 700) this.state = -1;
      return;
    }

    if (s === 23) {
      // Quick snap — jumps early on ball's ascent, produces a fast shallow shot
      if (ball.velocityY > 15 && this.meToEnemyWall < 850)  this.moveToWall();
      if (this.meToEnemyWall >= 850)                         this.stopMovement();
      if (ball.velocityY === -4)                             this.jump();
      if (this.ballToEnemyWall < 700) this.state = -1;
      return;
    }

    if (s === 24) {
      // Read-and-exploit — reads enemy position, spikes to the open spot
      var aimJ = this.enemyToTheirWall > 300 ? 882 : 648;
      if (ball.velocityY > 10 && this.meToEnemyWall < aimJ)        this.moveToWall();
      if (Math.abs(this.meToEnemyWall - aimJ) < 10)                this.stopMovement();
      else if (this.meToEnemyWall > aimJ)                          this.moveToNet();
      if (ball.velocityY === -3 && this.meToEnemyWall !== 800)     this.jump();
      if (this.ballToEnemyWall < 700) this.state = -1;
      return;
    }

    if (s === 25) {
      // Net rush follow-through — tight net position after aerial contact
      if (this.meToEnemyWall > 575)   this.moveToNet();
      if (this.meToEnemyWall <= 575)  this.stopMovement();
      if (this.ballToEnemyWall <= 732) this.jump();
      if (this.ballToEnemyWall < 558) this.state = -1;
      return;
    }
  };
}

// ── The Final 4 — Boss Roster ─────────────────────────────────────────────────
var final4AIs = [
  {
    name:          'The Phantom',
    color:         '#88ccff',
    mapId:         5,           // Frozen Court — eerie and cold
    newGroundColor:'#0a1520',
    backTextColor: '#88ccff',
    level:         1,
  },
  {
    name:          'The Predator',
    color:         '#ff6622',
    mapId:         9,           // Volcano Court — brutal heat
    newGroundColor:'#200400',
    backTextColor: '#ff6622',
    level:         2,
  },
  {
    name:          'The Trickster',
    color:         '#cc00ff',
    mapId:         3,           // Storm Court — chaotic and disorienting
    newGroundColor:'#0d0820',
    backTextColor: '#cc00ff',
    level:         3,
  },
  {
    name:          'Mental Slime',
    color:         '#ff0033',
    mapId:         7,           // Neon Court — final boss energy
    newGroundColor:'#060010',
    backTextColor: '#ff0033',
    level:         4,
  },
];

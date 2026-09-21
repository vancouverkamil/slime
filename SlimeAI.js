// Make sure Math.trunc is defined (for older browsers)
Math.trunc = Math.trunc || function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
}

// Assumes gravity is -1 per frame
function countFramesTillBelow(y, vy, limit) {
  for(var count = 0; 1; count++) {
    vy--;
    y += vy;
    if(y <= limit)
      return count;
  }
}

// Assumes that gameWidth, gameHeight, ball, slimeLeft and slimeRight are globals
function newSlimeAI(onLeft,name) {
  return {
    name              : name,

    onLeft            : onLeft,

    // ouptut after move
    movement          : 0, // 0=none, 1=toNet, 2=toWall
    jumpSet           : 0, // slime wants to jump

    // input to moveLogic
    meToEnemyWall     : 0, // distance from me to the enemy's wall
    enemyToTheirWall  : 0, // enemy distance to their wall

    ballToEnemyWall   : 0, // distance from ball to the enemy's wall
    ballVXToEnemyWall : 0, // ball velocity to the enemy's wall in x direction

    move : function () {
      this.jumpSet = false; // reset the jump
      if(this.onLeft) {
        this.meToEnemyWall     = gameWidth - slimeLeft.x;
        this.enemyToTheirWall  = gameWidth - slimeRight.x;

	this.ballToEnemyWall   = gameWidth - ball.x;
	this.ballVXToEnemyWall = -ball.velocityX;
	moveLogic(slimeLeft,slimeRight);
      } else {
        this.meToEnemyWall     = slimeRight.x;
        this.enemyToTheirWall  = slimeLeft.x;

	this.ballToEnemyWall   = ball.x;
	this.ballVXToEnemyWall = ball.velocityX;
	this.moveLogic(slimeRight,slimeLeft);
      }
    },

    moveLogic : null, // Move logic

    stopMovement : function() {
      this.movement = 0;
    },
    moveToNet : function() {
      //console.log('moveToNet');
      this.movement = 1;
    },
    moveToWall : function() {
      //console.log('moveToWall');
      this.movement = 2;
    },
    jump : function() {
      //console.log('jump');
      this.jumpSet = true;
    },
    calculateXWhenBallBelow : function(yLimit) {
      var frameCount = countFramesTillBelow(ball.y, ball.velocityY, yLimit);
      var toEnemyWall         = this.ballToEnemyWall;
      var velocityToEnemyWall = this.ballVXToEnemyWall;
      for(var i = 0; i < frameCount; i++) {
        toEnemyWall += velocityToEnemyWall;
	if(toEnemyWall < 0) {
	  toEnemyWall = 0;
	  velocityToEnemyWall = -velocityToEnemyWall;
	} else if(toEnemyWall > gameWidth) {
	  toEnemyWall = gameWidth;
	  velocityToEnemyWall = -velocityToEnemyWall;
	}
      }
      return toEnemyWall;
    }
  };
}

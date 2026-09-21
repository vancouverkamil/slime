function setAngryRedSlime(ai) {
  ai.state = -1;

  ai.randomJump40Percent = function() {
    if (Math.random() <= 0.40) {
      this.jump();
    }
  };

  ai.moveLogic = function(me,enemy) {

    if(this.ballToEnemyWall < 500)
      this.state = -1;

    var xWhenBallBelow125 = this.calculateXWhenBallBelow(125);
    var something;
    if(me.y > 0 && this.meToEnemyWall < 575) {
      something = 0;
    } else {
      something = 23 + Math.trunc(15 * Math.random());
    }
    //console.log('xWhenBallBelow125: ' + xWhenBallBelow125 + ', something: ' + something);
    if(this.state != -1 || (this.ballVXToEnemyWall == 0 && this.ballToEnemyWall == 800)) {
      if (this.state == -1) {
        if(this.enemyToTheirWall > 250) {
	  this.state = 0;
	} else if(this.enemyToTheirWall < 200) {
	  this.state = 1;
	} else if(this.enemyToTheirWall < 250) {
	  this.state = 2;
	}
	if(Math.random() < 0.35) {
	  this.state = Math.trunc(3 * Math.random());
	}
      }
      if(this.state == 0) {
        if(ball.y < 300 && ball.velocityY < -3) {
          //console.log("moveToWall 1");
          this.moveToWall();
          this.jump();
        }
      } else if(this.state == 1) {
        if(ball.y < 300 && ball.velocityY < 0) {
          //console.log('moveToNet 1');
          this.moveToNet();
          this.jump();
        }
      } else if(this.state == 2) {
        if(ball.velocityY > 12 && this.meToEnemyWall < 860) {
	  this.moveToWall();
	}
	if(this.meToEnemyWall >= 860) {
	  this.stopMovement();
	}
	if(ball.velocityY == -3 && this.meToEnemyWall != 800) {
	  this.jump();
	}
	if(ball.velocityY < -12 && me.y != 0 && this.meToEnemyWall >= 845) {
	  this.moveToNet();
	}
      }
      return;
    }

    if (xWhenBallBelow125 < 500)
    {
      if (Math.abs(this.meToEnemyWall - 800) < 20) {
        this.stopMovement();
      } else if (this.meToEnemyWall > 800) {
        //console.log('moveToNet 2');
        this.moveToNet();
      //} else if (this.meToEnemyWall < 800) {
      } else {
        //console.log("moveToWall 2");
        this.moveToWall();
      }
      return;
    }
    
    if (Math.abs(this.meToEnemyWall - xWhenBallBelow125) < something)
    {
      if (me.y != 0 || Math.random() < 0.3)
        return;

      if (
	  (this.meToEnemyWall >= 900 && this.ballToEnemyWall > 830) ||
	  (this.meToEnemyWall <= 580 && this.ballToEnemyWall < 530 && Math.abs(this.ballToEnemyWall - this.meToEnemyWall) < 100)
	  ) {
        this.randomJump40Percent();
      } else if ((Math.pow(this.ballToEnemyWall - this.meToEnemyWall, 2) * 2 + Math.pow(ball.y - me.y, 2) < 28900) &&
                 (this.ballToEnemyWall != this.meToEnemyWall)) {
        this.randomJump40Percent();
      } else if ((Math.pow(this.ballVXToEnemyWall, 2) + Math.pow(ball.velocityY, 2) < 20) &&
                 (this.ballToEnemyWall - this.meToEnemyWall < 30) &&
		 (this.ballToEnemyWall != this.meToEnemyWall)) {
        this.randomJump40Percent();
      } else if ((Math.abs(this.ballToEnemyWall - this.meToEnemyWall) < 150) &&
                 (ball.y > 50) && (ball.y < 400) && (Math.random() < 0.5)) {
        this.randomJump40Percent();
      }
    }

    if (this.state == -1) {
      if(me.y == 0) {
        if (Math.abs(this.meToEnemyWall - xWhenBallBelow125) < something) {
	  this.stopMovement();
        } else if (xWhenBallBelow125 + something < this.meToEnemyWall) {
          //console.log('moveToNet 3');
          this.moveToNet();
        } else if (xWhenBallBelow125 + something > this.meToEnemyWall) {
          //console.log("moveToWall 3");
          this.moveToWall();
        }
      } else {
        if (this.meToEnemyWall < 575) {
          return;
        }
        if (this.meToEnemyWall > 900)
        {
          //console.log("moveToWall 4");
	  this.moveToWall();
          return;
        }
        if (Math.abs(this.meToEnemyWall - this.ballToEnemyWall) < something) {
	  this.stopMovement();
        } else if (this.ballToEnemyWall < this.meToEnemyWall) {
          //console.log('moveToNet 4');
	  this.moveToNet();
        } else if (this.ballToEnemyWall > this.meToEnemyWall) {
          //console.log("moveToWall 5");
	  this.moveToWall();
        }
      }
    }

  };
}

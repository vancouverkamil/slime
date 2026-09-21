function setMasterSlime(ai) {
  ai.state = -1;

  ai.randomJump40Percent = function() {
    if (Math.random() <= 0.40) {
      this.jump();
    }
  };
  ai.ballXWhenBelow = function(yLimit) {
    var toEnemyWall         = this.ballToEnemyWall;
    var velocityToEnemyWall = this.ballVXToEnemyWall;
    var ballY = ball.y;
    var ballVelocityY = ball.velocityY;
    while(1) {
      ballVelocityY--;
      ballY += ballVelocityY;
      if(ballY <= yLimit)
        return toEnemyWall;
      toEnemyWall += velocityToEnemyWall;
      if(toEnemyWall <= 0) {
        toEnemyWall = 0;
	velocityToEnemyWall = - velocityToEnemyWall;
      } else if(toEnemyWall >= 1000) {
        toEnemyWall = 1000;
	velocityToEnemyWall = - velocityToEnemyWall;
      }
    }
  }
  ai.performServe = function(me) {
    if(this.state == -1) {
      if(Math.random() < 0.3) {
        if(this.enemyToTheirWall < 30) {
	  this.state = 0;
	} else if(this.enemyToTheirWall > 200) {
	  this.state = 1;
	} else {
	  this.state = 2;
	}
      } else {
        this.state = 2;
      }
      if(Math.random() < 0.3) {
        this.state = Math.trunc(Math.random()*3);
      }
    }

    if(this.state == 0 || this.state == 1) {
      var j = (this.state == 0) ? 860 : 840;
      if(ball.velocityY > 12 && this.meToEnemyWall < j) {
        this.moveToWall();
      }
      if(this.meToEnemyWall > j) {
        this.stopMovement();
      }
      if(ball.velocityY == -3 && this.meToEnemyWall != 800) {
        this.jump();
      }
      if(this.state == 0 && ball.velocityY < -12 && me.y != 0 && this.meToEnemyWall >= j-15) {
        this.moveToNet();
      }
      if(this.ballToEnemyWall < 700) {
        this.state = -1;
      }
    } else if(this.state == 2) {
      var limit = 770;
      if (ball.velocityY > 12 && this.meToEnemyWall > limit) {
        this.moveToNet();
      }
      if (this.meToEnemyWall <= limit) {
        this.stopMovement();
      }
      if (ball.velocityY == -2 && this.meToEnemyWall != 800) {
        this.jump();
      }
      if (me.y != 0 && this.ballToEnemyWall > 800) {
        this.state = 3;
	var prob;
	if(this.enemyToTheirWall < 200) {
	  prob = 0.7;
	} else if(this.enemyToTheirWall > 300) {
	  prob = 0.3;
	} else {
	  prob = 0.5;
	}
	if(Math.random() < prob) {
	  this.state++;
	}
      }
    } else if(this.state == 3) {
      var limit = 585;
      if (this.meToEnemyWall > limit) {
        this.moveToNet();
      }
      if (this.meToEnemyWall <= limit) {
        this.stopMovement();
      }
      if (this.ballToEnemyWall <= 730) {
        this.jump();
      }
      if (this.ballToEnemyWall < 540) {
        this.state = -1;
      }
    } else if(this.state == 4) {
      var limit = 585;
      if (this.meToEnemyWall > limit) {
        this.moveToNet();
      }
      if (this.meToEnemyWall <= limit) {
        this.stopMovement();
      }
      if (this.ballToEnemyWall <= 730) {
        this.jump();
      }
      if (this.ballToEnemyWall < 600) {
        this.moveToWall();
      }
      if (this.ballToEnemyWall < 580) {
        this.stopMovement();
      }
      if (this.ballToEnemyWall < 540) {
        this.state = -1;
      }
    }
  }
  ai.moveLogic = function(me,enemy) {

    if(this.state != -1 || (this.ballToEnemyWall == 800 && this.ballVXToEnemyWall == 0)) {
      this.performServe(me);
      return;
    }
    if(this.ballToEnemyWall < 500)
      this.state = -1;

    var xWhenBallBelowMe = this.ballXWhenBelow(me.y + me.velocityY + 30);

    var something;
    if(xWhenBallBelowMe < 600) {
      something = 0;
    } else if(xWhenBallBelowMe < 700) {
      something = 10;
    } else {
      something = 20;
    }

    if(xWhenBallBelowMe < 450) {
      if (Math.abs(this.meToEnemyWall - 666) < 10) {
        this.stopMovement();
      } else if (666 < this.meToEnemyWall) {
        this.moveToNet();
      } else if (666 > this.meToEnemyWall) {
        this.moveToWall();
      }
    } else if (Math.abs(this.meToEnemyWall - xWhenBallBelowMe - something) < 10) {
      this.stopMovement();
    } else if (xWhenBallBelowMe + something < this.meToEnemyWall) {
      this.moveToNet();
    } else if (xWhenBallBelowMe + something > this.meToEnemyWall) {
      this.moveToWall();
    }

    if ( (this.meToEnemyWall <= 900 || Math.random() >= 0.4) &&
         xWhenBallBelowMe >= 620 &&
	 (ball.y >= 130 || ball.velocityY >= 0) &&
	 (Math.random() >= 0.6)) {

      if ((this.meToEnemyWall >= 900 && this.ballToEnemyWall > 830) ||
          (this.meToEnemyWall <= 580 && this.ballToEnemyWall < 530 &&
	     Math.abs(this.ballToEnemyWall - this.meToEnemyWall) < 100)) {
        this.jump();
      } else if (this.ballToEnemyWall != this.meToEnemyWall && 
        Math.pow(this.ballToEnemyWall - this.meToEnemyWall,2) * 2 + Math.pow(ball.y - me.y,2) < Math.pow(185,2)) {
        this.jump();
      } else if (this.ballToEnemyWall != this.meToEnemyWall &&
        this.ballVXToEnemyWall * this.ballVXToEnemyWall + ball.velocityY * ball.velocityY < 20 &&
        this.ballToEnemyWall - this.meToEnemyWall < 30) {
        this.jump();
      } else if (Math.abs(this.ballToEnemyWall - this.meToEnemyWall) < 150) {
        if ((ball.y > 50) && (ball.y < 250)) {
          this.jump();
        }
      }
    }
  };
}

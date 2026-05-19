function endPoint() {
  if (slimeAI) { keysDown[KEY_UP]=false; keysDown[KEY_RIGHT]=false; keysDown[KEY_LEFT]=false; }
  if (slimeLeftScore  >= WIN_AMOUNT) { endMatch(); return; }
  if (slimeRightScore >= WIN_AMOUNT) { endMatch(); return; }
  endOfPointText = onePlayer
    ? (leftWon ? 'Nice, you got the point!' : slimeAI.name + ' scores!')
    : ('Player ' + (leftWon ? '1':'2') + ' scores!');
  gameState = GAME_STATE_POINT_PAUSE;
  requestAnimationFrame(renderEndOfPoint);
  setTimeout(function() { if (gameState === GAME_STATE_POINT_PAUSE) startNextPoint(); }, 700);
}
function startNextPoint() {
  initRound(leftWon); updatesToPaint = 0; updateCount = 0; gameState = GAME_STATE_RUNNING;
}
function endMatch() {
  gameState = GAME_STATE_SHOW_WINNER;
  clearInterval(gameIntervalObject);
  playSfx(leftWon ? 'win' : 'score');
  var msg;

  if (final4Mode) {
    if (leftWon) {
      sessionWins++;
      final4Index++;
      if (final4Index >= final4AIs.length) {
        final4Mode = false; final4WinPending = true; localMapId = null;
        msg = '<div style="font-size:44px;font-weight:bold;color:#ff3300;text-shadow:0 0 32px rgba(255,60,0,.9),0 0 70px rgba(255,80,0,.4);letter-spacing:5px;margin-bottom:12px;">CHAMPION</div>' +
              '<div style="font-size:13px;color:#ffaa44;letter-spacing:4px;margin-bottom:6px;">THE FINAL 4 CONQUERED</div>' +
              '<div style="font-size:9px;color:rgba(0,255,200,.3);letter-spacing:2px;margin-top:22px;">PRESS SPACE to return to menu</div>';
      } else {
        var nb = final4AIs[final4Index];
        msg = '<div style="font-size:11px;color:#555;letter-spacing:4px;margin-bottom:16px;margin-top:8px;">BOSS DEFEATED</div>' +
              '<div style="font-size:9px;color:#444;letter-spacing:3px;margin-bottom:14px;">NEXT CHALLENGER</div>' +
              '<div style="font-size:22px;font-weight:bold;letter-spacing:3px;color:' + nb.color + ';text-shadow:0 0 14px ' + nb.color + ';margin-bottom:22px;">' + nb.name + '</div>' +
              '<div style="font-size:9px;color:#444;letter-spacing:2px;">PRESS SPACE to face them</div>';
      }
    } else {
      sessionLosses++;
      final4Index = 0;
      msg = '<div style="font-size:32px;font-weight:bold;color:#ff3366;text-shadow:0 0 22px rgba(255,51,102,.8);letter-spacing:3px;margin-bottom:12px;">ELIMINATED</div>' +
            '<div style="font-size:12px;color:#aa4455;letter-spacing:2px;margin-bottom:6px;">by ' + slimeAI.name + '</div>' +
            '<div style="font-size:9px;color:#444;letter-spacing:2px;margin-top:22px;">PRESS SPACE to try again from the start</div>';
    }
    menuDiv.innerHTML = '<div style="text-align:center;padding:52px 20px 20px;">' + msg + '</div>';
    menuDiv.style.display = 'block'; canvas.style.display = 'none'; showBottomBar();
    return;
  }

  if (onePlayer) {
    if (leftWon) {
      recordWin();
      nextSlimeIndex++;
      msg = nextSlimeIndex >= slimeAIs.length
        ? '<h1>You beat everyone!</h1><p>Press space to go again!</p>'
        : '<h1>You won!</h1><p>Press space to continue...</p>';
    } else {
      nextSlimeIndex = 0;
      msg = '<h1>You lost :(</h1><p>Press space to retry...</p>';
    }
  } else {
    msg = '<h1>Player ' + (leftWon ? '1' : '2') + ' Wins!</h1><p>Press space for rematch...</p>';
  }
  menuDiv.innerHTML = '<div style="text-align:center;padding-top:40px;">' + msg + '</div>';
  menuDiv.style.display = 'block'; canvas.style.display = 'none'; showBottomBar();
}
function initRound(server) {
  ball.x = server ? 200 : 800; ball.y = 356; ball.velocityX = 0; ball.velocityY = 0;
  slimeLeft.x  = 200; slimeLeft.y  = 0; slimeLeft.velocityX  = 0; slimeLeft.velocityY  = 0;
  slimeRight.x = 800; slimeRight.y = 0; slimeRight.velocityX = 0; slimeRight.velocityY = 0;
}
function updateWindowSize(w, h) {
  viewWidth = w; viewHeight = h;
  pixelsPerUnitX = w / gameWidth; pixelsPerUnitY = h / gameHeight;
  courtYPix = 4 * viewHeight / 5;
}

// ── bottom bar & leave helpers ────────────────────────────
function showBottomBar() { var b = document.getElementById('BottomBar'); if(b) b.style.display='flex'; }
function hideBottomBar() { var b = document.getElementById('BottomBar'); if(b) b.style.display='none'; }
function showLeaveBtn(v) { var b = document.getElementById('LeaveRoomBtn'); if(b) b.style.display = v ? 'block' : 'none'; }

// ── emote sender ─────────────────────────────────────────
function sendEmote(idx) {
  if (!onlineMode || !lobbySocket || lobbySocket.readyState !== 1) return;
  lobbySocket.send(JSON.stringify({ type:'emote', emoji: EMOTE_LIST[idx] }));
}

// ── spectator badge ───────────────────────────────────────
function showSpecBadge() {
  var el = document.getElementById('SpecBadge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'SpecBadge'; el.className = 'spec-overlay';
    document.getElementById('ContentDiv').appendChild(el);
  }
  el.textContent = '👁 WATCHING';
  el.style.display = 'block';
}
function hideSpecBadge() {
  var el = document.getElementById('SpecBadge');
  if (el) el.style.display = 'none';
}

// ── lobby websocket ───────────────────────────────────────

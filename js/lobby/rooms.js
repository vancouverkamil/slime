// Lobby: joining and leaving rooms, card tilt effect.
function initCardTilt() {
  if (window.matchMedia && !window.matchMedia('(pointer:fine)').matches) return;
  var cards = menuDiv.querySelectorAll('.lobby-map-card');
  for (var i = 0; i < cards.length; i++) {
    (function(card) {
      card.addEventListener('mousemove', function(e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.style.setProperty('--ry', ((px - 0.5) * 16) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 12) + 'deg');
        card.classList.add('is-tilting');
      });
      card.addEventListener('mouseleave', function() {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    })(cards[i]);
  }
}

function joinRoom(roomId) {
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  showingLobbySelect = false;
  lobbySocket.send(JSON.stringify({ type: 'join_room', roomId: roomId }));
  sendCustomization();
}

// WATCH: spectate someone's live 1v1 (any lobby). The server always seats a
// watcher as a spectator, never as a player, even if the match just ended.
function watchMatch(roomId) {
  if (!lobbySocket || lobbySocket.readyState !== 1 || roomId === null || roomId === undefined) return;
  if (onlineMode && !isSpectator) { addChatMessage(null, 'Finish your own match first.'); return; }
  if (typeof slimeverseActive !== 'undefined' && slimeverseActive) stopSlimeverse();
  if (typeof closeInbox === 'function') closeInbox();
  hidePlayerTip();
  showingLobbySelect = false;
  lobbySocket.send(JSON.stringify({ type: 'join_room', roomId: roomId, spectate: true }));
}

function leaveLobby() {
  if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
    leaveSlimeverse();
    return;
  }
  showingLobbySelect = false; onlineMode = false; isSpectator = false;
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
  hideSpecBadge(); showLeaveBtn(false);
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'leave_room' }));
  }
  showBottomBar(); toInitialMenu();
}

// ── server message handler ────────────────────────────────

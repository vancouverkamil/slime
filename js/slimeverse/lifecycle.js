// ── Slimeverse lifecycle ──────────────────────────────────
function startSlimeverse() {
  if (window.SLIME_BACKEND_DISABLED) {
    addChatMessage(null, 'The Slimeverse needs a server connection.');
    return;
  }
  if (onlineMode || isSpectator || currentRoomId !== null) leaveLobby();
  claimScreen('slimeverse', stopSlimeverse);
  showingLobbySelect = false;
  slimeverseActive  = true;
  slimeverseSelfId  = null;
  slimeversePlayers = {};
  slimeverseVisualPlayers = {};
  mvLastTime = 0; mvAccum = 0;
  hideSpecBadge(); showLeaveBtn(true); hideBottomBar();
  canvas.style.display = 'block';
  menuDiv.style.display = 'none';
  connectSlimeverse();
  startSlimeverseInput();
  requestAnimationFrame(renderSlimeverse);
}

// Stops the world's loop, input and socket. Called directly, or by claimScreen
// when another mode (a tournament match, a local game...) takes the screen,
// so it leaves page chrome and navigation to whoever is taking over.
function stopSlimeverse() {
  if (!slimeverseActive) return false;
  slimeverseActive  = false;
  if (typeof closeHatShop === 'function') closeHatShop();
  if (slimeverseInputInterval) { clearInterval(slimeverseInputInterval); slimeverseInputInterval = null; }
  slimeverseSelfId  = null;
  slimeversePlayers = {};
  slimeverseVisualPlayers = {};
  disconnectSlimeverse();
  releaseScreen('slimeverse');
  return true;
}

// The player chose to leave: stop the world and go back to the home menu.
function leaveSlimeverse() {
  if (!stopSlimeverse()) return;
  showLeaveBtn(false);
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  toInitialMenu();
}

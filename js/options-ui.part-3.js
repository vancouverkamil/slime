function hideEscMenu() {
  escMenuOpen = false;
  var el = document.getElementById('EscMenu');
  if (el) el.style.display = 'none';
  if (!onlineMode && !isSpectator) {
    if (gameState === GAME_STATE_MENU_PAUSE) { updateCount = 0; gameState = GAME_STATE_RUNNING; }
    else if (gameState === GAME_STATE_MENU_PAUSE_BETWEEN_POINTS) startNextPoint();
  }
}

// ── web audio dubstep drops ───────────────────────────────

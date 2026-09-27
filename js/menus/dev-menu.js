// Menus: developer menu (Ctrl+Shift+D).
// ── dev menu ──────────────────────────────────────────────
function toggleDevMenu() {
  var d = document.getElementById('DevMenuDiv');
  if (!d) return;
  if (d.style.display === 'block') { d.style.display = 'none'; return; }
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: ' + getPlayerRank() + '  |  WINS: ' + totalWins;
  d.style.display = 'block';
}
function devUnlockAll() {
  totalWins = 999;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: ' + getPlayerRank() + '  |  WINS: ' + totalWins;
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
}
function devSetRank(rank) {
  var w = rank === 'SERGEANT' ? 6 : rank === 'CORPORAL' ? 3 : 0;
  totalWins = w;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: ' + getPlayerRank() + '  |  WINS: ' + totalWins;
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
}
function devReset() {
  totalWins = 0;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: PRIVATE  |  WINS: 0';
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
}

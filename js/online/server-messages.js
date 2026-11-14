// Online: lobby-level server messages (connection, lobby list, chat, player count, errors).

onServerMessage('connected', function(msg) {
  currentLobbies = msg.lobbies || [];
  updatePlayerCount(msg.totalPlayers);
  if (msg.profile) applyAccount(msg.profile);
  refreshSocial(); // friends, requests and unread messages for this account (or clears them for guests)
  var savedN = localStorage.getItem('slimeName');
  if (currentAccount) {
    myPlayerName = currentAccount.displayName || currentAccount.username;
  } else if (savedN) {
    myPlayerName = savedN;
    if (lobbySocket && lobbySocket.readyState === 1)
      lobbySocket.send(JSON.stringify({ type: 'set_name', name: savedN, wins: totalWins, rank: getPlayerRank() }));
  } else {
    myPlayerName = msg.name;
    if (lobbySocket && lobbySocket.readyState === 1)
      lobbySocket.send(JSON.stringify({ type: 'set_name', name: msg.name, wins: totalWins, rank: getPlayerRank() }));
  }
  addChatMessage(null, 'Connected as ' + myPlayerName);
  if (msg.playerList) updateOnlineList(msg.playerList);
  var rjRoom  = null, rjToken = null;
  try { rjRoom  = localStorage.getItem('slime_pendingRejoinRoom');  } catch(e) {}
  try { rjToken = localStorage.getItem('slime_pendingRejoinToken'); } catch(e) {}
  if (rjRoom !== null && rjToken) {
    try { localStorage.removeItem('slime_pendingRejoinRoom'); localStorage.removeItem('slime_pendingRejoinToken'); } catch(e) {}
    setTimeout(function() {
      if (lobbySocket && lobbySocket.readyState === 1)
        lobbySocket.send(JSON.stringify({ type: 'join_room', roomId: parseInt(rjRoom, 10), rejoinToken: rjToken }));
    }, 150);
  }
});

onServerMessage('perf_pong', function(msg) {
  if (typeof handlePerfPong === 'function') handlePerfPong(msg);
});

onServerMessage('lobby_list', function(msg) {
  currentLobbies = msg.lobbies || [];
  updatePlayerCount(msg.totalPlayers);
  if (msg.playerList) updateOnlineList(msg.playerList);
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
});

onServerMessage('chat', function(msg) {
  if (chatJoined) {
    addChatMessage(msg.name, msg.message);
  } else if (msg.name) {
    chatUnreadCount++;
    updateChatUnreadNote();
  }
});

onServerMessage('player_count', function(msg) {
  updatePlayerCount(msg.count);
});

onServerMessage('server_error', function(msg) {
  addChatMessage(null, 'Something went wrong on the server (' + String(msg.ref || 'request') + '). Please try again.');
});

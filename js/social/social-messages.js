// Social: live server messages and the profile buttons (add friend / message).

// A private message arrived (or one we sent from another tab).
onServerMessage('dm', function(msg) {
  var m = msg.message;
  if (!m || !currentAccount) return;
  var fromMe = m.from === currentAccount.username;
  var other = fromMe ? m.to : m.from;
  var viewing = inboxIsOpen() && socialState.withUser === other;
  if (viewing) {
    addMessageToConversation(m);
    if (!fromMe) openConversation(other); // re-open quietly so it's marked read
    return;
  }
  refreshSocial();
  if (!fromMe) addChatMessage(null, 'New message from @' + m.from + '. Open INBOX to reply.');
});

// Friends or requests changed (someone added, accepted, removed or blocked you).
onServerMessage('social_update', function() {
  refreshSocial().then(function() {
    if (inboxIsOpen() && socialState.withUser) openConversation(socialState.withUser);
  });
});

// Buttons under another player's profile.
function socialProfileActionsHtml(username) {
  if (!currentAccount || !username || username === currentAccount.username) return '';
  var rel = relationshipWith(username), u = jsStr(username), btn = function(label, onclick, cls) {
    return '<button type="button" class="inbox-btn' + (cls ? ' ' + cls : '') + '" onclick="' + onclick + '">' + label + '</button>';
  };
  var main = {
    friends:  btn('MESSAGE', 'hideProfile();openInbox(' + u + ')', 'primary'),
    incoming: btn('ACCEPT FRIEND', 'socialAction(\'accept\',' + u + ').then(function(){showProfile(' + u + ')})', 'primary'),
    outgoing: btn('REQUEST SENT', 'openInbox()'),
    blocked:  btn('UNBLOCK', 'socialAction(\'unblock\',' + u + ').then(function(){showProfile(' + u + ')})'),
    none:     btn('ADD FRIEND', 'socialAction(\'request\',' + u + ').then(function(){showProfile(' + u + ')})', 'primary'),
  }[rel];
  return '<div class="profile-social">' + main + '</div>';
}

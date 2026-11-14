// Social: friends and private messages. State plus the calls to /api/social.
// The inbox UI (inbox-ui.js) only renders socialState; live updates arrive as
// 'dm' / 'social_update' server messages (social-messages.js).
var socialState = {
  overview: null,  // { friends, incoming, outgoing, blocked, unreadTotal } from the server
  withUser: null,  // username of the open conversation
  convo: null,     // { with, friends, messages, hasMore }
  notice: '',      // last error or confirmation shown in the inbox
};
var SOCIAL_MAX_MESSAGE = 500;

function socialApi(path, body) {
  return accountRequest('/api/social' + path, body ? { method: 'POST', body: JSON.stringify(body) } : { method: 'GET' });
}

function setInboxNotice(text) {
  socialState.notice = text || '';
  if (typeof renderInbox === 'function') renderInbox();
}

function refreshSocial() {
  if (!currentAccount) {
    socialState.overview = null; socialState.withUser = null; socialState.convo = null;
    updateInboxBadge();
    if (typeof renderInbox === 'function') renderInbox();
    return Promise.resolve();
  }
  return socialApi('').then(function(overview) {
    socialState.overview = overview;
    updateInboxBadge();
    if (typeof renderInbox === 'function') renderInbox();
  }).catch(function() { /* offline or signed out: keep the last known state */ });
}

function updateInboxBadge() {
  var badge = document.getElementById('InboxBadge');
  if (!badge) return;
  var o = socialState.overview;
  var n = o ? (o.unreadTotal || 0) + (o.incoming ? o.incoming.length : 0) : 0;
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
}

function socialAction(action, username, confirmText) {
  if (!username) return Promise.resolve();
  if (confirmText && !window.confirm(confirmText)) return Promise.resolve();
  return socialApi('/' + action, { username: username }).then(function(res) {
    var done = { request: res && res.status === 'friends' ? 'You are now friends with @' + username + '.' : 'Friend request sent to @' + username + '.',
      accept: 'You are now friends with @' + username + '.', block: '@' + username + ' is blocked.' };
    socialState.notice = done[action] || '';
    if ((action === 'remove' || action === 'block') && socialState.withUser === username) { socialState.withUser = null; socialState.convo = null; }
    return refreshSocial();
  }).catch(function(err) { setInboxNotice(err.message); });
}

function openConversation(username, olderThan) {
  var switching = socialState.withUser !== username;
  socialState.withUser = username;
  if (switching) { socialState.convo = null; socialState.notice = ''; }
  if (typeof renderInbox === 'function') renderInbox();
  var q = olderThan ? '?before=' + encodeURIComponent(olderThan) : '';
  return socialApi('/messages/' + encodeURIComponent(username) + q).then(function(convo) {
    if (socialState.withUser !== username) return; // switched away meanwhile
    if (olderThan && socialState.convo) convo.messages = convo.messages.concat(socialState.convo.messages);
    socialState.convo = convo;
    if (typeof renderInbox === 'function') renderInbox({ scroll: olderThan ? 'keep' : 'bottom' });
    return refreshSocial(); // opening it marked the messages read
  }).catch(function(err) { setInboxNotice(err.message); });
}

function sendDirectMessage(username, body) {
  body = String(body || '').trim().slice(0, SOCIAL_MAX_MESSAGE);
  if (!body) return Promise.resolve(false);
  return socialApi('/messages', { to: username, body: body }).then(function(res) {
    addMessageToConversation(res.message);
    return true;
  }).catch(function(err) { setInboxNotice(err.message); return false; });
}

// Adds a message to the open conversation (from our send, or a live 'dm'), once.
function addMessageToConversation(message) {
  var c = socialState.convo;
  if (!c || !message) return false;
  var other = message.from === currentAccount.username ? message.to : message.from;
  if (other !== socialState.withUser) return false;
  if (c.messages.some(function(m) { return m.id === message.id; })) return true;
  c.messages.push(message);
  if (typeof renderInbox === 'function') renderInbox({ scroll: 'bottom' });
  return true;
}

// Where a player stands with us, for profile buttons.
function relationshipWith(username) {
  var o = socialState.overview;
  if (!o) return 'none';
  var has = function(list) { return list.some(function(u) { return u.username === username; }); };
  if (has(o.friends)) return 'friends';
  if (has(o.incoming)) return 'incoming';
  if (has(o.outgoing)) return 'outgoing';
  if (has(o.blocked)) return 'blocked';
  return 'none';
}

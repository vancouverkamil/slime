// Social: the inbox overlay. Renders socialState (see social.js): friends with
// online dots and unread counts, friend requests, adding a friend, blocked
// players, and the open conversation.
var _inboxPoll = null;

function inboxIsOpen() {
  var el = document.getElementById('InboxOverlay');
  return !!el && el.classList.contains('open');
}

function openInbox(username) {
  var el = document.getElementById('InboxOverlay');
  if (!el) return;
  el.classList.add('open');
  socialState.notice = '';
  renderInbox();
  refreshSocial();
  if (username && currentAccount) openConversation(username);
  if (_inboxPoll) clearInterval(_inboxPoll);
  _inboxPoll = setInterval(refreshSocial, 20000); // keeps online dots fresh while it's open
}

function closeInbox() {
  var el = document.getElementById('InboxOverlay');
  if (el) el.classList.remove('open');
  if (_inboxPoll) { clearInterval(_inboxPoll); _inboxPoll = null; }
}

function inboxUserRow(u, buttons, extra) {
  return '<div class="inbox-row">' +
    '<span class="inbox-name" title="@' + escHtml(u.username) + '">' + (extra || '') + '@' + escHtml(u.username) + '</span>' +
    '<span class="inbox-row-actions">' + buttons + '</span></div>';
}
function inboxBtn(label, onclick, cls) {
  return '<button type="button" class="inbox-btn' + (cls ? ' ' + cls : '') + '" onclick="' + onclick + '">' + label + '</button>';
}
// A value as a JS string literal inside an onclick="..." attribute: JSON-quoted, then HTML-escaped.
function jsStr(s) { return escHtml(JSON.stringify(String(s))); }

function inboxSideHtml(o) {
  var html = '<form class="inbox-add" onsubmit="return inboxAddFriend(this)">' +
    '<input name="username" maxlength="20" placeholder="Add friend by username" autocomplete="off" aria-label="Username to add">' +
    '<button type="submit" class="inbox-btn primary">ADD</button></form>';
  if (socialState.notice) html += '<div class="inbox-notice">' + escHtml(socialState.notice) + '</div>';
  if (!o) return html + '<div class="inbox-empty">Loading…</div>';
  if (o.incoming.length) {
    html += '<div class="inbox-section">FRIEND REQUESTS</div>' + o.incoming.map(function(u) {
      return inboxUserRow(u, inboxBtn('ACCEPT', 'socialAction(\'accept\',' + jsStr(u.username) + ')', 'primary') +
        inboxBtn('DECLINE', 'socialAction(\'decline\',' + jsStr(u.username) + ')'));
    }).join('');
  }
  html += '<div class="inbox-section">FRIENDS <span>' + o.friends.length + '</span></div>';
  html += o.friends.length ? o.friends.map(function(f) {
    var active = f.username === socialState.withUser ? ' active' : '';
    return '<div class="inbox-friend' + active + '" onclick="openConversation(' + jsStr(f.username) + ')">' +
      '<span class="inbox-dot' + (f.online ? ' on' : '') + '" title="' + (f.online ? 'Online' : 'Offline') + '"></span>' +
      '<span class="inbox-name">@' + escHtml(f.username) + '</span>' +
      (f.watchRoom !== null && f.watchRoom !== undefined
        ? '<button class="inbox-watch" onclick="event.stopPropagation();watchMatch(' + (f.watchRoom | 0) + ')" title="Watch their match">WATCH</button>'
        : '') +
      (f.unread ? '<span class="inbox-unread">' + f.unread + '</span>' : '') + '</div>';
  }).join('') : '<div class="inbox-empty">No friends yet. Add someone by username, or from their profile.</div>';
  if (o.outgoing.length) {
    html += '<div class="inbox-section">SENT REQUESTS</div>' + o.outgoing.map(function(u) {
      return inboxUserRow(u, inboxBtn('CANCEL', 'socialAction(\'decline\',' + jsStr(u.username) + ')'));
    }).join('');
  }
  if (o.blocked.length) {
    html += '<div class="inbox-section">BLOCKED</div>' + o.blocked.map(function(u) {
      return inboxUserRow(u, inboxBtn('UNBLOCK', 'socialAction(\'unblock\',' + jsStr(u.username) + ')'));
    }).join('');
  }
  return html;
}

function inboxTime(iso) {
  var d = new Date(iso);
  var sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function inboxChatHtml() {
  var who = socialState.withUser;
  if (!who) return '<div class="inbox-placeholder">Pick a friend to chat with.</div>';
  var c = socialState.convo;
  var friend = socialState.overview && socialState.overview.friends.find(function(f) { return f.username === who; });
  var head = '<div class="inbox-chat-head"><span class="inbox-chat-name">@' + escHtml(who) +
    (friend ? ' <small class="' + (friend.online ? 'on' : '') + '">' + (friend.online ? 'online' : 'offline') + '</small>' : '') + '</span>' +
    inboxBtn('PROFILE', 'closeInbox();showProfile(' + jsStr(who) + ')') +
    (friend ? inboxBtn('REMOVE', 'socialAction(\'remove\',' + jsStr(who) + ',' + jsStr('Remove @' + who + ' from your friends?') + ')') : '') +
    inboxBtn('BLOCK', 'socialAction(\'block\',' + jsStr(who) + ',' + jsStr('Block @' + who + '? They will not be able to add or message you.') + ')', 'danger') + '</div>';
  if (!c) return head + '<div class="inbox-messages"><div class="inbox-empty">Loading…</div></div>';
  var me = currentAccount && currentAccount.username;
  var list = (c.hasMore ? '<button type="button" class="inbox-older" onclick="openConversation(' + jsStr(who) + ',' + jsStr(c.messages[0] ? c.messages[0].createdAt : '') + ')">LOAD OLDER</button>' : '') +
    (c.messages.length ? c.messages.map(function(m) {
      return '<div class="inbox-msg' + (m.from === me ? ' mine' : '') + '"><div class="inbox-bubble">' + escHtml(censorProfanity(m.body)) + '</div>' +
        '<div class="inbox-meta">' + escHtml(inboxTime(m.createdAt)) + '</div></div>';
    }).join('') : '<div class="inbox-empty">No messages yet. Say hi!</div>');
  var composer = c.friends
    ? '<form class="inbox-compose" onsubmit="return inboxSend(this)"><input name="body" maxlength="' + SOCIAL_MAX_MESSAGE + '" placeholder="Message @' + escHtml(who) + '" autocomplete="off" aria-label="Message">' +
      '<button type="submit" class="inbox-btn primary">SEND</button></form>'
    : '<div class="inbox-note">You can only message friends. Add @' + escHtml(who) + ' to chat again.</div>';
  return head + '<div class="inbox-messages" id="InboxMessages">' + list + '</div>' + composer;
}

function renderInbox(opts) {
  if (!inboxIsOpen()) return;
  var side = document.getElementById('InboxSide'), chat = document.getElementById('InboxChat');
  if (!side || !chat) return;
  if (!currentAccount) {
    side.innerHTML = '';
    chat.innerHTML = '<div class="inbox-placeholder">Log in to add friends and send private messages.</div>';
    return;
  }
  var typed = chat.querySelector('.inbox-compose input');
  var draft = typed ? typed.value : '', hadFocus = typed && document.activeElement === typed;
  var box = document.getElementById('InboxMessages');
  var prevHeight = box ? box.scrollHeight : 0, prevTop = box ? box.scrollTop : 0;
  side.innerHTML = inboxSideHtml(socialState.overview);
  chat.innerHTML = inboxChatHtml();
  var input = chat.querySelector('.inbox-compose input');
  if (input) { input.value = draft; if (hadFocus) input.focus(); }
  var list = document.getElementById('InboxMessages');
  if (list) {
    if (opts && opts.scroll === 'bottom') list.scrollTop = list.scrollHeight;
    else if (opts && opts.scroll === 'keep') list.scrollTop = list.scrollHeight - prevHeight + prevTop;
    else list.scrollTop = prevTop;
  }
}

function inboxAddFriend(form) {
  var name = String(form.username.value || '').trim().replace(/^@/, '');
  if (name) socialAction('request', name.toLowerCase());
  form.username.value = '';
  return false;
}

function inboxSend(form) {
  var input = form.body, who = socialState.withUser;
  var text = input.value;
  if (!who || !text.trim()) return false;
  input.value = '';
  sendDirectMessage(who, text).then(function(ok) { if (!ok) input.value = text; });
  return false;
}

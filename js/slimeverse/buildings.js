// Slimeverse: the town's two open buildings. Walking north into a door
// (js/slimeverse/town/slime_town.js doorAt) enters it:
//   FINAL 4  -> leaves the Slimeverse and starts the Final 4 mode
//   HAT SHOP -> the shop panel: buy prestige hats with SC, or wear ones you own
// Bought hats go into the account inventory (the same one the rest of the site
// uses); wearing one updates your saved slime and your Slimeverse avatar.
var SV_HAT_SHOP_ITEMS = [
  { hat: 'devil',      name: 'Devil Horns',     price: 400  },
  { hat: 'prismatic',  name: 'Prismatic Crown', price: 600  },
  { hat: 'dragonfire', name: 'Dragon Horns',    price: 800  },
  { hat: 'cosmic',     name: 'Cosmic Crown',    price: 1200 },
  { hat: 'angelic',    name: 'Triple Halo',     price: 1500 },
  { hat: 'overlord',   name: 'Overlord Crown',  price: 2500 },
];
var svShopOpen = false;
var svDoorLatch = false;   // after coming out, release the key before a door works again

// Called every frame with the slime's feet position and the input.
function checkSlimeverseDoors(x, z, inp) {
  if (!inp.up) svDoorLatch = false;
  if (svShopOpen || svDoorLatch) return;
  var id = slimeTown.doorAt(x, z, inp.up);
  if (id === 'final4') enterSlimeverseFinal4();
  else if (id === 'hat_shop') openHatShop();
}

function enterSlimeverseFinal4() {
  stopSlimeverse();
  showLeaveBtn(false);
  startFinal4();
}

// "Walk in" hint over an open door when the slime is close.
function drawSlimeverseDoorHint(x, z) {
  if (svShopOpen) return;
  var door = slimeTown.doorNear(x, z);
  if (!door) return;
  var pos = slimeTown.toScreen(door.x, door.y);
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  var msg = 'WALK IN: ' + door.name.toUpperCase();
  ctx.save();
  ctx.font = 'bold ' + Math.round(12 * s) + 'px Courier New';
  var tw = ctx.measureText(msg).width + 20 * s;
  ctx.fillStyle = 'rgba(0,0,20,.8)'; ctx.strokeStyle = 'rgba(255,210,90,.8)'; ctx.lineWidth = Math.max(1, s);
  ctx.fillRect(pos.x - tw / 2, pos.y - 26 * s, tw, 22 * s); ctx.strokeRect(pos.x - tw / 2, pos.y - 26 * s, tw, 22 * s);
  ctx.fillStyle = '#ffd966'; ctx.textAlign = 'center'; ctx.fillText(msg, pos.x, pos.y - 11 * s);
  ctx.restore();
}

// ── Hat shop panel ────────────────────────────────────────
function openHatShop() {
  if (svShopOpen) return;
  svShopOpen = true;
  var el = document.getElementById('SvHatShop');
  if (!el) {
    el = document.createElement('div');
    el.id = 'SvHatShop';
    el.className = 'sv-hat-shop';
    (document.getElementById('GameContentDiv') || document.body).appendChild(el);
  }
  el.style.display = 'flex';
  renderHatShop('');
}

function closeHatShop() {
  if (!svShopOpen) return;
  svShopOpen = false;
  svDoorLatch = true;
  var el = document.getElementById('SvHatShop');
  if (el) el.style.display = 'none';
  // Step back out onto the street in front of the door.
  var out = slimeTown.doorExit('hat_shop');
  mvLocal.x = out.x; mvLocal.z = out.y; mvLocal.vx = 0; mvLocal.vz = 0;
}

function hatShopOwns(hat) {
  return !!(currentAccount && Array.isArray(currentAccount.inventory) && currentAccount.inventory.indexOf(hat) !== -1);
}

function renderHatShop(message) {
  var el = document.getElementById('SvHatShop');
  if (!el) return;
  var coins = currentAccount ? (Number(currentAccount.coins) || 0) : null;
  var cards = SV_HAT_SHOP_ITEMS.map(function(item, i) {
    var owned = hatShopOwns(item.hat);
    var wearing = playerHat === item.hat;
    var label = wearing ? 'WEARING' : owned ? 'WEAR' : 'BUY ' + item.price + ' SC';
    return '<div class="sv-hat-card' + (wearing ? ' is-wearing' : '') + '">' +
      '<canvas class="sv-hat-preview" width="120" height="96" data-hat="' + item.hat + '"></canvas>' +
      '<div class="sv-hat-name">' + escHtml(item.name) + '</div>' +
      '<button class="sv-hat-btn" ' + (wearing ? 'disabled' : '') + ' onclick="useHatShopItem(' + i + ')">' + label + '</button>' +
      '</div>';
  }).join('');
  el.innerHTML =
    '<div class="sv-hat-shop-card" role="dialog" aria-label="Hat Shop">' +
    '<div class="sv-hat-shop-head"><span class="sv-hat-shop-title">HAT SHOP</span>' +
    '<span class="sv-hat-shop-coins">' + (coins === null ? 'LOG IN TO BUY' : coins + ' SC') + '</span>' +
    '<button class="sv-hat-shop-close" onclick="closeHatShop()" aria-label="Leave the shop">LEAVE</button></div>' +
    '<div class="sv-hat-grid">' + cards + '</div>' +
    '<div class="sv-hat-shop-msg">' + escHtml(message || 'Prestige hats, worn everywhere you play.') + '</div>' +
    '</div>';
  el.querySelectorAll('canvas.sv-hat-preview').forEach(drawHatShopPreview);
}

// Your own slime wearing the hat.
function drawHatShopPreview(cv) {
  var g = cv.getContext('2d'), r = 30, x = cv.width / 2, y = cv.height - 14;
  g.clearRect(0, 0, cv.width, cv.height);
  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, playerBodyColor);
    var s = (r * 2) / tc.width;
    g.drawImage(tc, x - r, y - tc.height * s * 0.72, tc.width * s, tc.height * s);
  }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + r * 0.25, y - r * 0.42, r * 0.18, 0, TWO_PI); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.arc(x + r * 0.3, y - r * 0.42, r * 0.08, 0, TWO_PI); g.fill();
  drawHatAt(g, x, y - r + 1, r, { hat: cv.getAttribute('data-hat'), anim: 'none', drawing: [] });
}

function wearHatShopItem(item) {
  playerHat = item.hat;
  try { localStorage.setItem('slimeHat', item.hat); } catch (e) {}
  sendCustomization();
  sendSlimeverseAppearance();
  if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
}

function useHatShopItem(i) {
  var item = SV_HAT_SHOP_ITEMS[i];
  if (!item) return;
  if (hatShopOwns(item.hat)) { wearHatShopItem(item); renderHatShop('Now wearing: ' + item.name); return; }
  if (!currentAccount) { renderHatShop('Log in to buy hats.'); return; }
  if ((Number(currentAccount.coins) || 0) < item.price) { renderHatShop('Not enough SC. ' + item.name + ' costs ' + item.price + '.'); return; }
  renderHatShop('Buying...');
  accountRequest('/api/me/buy', { method: 'POST', body: JSON.stringify({ hat: item.hat }) })
    .then(function(body) {
      currentAccount = body.user;
      wearHatShopItem(item);
      if (svShopOpen) renderHatShop('Bought ' + item.name + '! You are wearing it now.');
    })
    .catch(function(err) {
      if (svShopOpen) renderHatShop(err && err.message ? err.message : 'Could not buy that hat.');
    });
}

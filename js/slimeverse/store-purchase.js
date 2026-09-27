// ── Hat shop: buy / equip ─────────────────────────────────
// Bought hats go into the account inventory (the same one the rest of the site
// uses); equipping one updates your saved slime and your Slimeverse avatar.
function setStoreMessage(text) {
  svStoreMsg = text;
  svStoreMsgTimer = Date.now();
}

function equipStoreHat(item) {
  playerHat = item.hat;
  try { localStorage.setItem('slimeHat', item.hat); } catch (e) {}
  sendCustomization();
  if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
}

function buyStoreHat(item) {
  setStoreMessage('BUYING...');
  accountRequest('/api/me/buy', { method: 'POST', body: JSON.stringify({ hat: item.hat }) })
    .then(function(body) {
      currentAccount = body.user;
      equipStoreHat(item);
      setStoreMessage('BOUGHT: ' + item.name.toUpperCase() + '!');
    })
    .catch(function(err) {
      setStoreMessage(err && err.message ? err.message.toUpperCase() : 'BUY FAILED');
    });
}

function useStoreItem(item) {
  var owned = currentAccount && Array.isArray(currentAccount.inventory) && currentAccount.inventory.indexOf(item.hat) !== -1;
  if (owned) {
    equipStoreHat(item);
    setStoreMessage('EQUIPPED: ' + item.name.toUpperCase());
  } else if (!currentAccount) {
    setStoreMessage('LOG IN TO BUY ITEMS');
  } else if ((Number(currentAccount.coins) || 0) < item.price) {
    setStoreMessage('NOT ENOUGH SC  (NEED ' + item.price + ')');
  } else {
    buyStoreHat(item);
  }
}

// E key: buy or equip the item on the nearest shelf.
function handleStoreShelfKey() {
  var now = Date.now();
  if (!keysDown[KEY_E] || now - svStoreKeyDebounce <= 200) return;
  var nearIdx = svNearestShelf(svStorePlayerX);
  if (nearIdx === null) return;
  keysDown[KEY_E] = false;
  svStoreKeyDebounce = now;
  var item = SV_STORE_ITEMS[nearIdx % SV_STORE_ITEMS.length];
  if (item) useStoreItem(item);
}

var INV_HAT_LABELS = {
  none:        'No Hat',
  devil:       'Devil Horns',
  prismatic:   'Prismatic Crown',
  dragonfire:  'Dragon Horns',
  cosmic:      'Cosmic Crown',
  angelic:     'Triple Halo',
  overlord:    'Overlord Crown',
  crown:       'Royal Crown',
  goldcrown:   'Gold Crown',
  tophat:      'Top Hat',
  cowboy:      'Cowboy Hat',
  halo:        'Halo',
  party:       'Party Hat',
  custom:      'Custom Hat',
};
var inventoryReturnFocus = null;

function openInventory() {
  if (!currentAccount) return;
  var overlay = document.getElementById('InventoryOverlay');
  if (!overlay) return;
  inventoryReturnFocus = document.activeElement;
  overlay.style.display = 'flex';
  renderInventory(currentAccount);
  overlay.onkeydown = handleInventoryKey;
  var first = overlay.querySelector('.inv-slot.inv-hat');
  if (first) first.focus();
}

function hideInventory() {
  var overlay = document.getElementById('InventoryOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.onkeydown = null;
  }
  if (inventoryReturnFocus && typeof inventoryReturnFocus.focus === 'function') inventoryReturnFocus.focus();
  inventoryReturnFocus = null;
}

function inventoryHatSlot(hatId) {
  var label = INV_HAT_LABELS[hatId] || hatId;
  var active = playerHat === hatId;
  return '<button class="inv-slot inv-hat' + (active ? ' equipped' : '') + '" onclick="equipHatFromInv(\'' + escHtml(hatId) + '\')" title="' + escHtml(label) + '" aria-label="' + escHtml(label) + (active ? ', equipped' : '') + '">' +
    '<div class="inv-icon inv-hat-icon" data-hat="' + escHtml(hatId) + '"></div>' +
    '<div class="inv-label">' + escHtml(label) + '</div>' +
    (active ? '<div class="inv-state">EQUIPPED</div>' : '') +
  '</button>';
}

function handleInventoryKey(event) {
  var overlay = document.getElementById('InventoryOverlay');
  if (!overlay) return;
  var slots = Array.prototype.slice.call(overlay.querySelectorAll('.inv-slot.inv-hat'));
  var controls = Array.prototype.slice.call(overlay.querySelectorAll('button'));
  var current = slots.indexOf(document.activeElement);
  var next = current;
  if (event.key === 'ArrowRight') next++;
  else if (event.key === 'ArrowLeft') next--;
  else if (event.key === 'ArrowDown') next += window.innerWidth <= 680 ? 4 : 8;
  else if (event.key === 'ArrowUp') next -= window.innerWidth <= 680 ? 4 : 8;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = slots.length - 1;
  else if (event.key === 'Tab' && controls.length) {
    var controlIndex = controls.indexOf(document.activeElement);
    if (event.shiftKey && controlIndex === 0) {
      controls[controls.length - 1].focus();
      event.preventDefault();
    } else if (!event.shiftKey && controlIndex === controls.length - 1) {
      controls[0].focus();
      event.preventDefault();
    }
    return;
  } else {
    return;
  }
  if (slots.length) {
    slots[Math.max(0, Math.min(slots.length - 1, next))].focus();
    event.preventDefault();
  }
}

function renderInventory(user) {
  var grid = document.getElementById('InventoryGrid');
  var coinsEl = document.getElementById('InventoryCoins');
  if (!grid) return;
  var coins = Number(user.coins) || 0;
  var inv = Array.isArray(user.inventory) ? user.inventory : [];
  if (coinsEl) coinsEl.textContent = 'SC: ' + coins;

  var cols = 8, rows = 4, total = cols * rows;
  var slots = [{ type: 'none', hat: 'none' }];
  inv.forEach(function(hatId) { slots.push({ type: 'hat', hat: hatId }); });
  while (slots.length < total) slots.push(null);
  slots = slots.slice(0, total);

  grid.innerHTML =
    '<div class="inv-toolbar">' +
      '<div><b>HAT LOCKER</b><span>' + inv.length + ' OWNED / ' + (total - 1) + ' SLOTS</span></div>' +
      '<i>SELECT A HAT TO EQUIP</i>' +
    '</div>' +
    '<div class="inv-grid">' +
      slots.map(function(slot) {
        if (!slot) return '<div class="inv-slot inv-empty" aria-hidden="true"></div>';
        return inventoryHatSlot(slot.hat);
      }).join('') +
    '</div>';

  grid.querySelectorAll('.inv-hat-icon').forEach(function(el) {
    var hatId = el.getAttribute('data-hat');
    if (hatId === 'none') {
      el.innerHTML = '<span class="inv-none">&#8709;</span>';
      return;
    }
    var c = document.createElement('canvas');
    c.width = 52; c.height = 52;
    var cx2 = c.getContext('2d');
    cx2.fillStyle = '#0a0018';
    cx2.fillRect(0, 0, 52, 52);
    drawHatAt(cx2, 26, 43, 19, { hat: hatId, anim: 'none', drawing: [] });
    el.appendChild(c);
  });
}

function equipHatFromInv(hatId) {
  playerHat = hatId;
  try { localStorage.setItem('slimeHat', hatId); } catch(e) {}
  sendCustomization();
  if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
  if (currentAccount) renderInventory(currentAccount);
}

// Customization: sync the customize panel UI and its live slime preview.
function syncCustomizationUI() {
  initColorPicker();

  // Color swatches — all 8
  var sc = document.getElementById('ColorSwatches');
  if (sc) {
    sc.innerHTML = '';
    BODY_COLORS.forEach(function(col) {
      var d = document.createElement('div');
      d.className = 'swatch' + (col === playerBodyColor ? ' active' : '');
      d.style.background = col; d.title = col;
      d.onclick = function() { setBodyColorHex(col); syncCustomizationUI(); };
      sc.appendChild(d);
    });
  }

  // Body overlay picker
  var bop = document.getElementById('BodyOverlayPicker');
  if (bop) {
    bop.innerHTML = '';
    BODY_OVERLAYS.forEach(function(o) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (o.id === playerBodyOverlay ? ' active' : '');
      b.textContent = o.label;
      b.onclick = function() {
        playerBodyOverlay = o.id;
        try { localStorage.setItem('slimeBodyOverlay', o.id); } catch(e) {}
        syncCustomizationUI(); updateSlimePreview();
      };
      bop.appendChild(b);
    });
  }

  // Free hats
  var hp = document.getElementById('HatPicker');
  if (hp) {
    hp.innerHTML = '';
    HAT_OPTIONS.filter(function(h) { return !h.shopPrice; }).forEach(function(h) {
      var b = document.createElement('button');
      var locked = h.minLevel && !hasHatUnlock(h.id);
      b.className = 'hat-opt' + (h.id === playerHat ? ' active' : '') + (locked ? ' locked' : '');
      b.textContent = locked ? h.label + '  L' + h.minLevel : h.label;
      if (locked) b.title = 'Reach level ' + h.minLevel + ' to unlock.';
      b.onclick = function() {
        if (locked) { accountMessage('Reach level ' + h.minLevel + ' to unlock.', true); return; }
        playerHat = h.id; try { localStorage.setItem('slimeHat', h.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      hp.appendChild(b);
    });
  }

  // Shop hats
  var shp = document.getElementById('ShopHatPicker');
  if (shp) {
    shp.innerHTML = '';
    HAT_OPTIONS.filter(function(h) { return h.shopPrice; }).forEach(function(h) {
      var owned = hasHatUnlock(h.id);
      var b = document.createElement('button');
      b.className = 'hat-opt' + (h.id === playerHat ? ' active' : '') + (!owned ? ' locked' : '');
      b.textContent = owned ? h.label : h.label + '  ' + h.shopPrice + ' SC';
      if (!owned) b.title = 'Buy in Slimeverse Hat Shop for ' + h.shopPrice + ' SC';
      b.onclick = function() {
        if (!owned) { accountMessage('Visit the Slimeverse Hat Shop to unlock ' + h.label + '.', true); return; }
        playerHat = h.id; try { localStorage.setItem('slimeHat', h.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      shp.appendChild(b);
    });
  }

  var snc = document.getElementById('StudioNotCustom');
  if (snc) snc.style.display = playerHat !== 'custom' ? 'block' : 'none';

  var as = document.getElementById('HatAnimSection');
  if (as) as.style.display = playerHat !== 'none' ? 'block' : 'none';
  var ap = document.getElementById('HatAnimPicker');
  if (ap) {
    ap.innerHTML = '';
    HAT_ANIM_OPTIONS.forEach(function(a) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (a.id === playerHatAnim ? ' active' : '');
      b.textContent = a.label;
      b.onclick = function() {
        playerHatAnim = a.id; try { localStorage.setItem('slimeHatAnim', a.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      ap.appendChild(b);
    });
  }

  // Trail picker
  var tp = document.getElementById('TrailPicker');
  if (tp) {
    tp.innerHTML = '';
    TRAIL_OPTIONS.forEach(function(o) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (o.id === playerTrail ? ' active' : '');
      b.textContent = o.label;
      b.onclick = function() {
        playerTrail = o.id;
        try { localStorage.setItem('slimeTrail', o.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      tp.appendChild(b);
    });
  }

  if (playerHatAnim !== 'none' && playerHat !== 'none') startPreviewAnim();
  else stopPreviewAnim();
  renderSavedHatDrawings();
}

function startPreviewAnim() {
  if (previewAnimInterval) return;
  previewAnimInterval = setInterval(updateSlimePreview, 50);
}
function stopPreviewAnim() {
  if (previewAnimInterval) { clearInterval(previewAnimInterval); previewAnimInterval = null; }
  updateSlimePreview();
}

document.getElementById('OptionsDiv').innerHTML = `
        <div class="opt-panel">

          <!-- header -->
          <div class="opt-hdr">
            <span class="opt-hdr-title">&#9881; SETTINGS</span>
            <button class="opt-close-btn" onclick="hideOptions()" type="button">[ CLOSE ]</button>
          </div>

          <!-- body -->
          <div class="opt-body">

            <!-- sidebar -->
            <div class="opt-sidebar">
              <div class="opt-preview-box">
                <canvas id="SlimePreview" width="130" height="120"></canvas>
                <div class="opt-preview-lbl" id="OptPreviewName">MY SLIME</div>
              </div>
              <nav class="opt-nav">
                <div id="OptNav_slime"    class="opt-nav-item opt-nav-active" onclick="showOptSection('slime')">&#9632; MY SLIME</div>
                <div id="OptNav_hat"      class="opt-nav-item" onclick="showOptSection('hat')">&#9836; HAT STYLE</div>
                <div id="OptNav_studio"   class="opt-nav-item" onclick="showOptSection('studio')">&#9998; HAT STUDIO</div>
                <div id="OptNav_audio"    class="opt-nav-item" onclick="showOptSection('audio')">&#9834; AUDIO</div>
                <div id="OptNav_display"  class="opt-nav-item" onclick="showOptSection('display')">&#9881; DISPLAY</div>
                <div id="OptNav_gameplay" class="opt-nav-item" onclick="showOptSection('gameplay')">&#9660; GAMEPLAY</div>
                <div id="OptNav_controls" class="opt-nav-item" onclick="showOptSection('controls')">&#9650; CONTROLS</div>
              </nav>
            </div>

            <!-- content -->
            <div class="opt-content">

              <!-- ── MY SLIME ── -->
              <div id="OptSection_slime">
                <div class="opt-section-title" style="margin-top:0">Slime Color</div>
                <canvas id="ColorSVCanvas" width="200" height="150" class="opt-color-picker"></canvas>
                <canvas id="ColorHueStrip" width="200" height="14" class="opt-hue-strip"></canvas>
                <div class="opt-color-row">
                  <div id="ColorPreviewBox" class="opt-color-preview"></div>
                  <input id="ColorHexInput" type="text" maxlength="7" placeholder="#00ff00" class="opt-hex-input"
                         onchange="applyColorHex(this.value)" onkeydown="if(event.key==='Enter')applyColorHex(this.value)">
                  <div id="ColorSwatches" class="opt-swatches"></div>
                </div>
                <div class="opt-section-title">Body Overlay</div>
                <div id="BodyOverlayPicker" class="opt-chip-row"></div>
                <div class="opt-section-title">Trail Effect</div>
                <div id="TrailPicker" class="opt-chip-row"></div>
              </div>

              <!-- ── HAT STYLE ── -->
              <div id="OptSection_hat" style="display:none">
                <div class="opt-section-title" style="margin-top:0">Free Hats</div>
                <div id="HatPicker" class="opt-chip-row"></div>
                <div class="opt-section-title">Shop Hats</div>
                <div class="opt-shop-note">Unlocked in the Slimeverse Hat Shop</div>
                <div id="ShopHatPicker" class="opt-chip-row"></div>
                <div id="HatAnimSection" style="display:none;margin-top:20px">
                  <div class="opt-section-title">Hat Animation</div>
                  <div id="HatAnimPicker" class="opt-chip-row"></div>
                </div>
              </div>

              <!-- ── HAT STUDIO ── -->
              <div id="OptSection_studio" style="display:none">
                <div class="opt-section-title" style="margin-top:0">Hat Studio</div>
                <div class="opt-studio-tools">
                  <button id="DrawBrushPen"    onclick="setDrawBrush('pen')"    class="draw-tool-btn active">&#9998; Pen</button>
                  <button id="DrawBrushMarker" onclick="setDrawBrush('marker')" class="draw-tool-btn">&#9646; Marker</button>
                  <button id="DrawBrushEraser" onclick="setDrawBrush('eraser')" class="draw-tool-btn">&#9702; Erase</button>
                  <div id="DrawColorDot" onclick="cycleDrawColor()" title="Brush color" class="opt-color-dot"></div>
                  <span style="flex:1"></span>
                  <button id="DrawSizeS"  onclick="setDrawSize(2)"  class="draw-tool-btn active">S</button>
                  <button id="DrawSizeM"  onclick="setDrawSize(5)"  class="draw-tool-btn">M</button>
                  <button id="DrawSizeL"  onclick="setDrawSize(11)" class="draw-tool-btn">L</button>
                  <button id="DrawSizeXL" onclick="setDrawSize(22)" class="draw-tool-btn">XL</button>
                  <span style="flex:1"></span>
                  <button id="DrawUndo" onclick="hatUndo()" class="draw-tool-btn" title="Undo (Ctrl+Z)" style="opacity:.35;cursor:default">&#8617; Undo</button>
                  <button id="DrawRedo" onclick="hatRedo()" class="draw-tool-btn" title="Redo (Ctrl+Y)" style="opacity:.35;cursor:default">&#8618; Redo</button>
                </div>
                <canvas id="HatDrawCanvas" width="174" height="202" class="opt-draw-canvas"></canvas>
                <div class="opt-studio-actions">
                  <button onclick="clearHatDrawing()" class="hat-opt">&#10005; Clear</button>
                  <button onclick="saveCurrentHatPreset()" class="hat-opt">Save Preset</button>
                  <button onclick="openHatFullscreen()" class="hat-opt" style="margin-left:auto">&#11036; Fullscreen</button>
                </div>
                <div id="SavedHatDrawings" class="saved-hats"></div>
                <div id="StudioNotCustom" class="opt-notice" style="display:none">
                  &#9888; Select &ldquo;Custom&rdquo; in Hat Style to show your drawing in-game.
                </div>
              </div>

              <!-- ── AUDIO ── -->
              <div id="OptSection_audio" style="display:none">
                <div class="opt-section-title" style="margin-top:0">Victory Music</div>
                <div class="opt-label-dim">Plays when you win a match</div>
                <select id="DropSelect" class="opt-select" onchange="selectedDrop=this.value|0"></select>
                <button onclick="previewDrop()" class="opt-preview-btn">&#9654; PREVIEW</button>
                <div class="opt-section-title">Sound &amp; Effects</div>
                <div class="opt-toggle-group">
                  <label class="opt-toggle"><input id="GameSfx" type="checkbox" onchange="setGameSfx(this.checked)"><span>Sound Effects</span></label>
                  <label class="opt-toggle"><input id="ScreenFx" type="checkbox" onchange="setScreenFx(this.checked)"><span>Screen Effects</span></label>
                </div>
              </div>

              <!-- ── DISPLAY ── -->
              <div id="OptSection_display" style="display:none">
                <div class="opt-section-title" style="margin-top:0">Site Theme</div>
                <div id="ThemePicker" class="theme-picker"></div>
                <div class="opt-section-title">Game Size</div>
                <div class="opt-chip-row" style="margin-bottom:20px">
                  <button id="ScaleFull"    onclick="setGameScale('full')"    class="hat-opt">Fullscreen</button>
                  <button id="ScaleCompact" onclick="setGameScale('compact')" class="hat-opt active">Compact</button>
                </div>
                <div class="opt-section-title">Visual</div>
                <div class="opt-toggle-group">
                  <label class="opt-toggle"><input id="ScreenShakeToggle" type="checkbox" onchange="setScreenShakePref(this.checked)" checked><span>Screen Shake</span></label>
                  <label class="opt-toggle"><input id="ShowPingToggle"    type="checkbox" onchange="setShowPingPref(this.checked)"><span>Show Ping</span></label>
                  <label class="opt-toggle"><input id="ShowFPSToggle"     type="checkbox" onchange="setShowFPSPref(this.checked)"><span>Show FPS</span></label>
                  <label class="opt-toggle"><input id="LegacyGraphics"    type="checkbox"><span>Legacy Graphics</span></label>
                </div>
              </div>

              <!-- ── GAMEPLAY ── -->
              <div id="OptSection_gameplay" style="display:none">
                <div class="opt-section-title" style="margin-top:0">General</div>
                <div class="opt-toggle-group">
                  <label class="opt-toggle"><input id="ProfanityToggleOptions" class="profanity-toggle" type="checkbox" onchange="setProfanityFilter(this.checked)" checked><span>Profanity Filter</span></label>
                  <label class="opt-toggle"><input id="RallyCounterToggle" type="checkbox" onchange="setRallyCounterPref(this.checked)"><span>Show Rally Counter</span></label>
                  <label class="opt-toggle"><input id="PointFlashToggle"   type="checkbox" onchange="setPointFlashPref(this.checked)"   checked><span>Point Flash Animation</span></label>
                </div>
                <div class="opt-section-title">Session Info</div>
                <div class="opt-about-block">
                  <div class="opt-about-row"><span>Server</span><span id="OptServerRegion">Railway</span></div>
                  <div class="opt-about-row"><span>Ping</span><span id="OptPingDisplay">—</span></div>
                  <div class="opt-about-row"><span>Version</span><span id="OptVersion">—</span></div>
                </div>
              </div>

              <!-- ── CONTROLS ── -->
              <div id="OptSection_controls" style="display:none">
                <div class="opt-controls-head">
                  <div>
                    <div class="opt-section-title" style="margin-top:0">Player Controls</div>
                    <div class="opt-label-dim">Click a control, then press the key you want.</div>
                  </div>
                  <button onclick="resetSlimeKeybinds()" class="hat-opt" type="button">Reset</button>
                </div>
                <div id="KeybindGrid" class="opt-keybind-grid"></div>
                <div class="opt-section-title">General</div>
                <div class="opt-static-keys">
                  <div><span>Pause / Menu</span><b>ESC</b></div>
                  <div><span>Advance / Rematch</span><b>SPACE</b></div>
                  <div><span>Emotes</span><b>1 - 4</b></div>
                </div>
              </div>

            </div><!-- /opt-content -->
          </div><!-- /opt-body -->
        </div><!-- /opt-panel -->
`;

function renderKeybindControls() {
  var grid = document.getElementById('KeybindGrid');
  if (!grid || typeof slimeKeybinds === 'undefined') return;
  var rows = [
    ['Player 1', 'p1Left', 'Move Left'], ['Player 1', 'p1Right', 'Move Right'], ['Player 1', 'p1Jump', 'Jump'],
    ['Player 2', 'p2Left', 'Move Left'], ['Player 2', 'p2Right', 'Move Right'], ['Player 2', 'p2Jump', 'Jump']
  ];
  grid.innerHTML = rows.map(function(row) {
    var waiting = _listeningForKeybind === row[1];
    var label = waiting ? 'PRESS KEY' : keyCodeLabel(slimeKeybinds[row[1]]);
    return '<button class="opt-keybind' + (waiting ? ' listening' : '') + '" onclick="startKeybindListen(\'' + row[1] + '\')" type="button">' +
      '<span>' + row[0] + '</span><em>' + row[2] + '</em><b>' + label + '</b></button>';
  }).join('');
}

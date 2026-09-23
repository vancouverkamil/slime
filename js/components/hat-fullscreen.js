document.getElementById('HatFullscreenOverlay').innerHTML = `
  <div style="position:relative;padding:18px 22px;background:#040012;border:1px solid rgba(var(--accent-rgb),.3);border-radius:4px;display:flex;flex-direction:column;align-items:center;">
    <div style="display:flex;align-items:center;width:100%;margin-bottom:12px;">
      <span style="color:var(--accent);letter-spacing:4px;font-size:var(--fs-xs);text-transform:uppercase;text-shadow:0 0 10px rgba(var(--accent-rgb),.4);">&#9998; Hat Studio</span>
      <button onclick="closeHatFullscreen()" class="hat-opt" style="margin-left:auto;font-size:var(--fs-2xs);padding:3px 10px;">&#10005; DONE</button>
    </div>
    <!-- toolbar row 1: brushes + color + sizes -->
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px;align-items:center;width:100%;">
      <button id="FSDrawBrushPen"    onclick="setDrawBrush('pen')"    class="draw-tool-btn active">&#9998; Pen</button>
      <button id="FSDrawBrushMarker" onclick="setDrawBrush('marker')" class="draw-tool-btn">&#9646; Marker</button>
      <button id="FSDrawBrushEraser" onclick="setDrawBrush('eraser')" class="draw-tool-btn">&#9702; Erase</button>
      <div id="FSDrawColorDot" onclick="cycleDrawColor()" title="Brush color" style="width:20px;height:20px;border-radius:50%;border:2px solid rgba(var(--accent-rgb),.35);cursor:pointer;flex-shrink:0;background:#ffffff;margin-left:2px;"></div>
      <span style="color:#282828;margin:0 4px;">|</span>
      <button id="FSDrawSizeS"  onclick="setDrawSize(2)"  class="draw-tool-btn active">S</button>
      <button id="FSDrawSizeM"  onclick="setDrawSize(5)"  class="draw-tool-btn">M</button>
      <button id="FSDrawSizeL"  onclick="setDrawSize(11)" class="draw-tool-btn">L</button>
      <button id="FSDrawSizeXL" onclick="setDrawSize(22)" class="draw-tool-btn">XL</button>
    </div>
    <!-- toolbar row 2: undo/redo + clear -->
    <div style="display:flex;gap:5px;margin-bottom:10px;align-items:center;width:100%;">
      <button id="FSDrawUndo" onclick="hatUndo()" class="draw-tool-btn" title="Undo (Ctrl+Z)" style="opacity:.3;cursor:default;">&#8617; Undo</button>
      <button id="FSDrawRedo" onclick="hatRedo()" class="draw-tool-btn" title="Redo (Ctrl+Y)" style="opacity:.3;cursor:default;">&#8618; Redo</button>
      <button onclick="saveCurrentHatPreset()" class="hat-opt" style="font-size:var(--fs-2xs);padding:3px 10px;">SAVE</button>
      <button onclick="clearHatDrawing()" class="hat-opt" style="margin-left:auto;font-size:var(--fs-2xs);padding:3px 10px;">&#10005; Clear All</button>
    </div>
    <canvas id="HatFullscreenCanvas" width="500" height="580" style="border:1px solid rgba(var(--accent-rgb),.3);cursor:crosshair;display:block;max-width:90vw;max-height:75vh;"></canvas>
    <div style="color:rgba(var(--accent-rgb),.2);font-size:var(--fs-2xs);letter-spacing:1px;margin-top:8px;">draw above the dashed line &nbsp;&middot;&nbsp; center &#8593;</div>
  </div>
`;

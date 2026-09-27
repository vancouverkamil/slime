// Core: global keyboard shortcuts (dev menu, Hat Studio undo/redo).
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); toggleDevMenu(); }
  var studioOpen = (document.getElementById('OptionsDiv') || {}).style &&
                   document.getElementById('OptionsDiv').style.display !== 'none' &&
                   _activeOptSection === 'studio';
  var fsOpen = (document.getElementById('HatFullscreenOverlay') || {}).classList &&
               document.getElementById('HatFullscreenOverlay').classList.contains('fs-open');
  if (studioOpen || fsOpen) {
    if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); hatUndo(); }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { e.preventDefault(); hatRedo(); }
  }
});

// Site color themes. Loaded early (not deferred) so the saved theme applies before first paint.
var SITE_THEMES = [
  { id: 'original',  name: 'Original',         swatch: ['#00ffcc', '#ff00cc', '#f1d37a'] },
  { id: 'goldeneye', name: 'GoldenEye 007',    swatch: ['#ff2b2b', '#f2f2f2', '#0b0b0b'] },
  { id: 'arctic',    name: 'Arctic',           swatch: ['#7fd8ff', '#a9b8ff', '#e4f3ff'] },
  { id: 'nebula',    name: 'Nebula',           swatch: ['#b69aff', '#5ee7ff', '#e3d8ff'] },
  { id: 'graphite',  name: 'Graphite',         swatch: ['#8fb8de', '#d7dee7', '#171c24'] },
];

function getSiteTheme() {
  var saved = null;
  try { saved = localStorage.getItem('slime_theme'); } catch (e) {}
  for (var i = 0; i < SITE_THEMES.length; i++) if (SITE_THEMES[i].id === saved) return saved;
  return 'original';
}

function applySiteTheme(id) {
  var root = document.documentElement;
  if (!id || id === 'original') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);
}

function setSiteTheme(id) {
  try { localStorage.setItem('slime_theme', id); } catch (e) {}
  applySiteTheme(id);
  renderThemePicker();
}

function renderThemePicker() {
  var el = document.getElementById('ThemePicker');
  if (!el) return;
  var current = getSiteTheme();
  el.innerHTML = SITE_THEMES.map(function(t) {
    var dots = t.swatch.map(function(c) { return '<i style="background:' + c + '"></i>'; }).join('');
    return '<button type="button" class="theme-chip' + (t.id === current ? ' active' : '') + '" onclick="setSiteTheme(\'' + t.id + '\')">' +
      '<span class="theme-dots">' + dots + '</span>' + t.name + '</button>';
  }).join('');
}

applySiteTheme(getSiteTheme());

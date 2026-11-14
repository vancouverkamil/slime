// params.js -- Real Lighting: the pure part. One directional light (the
// moon at night, a low warm sun at sunset, a high soft sun by day) hanging
// in the TOP-LEFT of the screen, so every shadow falls down and to the
// right. No DOM, no canvas: unit tested (desktop/test/life_lighting.test.cjs).
//
// Projection (3/4 top-down view). A sprite pixel drawn at screen y, whose
// caster stands on base line `base`, is (base - y) px above the ground. The
// moon throws it (sx, sy) ground px per px of height, so it lands at
//   X' = X + (base - Y) * sx,   Y' = base + (base - Y) * sy
// -- an affine map, so a whole sprite is projected with ONE setTransform.

// Kinds that never cast a ground shadow: things in the sky or already
// carrying their own shadow, and screen-wide effects.
export const NO_SHADOW_KINDS = new Set(['bird', 'drone', 'petals', 'fireflies', 'holo_koi', 'radar']);

// Height (px) above which a caster's shadow stops growing: a tall tower
// throws a long shadow, never one across half the town.
export const SHADOW_CAP = 150;

const LOOKS = {
  // rgb strings are 'r, g, b'. shadowAlpha: ground shadow strength.
  // rim: moonlit edge strength. shafts: light-shaft strength. wash: corner glow.
  night: { sx: 0.55, sy: 0.26, shadow: '10, 8, 44', shadowAlpha: 0.62, light: '190, 214, 255', rim: 0.8, shafts: 0.11, wash: 0.26, moon: true },
  sunset: { sx: 0.85, sy: 0.32, shadow: '60, 16, 56', shadowAlpha: 0.45, light: '255, 196, 150', rim: 0.55, shafts: 0.07, wash: 0.18, moon: false },
  day: { sx: 0.36, sy: 0.18, shadow: '50, 34, 84', shadowAlpha: 0.3, light: '255, 244, 220', rim: 0.28, shafts: 0.035, wash: 0.1, moon: false },
};

// Indoors: overhead room light, so shadows fall short and mostly down; no
// light shafts; `interior` makes the Moonlight tool the room light
// (lighting/interior.js).
export const INTERIOR = { sx: 0.14, sy: 0.3, shadow: '6, 2, 26', shadowAlpha: 0.5, light: '170, 210, 255', rim: 0.45, shafts: 0, wash: 0.2, moon: false, interior: true };

// The light for a renderer look (timeofday.phaseLook).
export function lightFor(look) {
  if (!look) return null;
  if (look.grade === null) return INTERIOR;          // interiors (phaseLook gives them no grade)
  return LOOKS[look.phase] || LOOKS.day;
}

// 2D affine matrices as [a, b, c, d, e, f] (canvas setTransform order).
export function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

// Ground projection for a caster on base line `base` (world px).
export function projection(base, sx, sy) {
  return [1, 0, -sx, -sy, base * sx, base + base * sy];
}

// sx/sy scaled down so a caster taller than SHADOW_CAP keeps a capped shadow.
export function cappedSlope(light, height) {
  const f = height > SHADOW_CAP ? SHADOW_CAP / height : 1;
  return { sx: light.sx * f, sy: light.sy * f };
}

// Does this drawn entity cast a shadow?
export function castsShadow(e) {
  if (!e || e.flat || NO_SHADOW_KINDS.has(e.kind)) return false;
  return Number.isFinite(e.sortY) && e.sortY < 1e5 && e.sortY > -1e5;
}

// An animated prop (swaying trees, grass, palms) changes every frame, so it
// is never baked: it is recorded per frame like a character, and its rim,
// shadow and shading move with it. 'auto-lit' only flips with the phase.
// A prop with a footprint shadow (manifest meta "shadow") is baked anyway:
// its shadow does not change with the frame.
export function isLive(e) {
  return !!(e && e.kind === 'prop' && e.anim && e.anim !== 'auto-lit' && !footprintOf(e));
}

// A low, round prop's ground footprint in WORLD px, from manifest meta
// "shadow": {footprint: [x, y, w, h] (sprite px, an ellipse's box), height}.
export function footprintOf(e) {
  const s = e && e.meta && e.meta.shadow;
  const f = s && Array.isArray(s.footprint) && s.footprint.length === 4 ? s.footprint : null;
  if (!f) return null;
  const x = e.flip ? e.w - f[0] - f[2] : f[0];
  return { cx: e.x + x + f[2] / 2, cy: e.y + f[1] + f[3] / 2, rx: f[2] / 2, ry: f[3] / 2, height: Math.max(1, s.height || 8) };
}

// A surface the caster's shadow ALSO falls on, drawn over the sprites there
// (ground shadows are under every sprite, so a tree standing in a fountain
// would otherwise throw its shadow under the water): manifest meta
// "shadow": {onto: [x, y, w, h]} (sprite px, an ellipse's box) -> WORLD px.
export function ontoOf(e) {
  const s = e && e.meta && e.meta.shadow;
  const f = s && Array.isArray(s.onto) && s.onto.length === 4 ? s.onto : null;
  if (!f) return null;
  const x = e.flip ? e.w - f[0] - f[2] : f[0];
  return { cx: e.x + x + f[2] / 2, cy: e.y + f[1] + f[3] / 2, rx: f[2] / 2, ry: f[3] / 2 };
}

// How dark this caster's shadow is, 0..1 (manifest meta "shadow":
// {strength}); 1 when unset. The fountain basin and the lion spring use
// lighter shadows so they sit softly on the water.
export function shadowStrength(e) {
  const v = e && e.meta && e.meta.shadow && e.meta.shadow.strength;
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

// How far a shadow can reach past a caster (cull margin, world px).
export function reach(light) { return Math.ceil(SHADOW_CAP * Math.max(light.sx, light.sy)) + 8; }

// ---- Player-facing controls (System menu > Lighting) ----------------------
// Every lighting tool is its own switch; real_lighting is the master switch.
// Defaults: keep the cast shadows, the shading and a broad moonlight over the
// town; the white edge highlights and the light shafts start off. Sliders are
// percentages (ints) -- life_rpg_save.py validates the same keys and ranges.
export const LIGHTING_DEFAULTS = {
  real_lighting: true, light_shadows: true, light_shading: true, light_moon: true,
  light_rim: false, light_shafts: false, light_intensity: 100, light_contrast: 100, light_shadow: 100,
};
export const LIGHTING_RANGES = { light_intensity: [0, 200], light_contrast: [50, 150], light_shadow: [0, 200] };

function pct(settings, key) {
  const v = settings ? settings[key] : undefined;
  const [lo, hi] = LIGHTING_RANGES[key];
  const n = Number.isFinite(v) ? v : LIGHTING_DEFAULTS[key];
  return Math.min(hi, Math.max(lo, n)) / 100;
}

function flag(settings, key) {
  const v = settings ? settings[key] : undefined;
  return typeof v === 'boolean' ? v : LIGHTING_DEFAULTS[key];
}

// Save settings -> the options the Lighting layer runs with.
export function lightingOptions(settings) {
  return {
    enabled: flag(settings, 'real_lighting'),
    shadows: flag(settings, 'light_shadows'), shading: flag(settings, 'light_shading'),
    moon: flag(settings, 'light_moon'), rim: flag(settings, 'light_rim'), shafts: flag(settings, 'light_shafts'),
    intensity: pct(settings, 'light_intensity'), contrast: pct(settings, 'light_contrast'), shadow: pct(settings, 'light_shadow'),
  };
}

// A phase's light with the sliders applied (pure; the bake key sx/sy is unchanged).
export function tuneLight(light, o) {
  if (!light) return null;
  return {
    ...light,
    shadowAlpha: Math.min(0.95, light.shadowAlpha * o.shadow),
    rim: light.rim * o.intensity, shafts: light.shafts * o.intensity, wash: light.wash * o.intensity,
  };
}

// Do this frame's options need the shadow/caster layers at all?
export function needsLayers(o) { return !!(o.shadows || o.shading || o.rim || o.shafts); }

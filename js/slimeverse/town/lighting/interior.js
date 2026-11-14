// lighting/interior.js -- Real Lighting indoors: the "room light" that
// replaces the town's moonlight inside a building (lighting/index.js calls
// it when the Moonlight tool is on and the scene is an interior).
//   1. a light cool neo-future grade (multiply) for the mood;
//   2. one soft fill over the middle of the room (soft-light), then warm
//      pools from a grid of ceiling downlights spread over the floor;
//   3. coloured glow from everything that emits light -- screens, consoles,
//      lamps, tanks, boards -- added back over the grade ('lighter');
//   4. city light spilling from each window onto the floor below it.
// Pure presentation: reads the scene's entities and tiles, stores nothing.

// sprite -> [[x, y, radius, 'r, g, b'], ...] in sprite px.
export const INTERIOR_GLOWS = {
  computer: [[8, 6, 14, '79, 242, 255']],
  design_station: [[17, 9, 24, '79, 242, 255'], [36, 11, 14, '255, 63, 164']],
  large_printer: [[25, 13, 10, '99, 217, 138']],
  moodboard: [[24, 15, 22, '255, 63, 164']],
  client_board: [[24, 15, 26, '79, 242, 255']],
  treadmill: [[16, 5, 12, '99, 217, 138']],
  squat_rack: [[16, 24, 14, '79, 242, 255']],
  lamp: [[8, 6, 28, '255, 196, 120']],
  server_rack: [[8, 14, 14, '79, 242, 255']],
  specimen_tank: [[8, 16, 18, '79, 242, 255']],
  mission_control: [[32, 14, 32, '79, 242, 255']],
  agent_station: [[16, 10, 16, '79, 242, 255']],
  automation_console: [[24, 12, 20, '180, 107, 255']],
  bank_dashboard: [[24, 12, 20, '255, 211, 107']],
  activity_monitor: [[24, 10, 18, '79, 242, 255']],
  report_archive: [[16, 12, 14, '79, 242, 255']],
  arcade_cabinet: [[8, 10, 14, '255, 63, 164']],
  vending: [[8, 12, 14, '255, 63, 164']],
  water_cooler: [[8, 8, 8, '159, 246, 255']],
  idea_board: [[24, 15, 18, '180, 107, 255']],
  whiteboard: [[24, 15, 16, '200, 220, 255']],
  application_board: [[24, 15, 14, '255, 211, 107']],
};

const GRADE = 'rgb(214, 208, 240)';          // was (176, 164, 226): rooms read too dark
const WINDOW_LIGHT = '120, 170, 255';
const CEILING_LIGHT = '255, 238, 210';
const CEILING_SPACING = 5;                    // tiles between downlights

function radial(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(' + rgb + ', ' + a + ')');
  g.addColorStop(0.4, 'rgba(' + rgb + ', ' + a * 0.4 + ')');
  g.addColorStop(1, 'rgba(' + rgb + ', 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Window tiles (any wall_window_bottom*) -> world points just below them.
function windowSpots(map) {
  if (map.windowSpots && map.windowSpotsFor === map.tiles) return map.windowSpots;
  const out = [];
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const name = map.get(x, y);
      if (typeof name === 'string' && name.startsWith('wall_window_bottom')) out.push([x * 16 + 8, y * 16 + 26]);
    }
  }
  map.windowSpots = out;
  map.windowSpotsFor = map.tiles;
  return out;
}

// Floor tiles (not walls) -> an even grid of ceiling downlight spots.
function ceilingSpots(map) {
  if (map.ceilingSpots && map.ceilingSpotsFor === map.tiles) return map.ceilingSpots;
  let x0 = Infinity; let x1 = -1; let y0 = Infinity; let y1 = -1;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const name = map.get(x, y);
      if (typeof name !== 'string' || name.startsWith('wall')) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  const out = [];
  if (x1 >= x0) {
    const cols = Math.max(1, Math.round((x1 - x0 + 1) / CEILING_SPACING));
    const rows = Math.max(1, Math.round((y1 - y0 + 1) / CEILING_SPACING));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        out.push([(x0 + (c + 0.5) * (x1 - x0 + 1) / cols) * 16, (y0 + (r + 0.5) * (y1 - y0 + 1) / rows) * 16]);
      }
    }
  }
  map.ceilingSpots = out;
  map.ceilingSpotsFor = map.tiles;
  return out;
}

export function roomLight(ctx, scene, light) {
  const w = scene.pixelW;
  const h = scene.pixelH;
  const k = light.wash / 0.2;                       // the intensity slider (tuneLight scales wash)
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = GRADE;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  const pool = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.6);
  pool.addColorStop(0, 'rgba(' + light.light + ', ' + Math.min(1, 0.55 * k) + ')');
  pool.addColorStop(1, 'rgba(' + light.light + ', 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of ceilingSpots(scene.map)) {
    radial(ctx, x, y, CEILING_SPACING * 13, CEILING_LIGHT, Math.min(0.4, 0.15 * k));   // the pool on the floor
    radial(ctx, x, y, 12, CEILING_LIGHT, Math.min(0.5, 0.14 * k));                     // brighter right under it
  }
  for (const [x, y] of windowSpots(scene.map)) radial(ctx, x, y, 30, WINDOW_LIGHT, Math.min(0.5, 0.16 * k));
  for (const e of scene.entities) {
    const parts = INTERIOR_GLOWS[e.sprite];
    if (!parts) continue;
    for (const [x, y, r, rgb] of parts) radial(ctx, e.x + x, e.y + y, r, rgb, Math.min(0.8, 0.32 * k));
  }
  ctx.restore();
}

// registry.js -- BuildingRegistry. One entry per building: its sprite,
// what using its door does, and its prompt. Adding a future building is
// one entry here + one placement in data/scenes/city.js (+ an interior
// scene when it opens). No building holds data or logic of its own.
//
// kind: 'enter'        door leads to an interior scene
//       'coming_soon'  placeholder: a short, honest "not open yet" note
//       'closed'       not open yet and silent: no prompt, the door does nothing
//       'ambient'      environmental storytelling only (the condo)

export const BUILDINGS = {
  career: {
    id: 'career', sprite: 'bld_career', size: [208, 176], kind: 'enter', scene: 'career_lobby',
    name: 'Money Radar Career Center', prompt: 'Enter Career Center',
  },
  finance: {
    id: 'finance', sprite: 'bld_bank', size: [160, 144], kind: 'enter', scene: 'finance_office',
    name: 'The Bank', prompt: 'Enter The Bank',
  },
  strategy: {
    id: 'strategy', sprite: 'bld_strategy', size: [160, 160], kind: 'enter', scene: 'strategy_studio',
    name: 'Strategy Studio', prompt: 'Enter Strategy Studio',
  },
  gfx: {
    id: 'gfx', sprite: 'bld_gfx', size: [128, 128], kind: 'enter', scene: 'gfx_studio',
    name: 'Design Studio', prompt: 'Enter DESIGN',
  },
  fitness: {
    id: 'fitness', sprite: 'bld_fitness', size: [128, 128], kind: 'enter', scene: 'fitness_gym',
    name: 'FITNESS', prompt: 'Enter FITNESS',
  },
  condo: {
    id: 'condo', sprite: 'bld_condo', size: [176, 304], kind: 'ambient',
    name: 'Waterfront Residences', prompt: 'Look up',
    lines: ['Waterfront Residences', 'A good reason to keep moving.'],
  },
  laboratory: {
    id: 'laboratory', sprite: 'bld_laboratory', size: [224, 192], kind: 'enter', scene: 'laboratory',
    name: 'The Laboratory', prompt: 'Enter The Laboratory',
  },
  lab_annex: {
    id: 'lab_annex', sprite: 'bld_lab_annex', size: [128, 112], kind: 'coming_soon',
    name: 'Lab Annex', prompt: 'Read the plaque',
    lines: ['LAB ANNEX', 'Sealed for now. A soft hum comes from inside.'],
  },
  lab_pod: {
    id: 'lab_pod', sprite: 'bld_lab_pod', size: [96, 96], kind: 'coming_soon',
    name: 'Snack Pod', prompt: 'Look at the pod',
    lines: ['SNACK POD', 'Prototype snacks. The label says: not yet tested on humans.'],
  },
};

// Slimeverse-only buildings (art: scripts/town_buildings.py in the slime repo).
// Walking north into their door is handled by js/slimeverse/town/slime_town.js.
BUILDINGS.hat_shop = {
  id: 'hat_shop', sprite: 'bld_hat_shop', size: [128, 128], kind: 'enter',
  name: 'Hat Shop', prompt: 'Enter the HAT SHOP',
};
BUILDINGS.final4 = {
  id: 'final4', sprite: 'bld_final4', size: [144, 176], kind: 'enter',
  name: 'Final 4', prompt: 'Enter the FINAL 4',
};

export function buildingDef(id) {
  const def = BUILDINGS[id];
  if (!def) throw new Error('unknown building ' + id);
  return def;
}

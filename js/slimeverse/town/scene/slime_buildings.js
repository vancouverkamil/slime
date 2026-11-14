// slime_buildings.js -- adds the Slimeverse's own buildings to the copied town.
import { TOWN } from './town.js';

// The FINAL 4 tower west of the Laboratory and the HAT SHOP east of the
// Strategy Studio, standing on the same ground line as the north row (art:
// scripts/town_buildings.py). Their plots are cleared of the grove trees and
// props that grew there in the original town.
export const SLIME_BUILDINGS = [
  { id: 'final4', tile: [3, 1] },     // 144 x 176: tiles x 3-11, rows 1-11
  { id: 'hat_shop', tile: [70, 4] },  // 128 x 128: tiles x 70-77, rows 4-11 (door clear of the curb lamp at x 75)
];
const LOTS = [[2, 0, 11, 12], [69, 2, 10, 10]];   // [tx, ty, w, h] cleared tiles (one tile of margin)
function onLot(p) {
  const tx = p.tile ? p.tile[0] : Math.floor((p.at[0] + 8) / 16);
  const ty = p.tile ? p.tile[1] : Math.floor((p.at[1] + 16) / 16);
  return LOTS.some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
}
TOWN.props = TOWN.props.filter((p) => !onLot(p));
TOWN.buildings = TOWN.buildings.concat(SLIME_BUILDINGS);

export { TOWN };

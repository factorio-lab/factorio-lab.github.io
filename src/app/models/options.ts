import { data } from 'src/data';

import { Game } from './enum/game';
import { Option } from './option';

export const modOptions = data.mods
  .filter((m) => m.game === Game.Factorio)
  .map((m): Option => ({ label: m.name, value: m.id }));

export interface Options {
  categories: Option[];
  items: Option[];
  beacons: Option[];
  belts: Option[];
  pipes: Option[];
  cargoWagons: Option[];
  fluidWagons: Option[];
  fuels: Option[];
  modules: Option[];
  proliferatorModules: Option[];
  machines: Option[];
  recipes: Option[];
}

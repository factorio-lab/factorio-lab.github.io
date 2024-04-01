import { Entities } from '../entities';
import { CategoryJson } from './category';
import { DefaultsJson } from './defaults';
import { IconJson } from './icon';
import { ItemJson } from './item';
import { RecipeJson } from './recipe';

export interface ModData {
  version: Entities<string>;
  expensive?: boolean;
  categories: CategoryJson[];
  icons: IconJson[];
  items: ItemJson[];
  recipes: RecipeJson[];
  limitations: Entities<string[]>;
  defaults?: DefaultsJson;
}

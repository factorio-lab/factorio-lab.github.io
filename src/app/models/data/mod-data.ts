import { Entities } from '../utils';
import { CategoryJson } from './category';
import { DefaultsJson } from './defaults';
import { IconJson } from './icon';
import { ItemJson } from './item';
import { RecipeJson } from './recipe';

export interface ModData {
  version: Entities;
  expensive?: boolean;
  categories: CategoryJson[];
  icons: IconJson[];
  items: ItemJson[];
  recipes: RecipeJson[];
  limitations: Entities<string[]>;
  defaults?: DefaultsJson;
}

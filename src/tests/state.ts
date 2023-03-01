import {
  Datasets,
  ItemObjectives,
  Items,
  LabState,
  Machines,
  Preferences,
  RecipeObjectives,
  Recipes,
  Settings,
} from '~/store';
import { Mocks } from './';

const datasetsState = Datasets.datasetsReducer(
  undefined,
  new Datasets.LoadModAction({
    data: {
      id: Settings.initialSettingsState.modId,
      value: Mocks.Data,
    },
    hash: {
      id: Settings.initialSettingsState.modId,
      value: Mocks.Hash,
    },
    i18n: null,
  })
);

export const initialState: LabState = {
  datasetsState,
  itemObjectivesState: ItemObjectives.initialItemObjectivesState,
  recipeObjectivesState: RecipeObjectives.initialRecipeObjectivesState,
  itemsState: Items.initialItemsState,
  recipesState: Recipes.initialRecipesState,
  machinesState: Machines.initialMachinesState,
  settingsState: Settings.initialSettingsState,
  preferencesState: Preferences.initialPreferencesState,
};

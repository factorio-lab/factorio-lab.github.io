import { createSelector } from '@ngrx/store';

import { coalesce } from '~/helpers';
import { Entities, Rational, RecipeSettings } from '~/models';
import { RecipeUtility } from '~/utilities';
import { LabState } from '../';
import * as Items from '../items';
import * as Machines from '../machines';
import * as Settings from '../settings';
import { RecipesState } from './recipes.reducer';

/* Base selector functions */
export const recipesState = (state: LabState): RecipesState =>
  state.recipesState;

/* Complex selectors */
export const getRecipesState = createSelector(
  recipesState,
  Machines.getMachinesState,
  Settings.getDataset,
  (state, machinesState, data) => {
    const value: Entities<RecipeSettings> = {};
    const defaultExcludedRecipeIds = new Set(
      coalesce(data.defaults?.excludedRecipeIds, []),
    );

    for (const recipe of data.recipeIds.map((i) => data.recipeEntities[i])) {
      const s: RecipeSettings = { ...state[recipe.id] };

      if (s.excluded == null)
        s.excluded = defaultExcludedRecipeIds.has(recipe.id);

      if (s.machineId == null)
        s.machineId = RecipeUtility.bestMatch(
          recipe.producers,
          machinesState.ids,
        );

      const machine = data.machineEntities[s.machineId];
      const def = machinesState.entities[s.machineId];

      if (recipe.isBurn) {
        s.fuelId = Object.keys(recipe.in)[0];
      } else {
        s.fuelId = s.fuelId ?? def?.fuelId;
      }

      s.fuelOptions = def?.fuelOptions;

      if (machine != null && RecipeUtility.allowsModules(recipe, machine)) {
        s.moduleOptions = RecipeUtility.moduleOptions(machine, recipe.id, data);

        if (s.moduleIds == null)
          s.moduleIds = RecipeUtility.defaultModules(
            s.moduleOptions,
            coalesce(def.moduleRankIds, []),
            machine.modules ?? Rational.zero,
          );

        if (s.beacons == null) s.beacons = [{}];

        s.beacons = s.beacons.map((b) => ({ ...b }));

        for (const beaconSettings of s.beacons) {
          beaconSettings.count = beaconSettings.count ?? def.beaconCount;
          beaconSettings.id = beaconSettings.id ?? def.beaconId;

          if (beaconSettings.id != null) {
            const beacon = data.beaconEntities[beaconSettings.id];
            beaconSettings.moduleOptions = RecipeUtility.moduleOptions(
              beacon,
              recipe.id,
              data,
            );

            if (beaconSettings.moduleIds == null)
              beaconSettings.moduleIds = RecipeUtility.defaultModules(
                beaconSettings.moduleOptions,
                coalesce(def.beaconModuleRankIds, []),
                beacon.modules,
              );
          }
        }
      } else {
        // Machine doesn't support modules, remove any
        delete s.moduleIds;
        delete s.beacons;
      }

      if (s.beacons) {
        for (const beaconSettings of s.beacons) {
          if (
            beaconSettings.total != null &&
            (beaconSettings.count == null || beaconSettings.count.isZero())
          )
            // No actual beacons, ignore the total beacons
            delete beaconSettings.total;
        }
      }

      s.overclock = s.overclock ?? def?.overclock;

      value[recipe.id] = s;
    }

    return value;
  },
);

export const getExcludedRecipeIds = createSelector(
  getRecipesState,
  (recipesState) =>
    Object.keys(recipesState).filter((i) => recipesState[i].excluded),
);

export const getAdjustedDataset = createSelector(
  getRecipesState,
  getExcludedRecipeIds,
  Items.getItemsState,
  Settings.getAvailableRecipes,
  Settings.getCosts,
  Settings.getAdjustmentData,
  Settings.getDataset,
  (
    recipesState,
    excludedRecipeIds,
    itemsState,
    recipeIds,
    costs,
    adjustmentData,
    data,
  ) =>
    RecipeUtility.adjustDataset(
      recipeIds,
      excludedRecipeIds,
      recipesState,
      itemsState,
      adjustmentData,
      costs,
      data,
    ),
);

export const getAvailableItems = createSelector(getAdjustedDataset, (data) =>
  data.itemIds.filter((i) => data.itemRecipeIds[i].length),
);

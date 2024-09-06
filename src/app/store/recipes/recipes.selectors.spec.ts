import { ItemId, Mocks } from 'src/tests';
import { spread } from '~/helpers';
import { rational } from '~/models';
import { RecipeUtility } from '~/utilities';
import { initialState } from './recipes.reducer';
import * as Selectors from './recipes.selectors';

describe('Recipes Selectors', () => {
  const stringValue = 'value';

  describe('Base selector functions', () => {
    it('should get slices of state', () => {
      expect(
        Selectors.recipesState({
          recipesState: Mocks.RecipesStateInitial,
        } as any),
      ).toEqual(Mocks.RecipesStateInitial);
    });
  });

  describe('getRecipesState', () => {
    it('should return the recipe settings', () => {
      const result = Selectors.selectRecipesState.projector(
        initialState,
        Mocks.MachinesStateInitial,
        Mocks.SettingsStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(Object.keys(result).length).toEqual(
        Mocks.AdjustedDataset.recipeIds.length,
      );
    });

    it('should handle null settings', () => {
      const state = spread(initialState, {
        [Mocks.Item1.id]: { machineId: ItemId.AssemblingMachine3 },
      });
      const data = spread(Mocks.AdjustedDataset, {
        defaults: undefined,
        machineEntities: spread(Mocks.AdjustedDataset.machineEntities, {
          [ItemId.AssemblingMachine3]: spread(
            Mocks.AdjustedDataset.machineEntities[ItemId.AssemblingMachine3],
            { modules: undefined },
          ),
        }),
      });
      spyOn(RecipeUtility, 'allowsModules').and.returnValue(true);
      const result = Selectors.selectRecipesState.projector(
        state,
        spread(Mocks.MachinesStateInitial, { [ItemId.AssemblingMachine3]: {} }),
        Mocks.SettingsStateInitial,
        data,
      );
      expect(result[Mocks.Item1.id].machineId).toEqual(
        ItemId.AssemblingMachine3,
      );
    });

    it('should use machine override', () => {
      const state = spread(initialState, {
        [Mocks.Item1.id]: { machineId: stringValue },
      });
      const result = Selectors.selectRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.SettingsStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(result[Mocks.Item1.id].machineId).toEqual(stringValue);
    });

    it('should use modules override', () => {
      const modules = [
        { count: rational.one, id: stringValue },
        { count: rational(3n), id: ItemId.Module },
      ];
      const state = spread(initialState, { [Mocks.Item1.id]: { modules } });
      const result = Selectors.selectRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.SettingsStateInitial,
        Mocks.Dataset,
      );
      expect(result[Mocks.Item1.id].modules).toEqual(modules);
    });

    it('should reset invalid beacon totals', () => {
      const state = spread(initialState, {
        [Mocks.Item1.id]: {
          beacons: [
            {
              total: rational(8n),
              count: rational.zero,
              id: ItemId.Beacon,
              modules: [{ count: rational(2n), id: ItemId.Module }],
            },
          ],
        },
      });
      const result = Selectors.selectRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.SettingsStateInitial,
        Mocks.Dataset,
      );
      expect(result[Mocks.Item1.id].beacons?.[0].total).toBeUndefined();
    });
  });

  describe('getAvailableItems', () => {
    it('should return items with some recipe available to produce it', () => {
      const result = Selectors.selectAvailableItems.projector(
        Mocks.AdjustedDataset,
      );
      // Cannot produce wood in vanilla Factorio
      expect(result.length).toEqual(Mocks.AdjustedDataset.itemIds.length - 1);
    });
  });
});

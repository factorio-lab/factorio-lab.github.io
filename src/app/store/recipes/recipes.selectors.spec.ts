import { ItemId, Mocks } from 'src/tests';
import { rational } from '~/models';
import { RecipeUtility } from '~/utilities';
import { initialRecipesState } from './recipes.reducer';
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
      const result = Selectors.getRecipesState.projector(
        initialRecipesState,
        Mocks.MachinesStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(Object.keys(result).length).toEqual(
        Mocks.AdjustedDataset.recipeIds.length,
      );
    });

    it('should handle null settings', () => {
      const state = {
        ...initialRecipesState,
        ...{ [Mocks.Item1.id]: { machineId: ItemId.AssemblingMachine3 } },
      };
      const data = {
        ...Mocks.AdjustedDataset,
        ...{
          defaults: undefined,
          machineEntities: {
            ...Mocks.AdjustedDataset.machineEntities,
            ...{
              [ItemId.AssemblingMachine3]: {
                ...Mocks.AdjustedDataset.machineEntities[
                  ItemId.AssemblingMachine3
                ],
                ...{ modules: undefined },
              },
            },
          },
        },
      };
      spyOn(RecipeUtility, 'allowsModules').and.returnValue(true);
      const result = Selectors.getRecipesState.projector(
        state,
        {
          ...Mocks.MachinesStateInitial,
          ...{
            entities: {
              ...Mocks.MachinesStateInitial.entities,
              ...{ [ItemId.AssemblingMachine3]: {} },
            },
          },
        },
        data,
      );
      expect(result[Mocks.Item1.id].machineId).toEqual(
        ItemId.AssemblingMachine3,
      );
    });

    it('should use machine override', () => {
      const state = {
        ...initialRecipesState,
        ...{ [Mocks.Item1.id]: { machineId: stringValue } },
      };
      const result = Selectors.getRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(result[Mocks.Item1.id].machineId).toEqual(stringValue);
    });

    it('should use module override', () => {
      const state = {
        ...initialRecipesState,
        ...{ [Mocks.Item1.id]: { moduleIds: [stringValue] } },
      };
      const result = Selectors.getRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.Dataset,
      );
      expect(result[Mocks.Item1.id].moduleIds).toEqual([stringValue]);
    });

    it('should use beacon count override', () => {
      const state = {
        ...initialRecipesState,
        ...{ [Mocks.Item1.id]: { beacons: [{ count: rational(1n) }] } },
      };
      const result = Selectors.getRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.Dataset,
      );
      expect(result[Mocks.Item1.id].beacons?.[0].count).toEqual(rational(1n));
    });

    it('should use beacon module override', () => {
      const state = {
        ...initialRecipesState,
        ...{ [Mocks.Item1.id]: { beacons: [{ moduleIds: [stringValue] }] } },
      };
      const machines = {
        ...Mocks.MachinesStateInitial,
        ...{
          entities: {
            ...Mocks.MachinesStateInitial.entities,
            ...{
              [ItemId.AssemblingMachine3]: {
                ...Mocks.MachinesStateInitial.entities[
                  ItemId.AssemblingMachine3
                ],
                ...{
                  beaconModuleRankIds: undefined,
                },
              },
            },
          },
        },
      };
      const result = Selectors.getRecipesState.projector(
        state,
        machines,
        Mocks.AdjustedDataset,
      );
      expect(result[Mocks.Item1.id].beacons?.[0].moduleIds).toEqual([
        stringValue,
      ]);
    });

    it('should reset invalid beacon totals', () => {
      const state = {
        ...initialRecipesState,
        ...{
          [Mocks.Item1.id]: {
            beacons: [{ total: rational(8n), count: rational(0n) }],
          },
        },
      };
      const result = Selectors.getRecipesState.projector(
        state,
        Mocks.MachinesStateInitial,
        Mocks.Dataset,
      );
      expect(result[Mocks.Item1.id].beacons?.[0].total).toBeUndefined();
    });
  });

  describe('getAvailableItems', () => {
    it('should return items with some recipe available to produce it', () => {
      const result = Selectors.getAvailableItems.projector(
        Mocks.AdjustedDataset,
      );
      // Cannot produce wood in vanilla Factorio
      expect(result.length).toEqual(Mocks.AdjustedDataset.itemIds.length - 1);
    });
  });
});

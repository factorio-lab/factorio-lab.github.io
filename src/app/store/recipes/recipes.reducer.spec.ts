import { Mocks, ItemId } from 'src/tests';
import { RecipeSettingsField } from '~/models';
import { StoreUtility } from '~/utilities';
import { LoadAction } from '../app.actions';
import * as Actions from './recipes.actions';
import { recipesReducer, initialRecipesState } from './recipes.reducer';

describe('Recipes Reducer', () => {
  describe('LOAD', () => {
    it('should load recipe settings', () => {
      const result = recipesReducer(
        undefined,
        new LoadAction({ recipesState: Mocks.RecipeSettingsEntities } as any)
      );
      expect(result).toEqual(Mocks.RecipeSettingsEntities);
    });
  });

  describe('SET_FACTORY', () => {
    it('should set the factory', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.SetFactoryAction({
          id: Mocks.Recipe1.id,
          value: Mocks.Item1.id,
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id].factory).toEqual(Mocks.Item1.id);
    });

    it('should reset all other recipe settings', () => {
      const result = recipesReducer(
        {
          ...initialRecipesState,
          ...{
            [Mocks.Recipe1.id]: {
              factoryModules: ['test'],
              beaconCount: '20',
              beacon: 'test',
              beaconModules: ['test'],
            },
          },
        },
        new Actions.SetFactoryAction({
          id: Mocks.Recipe1.id,
          value: Mocks.Item1.id,
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id]).toEqual({ factory: Mocks.Item1.id });
    });
  });

  describe('SET_FACTORY_MODULES', () => {
    it('should set the modules', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.SetFactoryModulesAction({
          id: Mocks.Recipe1.id,
          value: [Mocks.Item1.id],
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id].factoryModules).toEqual([Mocks.Item1.id]);
    });
  });

  describe('SET_BEACON_COUNT', () => {
    it('should set the beacon count', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.SetBeaconCountAction({
          id: Mocks.Recipe1.id,
          value: '2',
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id].beaconCount).toEqual('2');
    });
  });

  describe('SET_BEACON', () => {
    it('should set the beacon', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.SetBeaconAction({
          id: Mocks.Recipe1.id,
          value: ItemId.Beacon,
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id].beacon).toEqual(ItemId.Beacon);
    });

    it('should reset the beacon modules', () => {
      const result = recipesReducer(
        {
          ...initialRecipesState,
          ...{ [Mocks.Recipe1.id]: { beaconModules: ['test'] } },
        },
        new Actions.SetBeaconAction({
          id: Mocks.Recipe1.id,
          value: ItemId.Beacon,
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id]).toEqual({ beacon: ItemId.Beacon });
    });
  });

  describe('SET_BEACON_MODULES', () => {
    it('should set the beacon module', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.SetBeaconModulesAction({
          id: Mocks.Recipe1.id,
          value: [Mocks.Item1.id],
          default: null,
        })
      );
      expect(result[Mocks.Recipe1.id].beaconModules).toEqual([Mocks.Item1.id]);
    });
  });

  describe('SET_OVERCLOCK', () => {
    it('should set the overclock', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.SetOverclockAction({
          id: Mocks.Recipe1.id,
          value: 200,
          default: 100,
        })
      );
      expect(result[Mocks.Recipe1.id].overclock).toEqual(200);
    });
  });

  describe('RESET', () => {
    it('should reset a recipe', () => {
      const result = recipesReducer(
        initialRecipesState,
        new Actions.ResetRecipeAction(Mocks.Recipe1.id)
      );
      expect(result[Mocks.Recipe1.id]).toBeUndefined();
    });
  });

  describe('RESET_FACTORY', () => {
    it('should call resetField', () => {
      spyOn(StoreUtility, 'resetFields');
      recipesReducer(null, new Actions.ResetFactoryAction());
      expect(StoreUtility.resetFields).toHaveBeenCalledWith(null, [
        RecipeSettingsField.Factory,
        RecipeSettingsField.FactoryModules,
        RecipeSettingsField.BeaconCount,
        RecipeSettingsField.Beacon,
        RecipeSettingsField.BeaconModules,
      ]);
    });
  });

  describe('RESET_BEACONS', () => {
    it('should call resetField', () => {
      spyOn(StoreUtility, 'resetFields');
      recipesReducer(null, new Actions.ResetBeaconsAction());
      expect(StoreUtility.resetFields).toHaveBeenCalledWith(null, [
        RecipeSettingsField.BeaconCount,
        RecipeSettingsField.Beacon,
        RecipeSettingsField.BeaconModules,
      ]);
    });
  });

  describe('RESET_OVERCLOCK', () => {
    it('should call resetField', () => {
      spyOn(StoreUtility, 'resetFields');
      recipesReducer(null, new Actions.ResetOverclockAction());
      expect(StoreUtility.resetFields).toHaveBeenCalledWith(null, [
        RecipeSettingsField.Overclock,
      ]);
    });
  });

  it('should return default state', () => {
    expect(recipesReducer(undefined, { type: 'Test' } as any)).toBe(
      initialRecipesState
    );
  });
});

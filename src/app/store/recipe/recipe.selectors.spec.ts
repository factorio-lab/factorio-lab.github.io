import * as Mocks from 'src/mocks';
import { ItemId, Rational } from '~/models';
import { initialSettingsState } from '../settings';
import { initialRecipeState } from './recipe.reducer';
import * as Selectors from './recipe.selectors';

describe('Recipe Selectors', () => {
  const stringValue = 'value';
  const numberValue = 2;

  describe('getRecipeSettings', () => {
    it('should handle null/empty values', () => {
      const result = Selectors.getRecipeSettings.projector({}, null, {});
      expect(Object.keys(result).length).toEqual(0);
    });

    it('should handle empty recipes', () => {
      const result = Selectors.getRecipeSettings.projector(
        {},
        { recipes: [] },
        {}
      );
      expect(Object.keys(result).length).toEqual(0);
    });

    it('should return the recipe settings', () => {
      const result = Selectors.getRecipeSettings.projector(
        initialRecipeState,
        Mocks.Data,
        initialSettingsState
      );
      expect(Object.keys(result).length).toEqual(Mocks.Data.recipeIds.length);
    });

    it('should use belt override', () => {
      const state = {
        ...initialRecipeState,
        ...{ [Mocks.Item1.id]: { belt: stringValue } },
      };
      const result = Selectors.getRecipeSettings.projector(
        state,
        Mocks.Data,
        initialSettingsState
      );
      expect(result[Mocks.Item1.id].belt).toEqual(stringValue);
    });

    it('should use factory override', () => {
      const state = {
        ...initialRecipeState,
        ...{ [Mocks.Item1.id]: { factory: stringValue } },
      };
      const result = Selectors.getRecipeSettings.projector(
        state,
        Mocks.Data,
        initialSettingsState
      );
      expect(result[Mocks.Item1.id].factory).toEqual(stringValue);
    });

    it('should use module override', () => {
      const state = {
        ...initialRecipeState,
        ...{ [Mocks.Item1.id]: { modules: [stringValue] } },
      };
      const result = Selectors.getRecipeSettings.projector(
        state,
        Mocks.Data,
        initialSettingsState
      );
      expect(result[Mocks.Item1.id].modules as string[]).toEqual([stringValue]);
    });

    it('should use beacon type override', () => {
      const state = {
        ...initialRecipeState,
        ...{ [Mocks.Item1.id]: { beaconModule: stringValue } },
      };
      const result = Selectors.getRecipeSettings.projector(
        state,
        Mocks.Data,
        initialSettingsState
      );
      expect(result[Mocks.Item1.id].beaconModule).toEqual(stringValue);
    });

    it('should use beacon count override', () => {
      const state = {
        ...initialRecipeState,
        ...{ [Mocks.Item1.id]: { beaconCount: numberValue } },
      };
      const result = Selectors.getRecipeSettings.projector(
        state,
        Mocks.Data,
        initialSettingsState
      );
      expect(result[Mocks.Item1.id].beaconCount).toEqual(numberValue);
    });
  });

  describe('getRecipeFactors', () => {
    const recipeSettings = Selectors.getRationalRecipeSettings.projector(
      Selectors.getRecipeSettings.projector(
        initialRecipeState,
        Mocks.Data,
        initialSettingsState
      )
    );

    it('should handle null/empty values', () => {
      const result = Selectors.getRecipeFactors.projector({}, null, null, {});
      expect(Object.keys(result).length).toEqual(0);
    });

    it('should return recipe speed/prod factors', () => {
      const result = Selectors.getRecipeFactors.projector(
        recipeSettings,
        Rational.zero,
        Rational.zero,
        Mocks.RationalData
      );
      expect(Object.keys(result).length).toEqual(Mocks.Data.recipeIds.length);
    });
  });

  describe('getContainsIgnore', () => {
    it('should handle null/empty values', () => {
      const result = Selectors.getContainsIgnore.projector({});
      expect(result).toBeFalse();
    });

    it('should find a relevant step', () => {
      const result = Selectors.getContainsIgnore.projector({
        ['id']: { ignore: true },
      });
      expect(result).toBeTrue();
    });
  });

  describe('getContainsBelt', () => {
    it('should handle null/empty values', () => {
      const result = Selectors.getContainsBelt.projector({});
      expect(result).toBeFalse();
    });

    it('should find a relevant step', () => {
      const result = Selectors.getContainsBelt.projector({
        ['id']: { belt: ItemId.TransportBelt },
      });
      expect(result).toBeTrue();
    });
  });

  describe('getContainsFactory', () => {
    it('should handle null/empty values', () => {
      const result = Selectors.getContainsFactory.projector({});
      expect(result).toBeFalse();
    });

    it('should find a relevant step', () => {
      const result = Selectors.getContainsFactory.projector({
        ['id']: { factory: ItemId.AssemblingMachine1 },
      });
      expect(result).toBeTrue();
    });
  });

  describe('getContainsModules', () => {
    it('should handle null/empty values', () => {
      const result = Selectors.getContainsModules.projector({});
      expect(result).toBeFalse();
    });

    it('should find a relevant step', () => {
      const result = Selectors.getContainsModules.projector({
        ['id']: { modules: [ItemId.SpeedModule] },
      });
      expect(result).toBeTrue();
    });
  });

  describe('getContainsBeacons', () => {
    it('should handle null/empty values', () => {
      const result = Selectors.getContainsBeacons.projector({});
      expect(result).toBeFalse();
    });

    it('should find a relevant step by module', () => {
      const result = Selectors.getContainsBeacons.projector({
        ['id']: { beaconModule: ItemId.SpeedModule },
      });
      expect(result).toBeTrue();
    });

    it('should find a relevant step by count', () => {
      const result = Selectors.getContainsBeacons.projector({
        ['id']: { beaconCount: 0 },
      });
      expect(result).toBeTrue();
    });
  });
});

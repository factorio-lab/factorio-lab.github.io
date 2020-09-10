import { Mocks } from 'src/tests';
import {
  AllColumns,
  toBoolEntities,
  Step,
  Rational,
  ItemSettings,
  RecipeSettings,
} from '~/models';
import { ExportUtility } from './export.utility';

describe('ExportUtility', () => {
  describe('saveAsCsv', () => {
    it('should save the csv', () => {
      spyOn(ExportUtility, 'saveAsCsv');
      ExportUtility.stepsToCsv(
        Mocks.Steps,
        AllColumns,
        Mocks.ItemSettingsInitial,
        Mocks.RecipeSettingsInitial
      );
      expect(ExportUtility.saveAsCsv).toHaveBeenCalled();
    });
  });

  describe('stepsToJson', () => {
    it('should convert steps to json', () => {
      spyOn(ExportUtility, 'stepToJson');
      const result = ExportUtility.stepsToJson(
        Mocks.Steps,
        AllColumns,
        Mocks.ItemSettingsInitial,
        Mocks.RecipeSettingsInitial
      );
      expect(ExportUtility.stepToJson).toHaveBeenCalledTimes(
        Mocks.Steps.length
      );
      expect(result.length).toEqual(Mocks.Steps.length);
    });
  });

  describe('stepToJson', () => {
    const col = toBoolEntities(AllColumns);
    const itemId = 'itemId';
    const recipeId = 'recipeId';
    const fullStep: Step = {
      itemId,
      items: Rational.one,
      surplus: Rational.two,
      belts: new Rational(BigInt(3)),
      wagons: new Rational(BigInt(4)),
      factories: new Rational(BigInt(5)),
      power: new Rational(BigInt(6)),
      pollution: new Rational(BigInt(7)),
      recipeId,
      depth: 0,
    };
    const minStep: Step = {
      itemId,
      items: Rational.one,
      recipeId,
      depth: 0,
    };
    const itemS: ItemSettings = {
      belt: 'belt',
      wagon: 'wagon',
    };
    const fullRecipe: RecipeSettings = {
      factory: 'factory',
      factoryModules: ['a', 'b'],
      beaconCount: 8,
      beacon: 'beacon',
      beaconModules: ['c', 'd'],
    };
    const minRecipe: RecipeSettings = {
      factory: 'factory',
      beaconCount: 8,
      beacon: 'beacon',
    };

    it('should fill in all fields', () => {
      const result = ExportUtility.stepToJson(
        fullStep,
        col,
        { [itemId]: itemS },
        { [recipeId]: fullRecipe }
      );
      expect(result).toEqual({
        Item: itemId,
        Items: 1,
        Surplus: 2,
        Belts: 3,
        Belt: itemS.belt,
        Wagons: 4,
        Wagon: itemS.wagon,
        Recipe: recipeId,
        Factories: 5,
        Factory: fullRecipe.factory,
        FactoryModules: '"a,b"',
        Beacons: 8,
        Beacon: fullRecipe.beacon,
        BeaconModules: '"c,d"',
        Power: 6,
        Pollution: 7,
      });
    });

    it('should handle empty fields', () => {
      const result = ExportUtility.stepToJson(
        minStep,
        col,
        { [itemId]: itemS },
        { [recipeId]: minRecipe }
      );
      expect(result).toEqual({
        Item: itemId,
        Items: 1,
        Surplus: 0,
        Belts: 0,
        Belt: itemS.belt,
        Wagons: 0,
        Wagon: itemS.wagon,
        Recipe: recipeId,
        Factories: 0,
        Factory: minRecipe.factory,
        FactoryModules: '""',
        Beacons: 8,
        Beacon: minRecipe.beacon,
        BeaconModules: '""',
        Power: 0,
        Pollution: 0,
      });
    });

    it('should handle minimum columns', () => {
      const result = ExportUtility.stepToJson(
        fullStep,
        {},
        { [itemId]: itemS },
        { [recipeId]: fullRecipe }
      );
      expect(result).toEqual({
        Item: itemId,
        Items: 1,
        Surplus: 2,
        Recipe: recipeId,
      });
    });

    it('should handle no recipe', () => {
      const step = { ...fullStep, ...{ recipeId: null } };
      const result = ExportUtility.stepToJson(
        step,
        col,
        { [itemId]: itemS },
        { [recipeId]: fullRecipe }
      );
      expect(result).toEqual({
        Item: itemId,
        Items: 1,
        Surplus: 2,
        Belts: 3,
        Belt: itemS.belt,
        Wagons: 4,
        Wagon: itemS.wagon,
        Recipe: '',
        Factories: 0,
        Factory: '',
        FactoryModules: '',
        Beacons: 0,
        Beacon: '',
        BeaconModules: '',
        Power: 0,
        Pollution: 0,
      });
    });

    it('should handle no recipe or columns', () => {
      const step = { ...fullStep, ...{ recipeId: null } };
      const result = ExportUtility.stepToJson(
        step,
        {},
        { [itemId]: itemS },
        { [recipeId]: fullRecipe }
      );
      expect(result).toEqual({
        Item: itemId,
        Items: 1,
        Surplus: 2,
        Recipe: '',
      });
    });
  });
});

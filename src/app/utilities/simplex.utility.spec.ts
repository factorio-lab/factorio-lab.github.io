import { ItemId, Mocks, RecipeId } from 'src/tests';
import {
  Entities,
  MaximizeType,
  ObjectiveType,
  ObjectiveUnit,
  rational,
  SimplexResultType,
} from '~/models';
import { RateUtility } from './rate.utility';
import {
  ItemValues,
  MatrixSolution,
  MatrixState,
  SimplexUtility,
} from './simplex.utility';

describe('SimplexUtility', () => {
  const getState = (): MatrixState => ({
    objectives: [],
    recipeObjectives: [],
    steps: [],
    recipes: {},
    itemValues: {},
    recipeLimits: {},
    unproduceableIds: new Set(),
    excludedIds: new Set(),
    recipeIds: Mocks.AdjustedDataset.recipeIds,
    itemIds: Mocks.AdjustedDataset.itemIds,
    data: Mocks.AdjustedDataset,
    maximizeType: MaximizeType.Weight,
    surplusMachinesOutput: false,
    costs: {
      factor: rational.one,
      machine: rational.one,
      footprint: rational.one,
      unproduceable: rational(1000000n),
      excluded: rational.zero,
      surplus: rational.zero,
      maximize: rational(-1000000n),
    },
  });
  const getResult = (
    resultType: SimplexResultType = SimplexResultType.Solved,
  ): MatrixSolution => ({
    resultType,
    time: 2,
    cost: rational.one,
    itemIds: [],
    recipeIds: [],
    unproduceableIds: new Set(),
    excludedIds: new Set(),
    surplus: {},
    unproduceable: {},
    excluded: {},
    recipes: {},
  });

  describe('addItemValue', () => {
    it('should add a value to an entity of Rationals', () => {
      const result: Entities<ItemValues> = {};
      SimplexUtility.addItemValue(result, 'id');
      expect(result['id'].out).toEqual(rational.zero);
      SimplexUtility.addItemValue(result, 'id', rational.one);
      expect(result['id'].out).toEqual(rational.one);
      SimplexUtility.addItemValue(result, 'id', rational(2n), 'lim');
      expect(result['id'].lim).toEqual(rational(2n));
    });
  });

  describe('solve', () => {
    it('should handle calculations paused', () => {
      expect(
        SimplexUtility.solve(
          [],
          Mocks.SettingsStateInitial,
          Mocks.AdjustedDataset,
          true,
        ),
      ).toEqual({ steps: [], resultType: SimplexResultType.Paused });
    });

    it('should handle empty list of objectives', () => {
      expect(
        SimplexUtility.solve(
          [],
          Mocks.SettingsStateInitial,
          Mocks.AdjustedDataset,
          false,
        ),
      ).toEqual({
        steps: [],
        resultType: SimplexResultType.Skipped,
      });
    });

    it('should update steps with solution from simplex method', () => {
      spyOn(SimplexUtility, 'getState').and.returnValue({
        steps: Mocks.Steps,
      } as any);
      const result = getResult(SimplexResultType.Solved);
      spyOn(SimplexUtility, 'getSolution').and.returnValue(result);
      spyOn(SimplexUtility, 'updateSteps');
      expect(
        SimplexUtility.solve(
          Mocks.Objectives,
          Mocks.SettingsStateInitial,
          Mocks.AdjustedDataset,
          false,
        ),
      ).toEqual({
        steps: Mocks.Steps,
        resultType: SimplexResultType.Solved,
        returnCode: undefined,
        simplexStatus: undefined,
        unboundedRecipeId: undefined,
        time: 2,
        cost: rational.one,
      });
      expect(SimplexUtility.updateSteps).toHaveBeenCalled();
    });

    it('should determine the unbounded ray result', () => {
      const result = SimplexUtility.solve(
        [
          {
            id: '0',
            targetId: RecipeId.AdvancedCircuit,
            value: rational.one,
            unit: ObjectiveUnit.Machines,
            type: ObjectiveType.Maximize,
            recipe:
              Mocks.AdjustedDataset.adjustedRecipe[RecipeId.AdvancedCircuit],
          },
        ],
        Mocks.SettingsStateInitial,
        Mocks.AdjustedDataset,
        false,
      );
      expect(result.unboundedRecipeId).toBeDefined();
    });
  });

  describe('getState', () => {
    it('should build full state object', () => {
      spyOn(SimplexUtility, 'parseItemRecursively');
      const objectives = [
        ...Mocks.Objectives,
        Mocks.Objectives[3],
        Mocks.Objectives[7],
      ];
      const result = SimplexUtility.getState(
        objectives,
        Mocks.SettingsStateInitial,
        Mocks.AdjustedDataset,
      );
      expect(result).toEqual({
        objectives,
        recipeObjectives: [Mocks.Objectives[4], Mocks.Objectives[6]] as any[],
        steps: [],
        recipes: {},
        itemValues: {
          [ItemId.AdvancedCircuit]: { out: rational.one },
          [ItemId.IronPlate]: { out: rational.zero, in: rational.one },
          [ItemId.PlasticBar]: { out: rational.zero, max: rational.one },
          [ItemId.PiercingRoundsMagazine]: { out: rational.zero },
          [ItemId.FirearmMagazine]: { out: rational.zero },
          [ItemId.SteelPlate]: { out: rational.zero },
          [ItemId.CopperPlate]: {
            out: rational.zero,
            in: rational(141n, 40n),
          },
          [ItemId.PetroleumGas]: { out: rational.zero, lim: rational(100n) },
        },
        recipeLimits: { [RecipeId.IronPlate]: rational(10n) },
        unproduceableIds: new Set([
          ItemId.AdvancedCircuit,
          ItemId.IronPlate,
          ItemId.PlasticBar,
          ItemId.PetroleumGas,
          ItemId.PiercingRoundsMagazine,
          ItemId.FirearmMagazine,
          ItemId.SteelPlate,
          ItemId.CopperPlate,
        ]),
        excludedIds: new Set(),
        recipeIds: Mocks.AdjustedDataset.recipeIds.filter(
          (r) => r !== RecipeId.NuclearFuelReprocessing,
        ),
        itemIds: Mocks.AdjustedDataset.itemIds,
        data: Mocks.AdjustedDataset,
        maximizeType: MaximizeType.Weight,
        surplusMachinesOutput: false,
        costs: Mocks.Costs,
      });
    });
  });

  describe('recipeMatches', () => {
    it('should find matching recipes for an item', () => {
      const state = getState();
      const recipe = Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal];
      const result = SimplexUtility.recipeMatches(ItemId.Coal, state);
      expect(state.recipes).toEqual({ [RecipeId.Coal]: recipe });
      expect(result).toEqual([recipe]);
    });
  });

  describe('itemMatches', () => {
    it('should find matching items for a recipe', () => {
      const state = getState();
      const recipe = Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable];
      const result = SimplexUtility.itemMatches(recipe, state);
      expect(state.itemValues[ItemId.CopperPlate].out).toEqual(rational.zero);
      expect(state.recipes).toEqual({});
      expect(result).toEqual([ItemId.CopperPlate]);
    });
  });

  describe('parseRecipeRecursively', () => {
    it('should do nothing for recipes with no inputs', () => {
      spyOn(SimplexUtility, 'parseItemRecursively');
      SimplexUtility.parseRecipeRecursively(
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.IronOre],
        getState(),
      );
      expect(SimplexUtility.parseItemRecursively).not.toHaveBeenCalled();
    });

    it('should parse recipe inputs recursively', () => {
      spyOn(SimplexUtility, 'itemMatches').and.returnValue([
        ItemId.CopperPlate,
      ]);
      spyOn(SimplexUtility, 'parseItemRecursively');
      const recipe = Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable];
      const state = getState();
      SimplexUtility.parseRecipeRecursively(recipe, state);
      expect(SimplexUtility.itemMatches).toHaveBeenCalledWith(recipe, state);
      expect(SimplexUtility.parseItemRecursively).toHaveBeenCalledWith(
        ItemId.CopperPlate,
        state,
      );
    });
  });

  describe('parseItemRecursively', () => {
    it('should do nothing for simple recipe that was already parsed', () => {
      spyOn(SimplexUtility, 'parseRecipeRecursively');
      const state = getState();
      state.recipes[RecipeId.CopperCable] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable];
      SimplexUtility.parseItemRecursively(ItemId.CopperCable, state);
      expect(SimplexUtility.parseRecipeRecursively).not.toHaveBeenCalled();
    });

    it('should parse a simple recipe', () => {
      spyOn(SimplexUtility, 'parseRecipeRecursively');
      const state = getState();
      SimplexUtility.parseItemRecursively(ItemId.CopperCable, state);
      expect(SimplexUtility.parseRecipeRecursively).toHaveBeenCalledWith(
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable],
        state,
      );
    });

    it('should get complex recipe matches and parse them', () => {
      const recipe =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.AdvancedOilProcessing];
      spyOn(SimplexUtility, 'recipeMatches').and.returnValue([recipe]);
      spyOn(SimplexUtility, 'parseRecipeRecursively');
      const state = getState();
      SimplexUtility.parseItemRecursively(ItemId.PetroleumGas, state);
      expect(SimplexUtility.recipeMatches).toHaveBeenCalledWith(
        ItemId.PetroleumGas,
        state,
      );
      expect(SimplexUtility.parseRecipeRecursively).toHaveBeenCalledWith(
        recipe,
        state,
      );
    });
  });

  describe('addSurplusVariables', () => {
    it('should add other items that only appear as recipe outputs', () => {
      const state = getState();
      state.recipes[RecipeId.Coal] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal];
      SimplexUtility.addSurplusVariables(state);
      expect(state.itemValues[ItemId.Coal].out).toEqual(rational.zero);
    });
  });

  describe('parseUnproduceable', () => {
    it('should parse unproduceable items', () => {
      const state = getState();
      state.itemValues[ItemId.Wood] = { out: rational.one };
      state.itemValues[ItemId.Coal] = { out: rational.one };
      state.recipes = {
        [RecipeId.Coal]: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
      };
      SimplexUtility.parseUnproduceable(state);
      expect(state.unproduceableIds).toEqual(new Set([ItemId.Wood]));
    });
  });

  describe('getSolution', () => {
    it('should parse the solution found by simplex', () => {
      spyOn(SimplexUtility, 'glpk').and.returnValue({} as any);
      const state = getState();
      const result = SimplexUtility.getSolution(state);
      expect(result.resultType).toEqual(SimplexResultType.Solved);
    });

    it('should handle glpk failure', () => {
      spyOn(SimplexUtility, 'glpk').and.returnValue({ error: true } as any);
      const state = getState();
      const result = SimplexUtility.getSolution(state);
      expect(result.resultType).toEqual(SimplexResultType.Failed);
    });
  });

  describe('itemCost', () => {
    it('should adjust cost of fluids', () => {
      const state = getState();
      const result = SimplexUtility.itemCost(
        ItemId.PetroleumGas,
        'unproduceable',
        state,
      );
      expect(result).toEqual(
        state.costs.unproduceable.div(rational(10n)).toNumber(),
      );
    });
  });

  describe('glpk', () => {
    it('should find a solution using glpk', () => {
      const state = getState();
      // Coal = excluded input, Wood = normal input
      state.itemIds = state.itemIds.filter((i) => i !== ItemId.Coal);
      state.unproduceableIds = new Set([
        ItemId.Wood,
        ItemId.Coal,
        ItemId.IronOre,
      ]);
      state.excludedIds = new Set([ItemId.CopperOre]);
      state.recipes[RecipeId.CopperPlate] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperPlate];
      state.recipes[RecipeId.CopperPlate].cost = undefined;
      state.recipes[RecipeId.IronPlate] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.IronPlate];
      state.itemValues[ItemId.Wood] = {
        out: rational.one,
      };
      state.itemValues[ItemId.Coal] = { out: rational.one };
      state.itemValues[ItemId.IronPlate] = {
        out: rational.zero,
        max: rational.one,
      };
      state.itemValues[ItemId.IronOre] = {
        out: rational.zero,
        in: rational.one,
        lim: rational(10n),
      };
      state.itemValues[ItemId.CopperCable] = { out: rational.zero };
      state.itemValues[ItemId.CopperPlate] = { out: rational.zero };
      state.itemValues[ItemId.CopperOre] = { out: rational.zero };
      state.recipeLimits[RecipeId.CopperPlate] = rational(10n);
      state.recipeObjectives = [
        {
          id: '0',
          targetId: RecipeId.IronPlate,
          value: rational.one,
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.IronPlate],
        },
        {
          id: '1',
          targetId: RecipeId.CopperCable,
          value: rational.one,
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Maximize,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable],
        },
      ];
      const result = SimplexUtility.glpk(state);
      expect(result.returnCode).toEqual('ok');
      expect(result.status).toEqual('optimal');
    });

    it('should find a solution using glpk maximizing by ratio', () => {
      const state = getState();
      state.maximizeType = MaximizeType.Ratio;
      state.surplusMachinesOutput = true;
      // Coal = excluded input, Wood = normal input
      state.itemIds = state.itemIds.filter((i) => i !== ItemId.Coal);
      state.unproduceableIds = new Set([
        ItemId.Wood,
        ItemId.Coal,
        ItemId.IronOre,
      ]);
      state.excludedIds = new Set([ItemId.CopperOre]);
      state.recipes[RecipeId.CopperPlate] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperPlate];
      state.recipes[RecipeId.IronPlate] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.IronPlate];
      state.itemValues[ItemId.Wood] = {
        out: rational.one,
      };
      state.itemValues[ItemId.Coal] = { out: rational.one };
      state.itemValues[ItemId.IronPlate] = {
        out: rational.zero,
        max: rational.one,
      };
      state.itemValues[ItemId.IronOre] = {
        out: rational.zero,
        in: rational.one,
        lim: rational(10n),
      };
      state.itemValues[ItemId.CopperCable] = { out: rational.zero };
      state.itemValues[ItemId.CopperPlate] = { out: rational.zero };
      state.itemValues[ItemId.CopperOre] = { out: rational.zero };
      state.recipeLimits[RecipeId.CopperPlate] = rational(10n);
      state.recipeObjectives = [
        {
          id: '0',
          targetId: RecipeId.IronPlate,
          value: rational.one,
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.IronPlate],
        },
        {
          id: '1',
          targetId: RecipeId.CopperCable,
          value: rational.one,
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Maximize,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable],
        },
      ];
      const result = SimplexUtility.glpk(state);
      expect(result.returnCode).toEqual('ok');
      expect(result.status).toEqual('optimal');
    });

    it('should handle glpk failure', () => {
      spyOn(SimplexUtility, 'glpkSimplex').and.returnValue([
        'failure',
        'infeasible',
      ]);
      const state = getState();
      const result = SimplexUtility.glpk(state);
      expect(result.returnCode).toEqual('failure');
    });
  });

  describe('updateSteps', () => {
    it('should walk through and update steps based on simplex result', () => {
      spyOn(SimplexUtility, 'addItemStep');
      spyOn(SimplexUtility, 'assignRecipes');
      spyOn(SimplexUtility, 'addRecipeStep');
      const state = getState();
      state.itemValues[ItemId.Coal] = { out: rational.zero };
      state.itemValues[ItemId.IronOre] = { out: rational.zero };
      state.recipes[RecipeId.Coal] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal];
      state.recipes[ItemId.Wood] = { id: null } as any;
      state.recipes[RecipeId.IronOre] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.IronOre];
      state.recipeObjectives = [Mocks.Objectives[4] as any];
      const solution: any = {
        surplus: { [ItemId.IronOre]: rational.one },
        inputs: { [ItemId.Wood]: rational.one },
        recipes: { [RecipeId.IronOre]: rational(2n) },
      };
      state.steps = [
        { id: '0' },
        { id: '1', output: rational.one },
        { id: '2' },
        { id: '3', output: rational.one },
      ];
      SimplexUtility.updateSteps(solution, state);
      expect(SimplexUtility.addItemStep).toHaveBeenCalledTimes(2);
      expect(SimplexUtility.assignRecipes).toHaveBeenCalledTimes(1);
      expect(SimplexUtility.addRecipeStep).toHaveBeenCalledTimes(2);
    });
  });

  describe('addItemStep', () => {
    it('should add a new step', () => {
      const solution: any = {
        surplus: {},
        unproduceable: {},
        excluded: {},
        recipes: {
          [RecipeId.Coal]: rational(2n),
          [RecipeId.PlasticBar]: rational.one,
        },
      };
      const state = getState();
      state.itemValues[ItemId.Coal] = { out: rational(3n) };
      state.recipes[RecipeId.Coal] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal];
      state.recipes[RecipeId.PlasticBar] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.PlasticBar];
      state.recipeObjectives = [Mocks.Objectives[4] as any];
      SimplexUtility.addItemStep(ItemId.Coal, solution, state);
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.Coal,
          items: rational(1183n, 200n),
          output: rational(3n),
          parents: { '': rational(3n) },
        },
      ]);
    });

    it('should include recipe objective output a new step', () => {
      const solution: any = {
        surplus: {},
        unproduceable: { [ItemId.PiercingRoundsMagazine]: rational.one },
        excluded: { [ItemId.PiercingRoundsMagazine]: rational.one },
        recipes: {},
      };
      const state = getState();
      state.itemValues[ItemId.PiercingRoundsMagazine] = { out: rational.zero };
      state.recipeObjectives = [Mocks.Objectives[4] as any];
      SimplexUtility.addItemStep(
        ItemId.PiercingRoundsMagazine,
        solution,
        state,
      );
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.PiercingRoundsMagazine,
          items: rational(59n, 12n),
        },
      ]);
    });

    it('should assign a surplus value', () => {
      const solution: any = {
        surplus: { [ItemId.Coal]: rational(3n) },
        unproduceable: {},
        excluded: {},
        recipes: { [RecipeId.Coal]: rational(4n) },
      };
      const state = getState();
      state.itemValues[ItemId.Coal] = { out: rational.zero };
      state.recipes[RecipeId.Coal] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal];
      SimplexUtility.addItemStep(ItemId.Coal, solution, state);
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.Coal,
          items: rational(1183n, 100n),
          surplus: rational(3n),
        },
      ]);
    });

    it('should avoid floating point errors in surpluses', () => {
      const solution: any = {
        surplus: {
          [ItemId.Coal]: rational(1183000000001n, 100000000000n),
        },
        unproduceable: {},
        excluded: {},
        recipes: { [RecipeId.Coal]: rational(4n) },
      };
      const state = getState();
      state.itemValues[ItemId.Coal] = { out: rational.zero };
      state.recipes[RecipeId.Coal] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal];
      SimplexUtility.addItemStep(ItemId.Coal, solution, state);
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.Coal,
          items: rational(1183n, 100n),
          surplus: rational(1183n, 100n),
        },
      ]);
    });

    it('should include input values', () => {
      const solution: any = {
        surplus: {},
        unproduceable: {},
        excluded: {},
        recipes: {},
      };
      const state = getState();
      state.itemValues[ItemId.Coal] = { out: rational.zero, in: rational.one };
      SimplexUtility.addItemStep(ItemId.Coal, solution, state);
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.Coal,
          items: rational.one,
        },
      ]);
    });
  });

  describe('assignRecipes', () => {
    it('should assign recipes to appropriate steps', () => {
      const solution: any = {
        surplus: {},
        unproduceable: {},
        excluded: {},
        recipes: {
          [RecipeId.CopperCable]: rational.one,
          [RecipeId.AdvancedOilProcessing]: rational.one,
          [RecipeId.BasicOilProcessing]: rational.one,
        },
      };
      const state = getState();
      state.steps = [
        {
          id: '0',
          itemId: ItemId.CopperCable,
          items: rational.zero,
        },
        {
          id: '1',
          itemId: ItemId.HeavyOil,
          items: rational.zero,
        },
        {
          id: '2',
          itemId: ItemId.PetroleumGas,
          items: rational.zero,
        },
        {
          id: '3',
          itemId: ItemId.LightOil,
          items: rational.zero,
        },
      ];
      state.recipes[RecipeId.CopperCable] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.CopperCable];
      state.recipes[RecipeId.AdvancedOilProcessing] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.AdvancedOilProcessing];
      state.recipes[RecipeId.BasicOilProcessing] =
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.BasicOilProcessing];
      state.recipeObjectives = [Mocks.Objectives[4] as any];
      SimplexUtility.assignRecipes(solution, state);
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.CopperCable,
          recipeId: RecipeId.CopperCable,
          items: rational.zero,
        },
        {
          id: '1',
          itemId: ItemId.HeavyOil,
          recipeId: RecipeId.AdvancedOilProcessing,
          items: rational.zero,
        },
        {
          id: '2',
          itemId: ItemId.PetroleumGas,
          recipeId: RecipeId.BasicOilProcessing,
          items: rational.zero,
        },
        {
          id: '3',
          itemId: ItemId.LightOil,
          items: rational.zero,
        },
      ]);
    });
  });

  describe('addRecipeStep', () => {
    it('should update an existing step', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const state = getState();
      state.steps = [
        {
          id: 'id',
          itemId: ItemId.Coal,
          items: rational.one,
        },
      ];
      const solution: any = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
        solution,
        state,
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(state.steps).toEqual([
        {
          id: 'id',
          itemId: ItemId.Coal,
          recipeId: RecipeId.Coal,
          items: rational.one,
          machines: rational.one,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
        },
      ]);
    });

    it('should add a new step', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const state = getState();
      const solution: any = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
        solution,
        state,
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(state.steps).toEqual([
        {
          id: '0',
          recipeId: RecipeId.Coal,
          machines: rational.one,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
        },
      ]);
    });

    it('should add a recipe objective step', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const state = getState();
      const solution: any = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.Coal]: rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
        solution,
        state,
        Mocks.Objectives[4] as any,
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(state.steps).toEqual([
        {
          id: '0',
          recipeId: RecipeId.Coal,
          machines: rational.one,
          recipe: Mocks.AdjustedDataset.adjustedRecipe[RecipeId.Coal],
          recipeObjectiveId: Mocks.Objectives[4].id,
        },
      ]);
    });

    it('should place a new step next to related steps', () => {
      spyOn(RateUtility, 'adjustPowerPollution');
      const state = getState();
      state.steps = [
        {
          id: '0',
          itemId: ItemId.PetroleumGas,
          recipeId: RecipeId.BasicOilProcessing,
          items: rational.zero,
        },
        {
          id: '1',
          itemId: ItemId.Wood,
          items: rational.zero,
        },
      ];
      const solution: any = {
        surplus: {},
        inputs: {},
        recipes: { [RecipeId.AdvancedOilProcessing]: rational.one },
      };
      SimplexUtility.addRecipeStep(
        Mocks.AdjustedDataset.adjustedRecipe[RecipeId.AdvancedOilProcessing],
        solution,
        state,
      );
      expect(RateUtility.adjustPowerPollution).toHaveBeenCalled();
      expect(state.steps).toEqual([
        {
          id: '0',
          itemId: ItemId.PetroleumGas,
          recipeId: RecipeId.BasicOilProcessing,
          items: rational.zero,
        },
        {
          id: '2',
          recipeId: RecipeId.AdvancedOilProcessing,
          machines: rational.one,
          recipe:
            Mocks.AdjustedDataset.adjustedRecipe[
              RecipeId.AdvancedOilProcessing
            ],
        },
        { id: '1', itemId: ItemId.Wood, items: rational.zero },
      ]);
    });
  });
});

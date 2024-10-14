import {
  Constraint,
  ConstraintProperties,
  Model,
  Simplex,
  Status,
  Variable,
  VariableProperties,
} from 'glpk-ts';
import { StatusSimplex } from 'glpk-ts/dist/status';

import { environment } from 'src/environments';
import { contains } from '~/helpers';
import {
  AdjustedDataset,
  AdjustedRecipe,
  CostKey,
  CostSettings,
  Entities,
  FACTORIO_FLUID_COST_RATIO,
  Game,
  isRecipeObjective,
  MatrixResult,
  MaximizeType,
  Objective,
  ObjectiveType,
  rational,
  Rational,
  Recipe,
  RecipeObjective,
  SimplexResultType,
  Step,
} from '~/models';
import { Items, Recipes } from '~/store';
import { RateUtility } from './rate.utility';

const simplexConfig: Simplex.Options = environment.debug
  ? // Don't test debug environment level
    // istanbul ignore next
    {}
  : { msgLevel: 'off' };

export interface ItemValues {
  /** Sum of value from output objectives */
  out: Rational;
  /** Sum of values from input objectives */
  in?: Rational;
  /** Sum of values from max objectives */
  max?: Rational;
  /** Smallest value from limit objectives */
  lim?: Rational;
}

export interface MatrixState {
  objectives: Objective[];
  /**
   * Output & Maximize recipe objectives
   *  * Limits moved to `recipeLimits`
   *  * Inputs added to `itemValues`
   */
  recipeObjectives: RecipeObjective[];
  steps: Step[];
  /** Recipes used in the matrix */
  recipes: Entities<AdjustedRecipe>;
  /** Items used in the matrix */
  itemValues: Entities<ItemValues>;
  /** Recipe limits */
  recipeLimits: Entities<Rational>;
  /** Items that have no included recipe */
  unproduceableIds: string[];
  /** Items that are explicitly excluded */
  excludedIds: string[];
  /** All recipes that are included */
  recipeIds: string[];
  /** All items that are included */
  itemIds: string[];
  data: AdjustedDataset;
  maximizeType: MaximizeType;
  surplusMachinesOutput: boolean;
  costs: CostSettings;
}

export interface MatrixSolution {
  resultType: SimplexResultType;
  /** GLPK simplex return code */
  returnCode?: Simplex.ReturnCode;
  /** GLPK model simplex status */
  simplexStatus?: StatusSimplex;
  /** If simplex solution is unbounded, the recipe that represents the ray */
  unboundedRecipeId?: string;
  /** Runtime in ms */
  time: number;
  /** Overall simplex solution cost */
  cost: Rational;
  /** Items in tableau */
  itemIds: string[];
  /** Recipes in tableau */
  recipeIds: string[];
  /** Items identified as unproduceable */
  unproduceableIds: string[];
  /** Items excluded */
  excludedIds: string[];
  /** Surplus items, may be empty */
  surplus: Entities<Rational>;
  /** Unproduceable items (no recipe), may be empty */
  unproduceable: Entities<Rational>;
  /** Excluded items, may be empty */
  excluded: Entities<Rational>;
  /** Recipe values of the solution */
  recipes: Entities<Rational>;
}

export interface GlpkResult {
  surplus: Entities<Rational>;
  recipes: Entities<Rational>;
  unproduceable: Entities<Rational>;
  excluded: Entities<Rational>;
  cost: Rational;
  returnCode: Simplex.ReturnCode;
  status: Status;
  unboundedRecipeId?: string;
  error: boolean;
  time: number;
}

export class SimplexUtility {
  static addItemValue(
    obj: Entities<ItemValues>,
    id: string,
    value = rational(0n),
    key: keyof ItemValues = 'out',
  ): void {
    if (obj[id]) {
      const current = obj[id][key];
      if (current) {
        obj[id][key] = current.add(value);
      } else {
        obj[id][key] = value;
      }
    } else {
      obj[id] = { ...{ out: rational(0n) }, [key]: value };
    }
  }

  static solve(
    objectives: Objective[],
    itemsState: Items.ItemsState,
    recipesState: Recipes.RecipesState,
    researchedTechnologyIds: string[] | null,
    maximizeType: MaximizeType,
    surplusMachinesOutput: boolean,
    costs: CostSettings,
    data: AdjustedDataset,
    paused: boolean,
  ): MatrixResult {
    if (paused) {
      return { steps: [], resultType: SimplexResultType.Paused };
    }

    if (objectives.length === 0) {
      return { steps: [], resultType: SimplexResultType.Skipped };
    }

    if (researchedTechnologyIds == null) {
      researchedTechnologyIds = data.technologyIds;
    }

    // Get matrix state
    const state = this.getState(
      objectives,
      itemsState,
      recipesState,
      researchedTechnologyIds,
      maximizeType,
      surplusMachinesOutput,
      costs,
      data,
    );

    // Get solution for matrix state
    const solution = this.getSolution(state);

    if (solution.resultType === SimplexResultType.Solved) {
      // Update steps with solution
      this.updateSteps(solution, state);
    }

    return {
      steps: state.steps,
      resultType: solution.resultType,
      returnCode: solution.returnCode,
      simplexStatus: solution.simplexStatus,
      unboundedRecipeId: solution.unboundedRecipeId,
      time: solution.time,
      cost: solution.cost,
    };
  }

  //#region Setup
  static getState(
    objectives: Objective[],
    itemsState: Items.ItemsState,
    recipesState: Recipes.RecipesState,
    researchedTechnologyIds: string[],
    maximizeType: MaximizeType,
    surplusMachinesOutput: boolean,
    costs: CostSettings,
    data: AdjustedDataset,
  ): MatrixState {
    // Set up state object
    const state: MatrixState = {
      objectives,
      recipeObjectives: objectives.filter(
        (o): o is RecipeObjective =>
          isRecipeObjective(o) &&
          [ObjectiveType.Output, ObjectiveType.Maximize].includes(o.type),
      ),
      steps: [],
      recipes: {},
      itemValues: {},
      recipeLimits: {},
      unproduceableIds: [],
      excludedIds: data.itemIds.filter((i) => itemsState[i].excluded),
      recipeIds: data.recipeIds.filter((r) => {
        // Filter for included, unlocked recipes
        const recipe = data.recipeEntities[r];
        return (
          !recipesState[r].excluded &&
          (recipe.unlockedBy == null ||
            [recipe.unlockedBy]
              .flat()
              .some((id) => researchedTechnologyIds.includes(id)))
        );
      }),
      itemIds: data.itemIds.filter((i) => !itemsState[i].excluded),
      maximizeType,
      surplusMachinesOutput,
      costs: costs,
      data,
    };

    // Add item objectives to matrix state
    for (const obj of objectives) {
      if (isRecipeObjective(obj)) {
        switch (obj.type) {
          case ObjectiveType.Output:
          case ObjectiveType.Maximize: {
            for (const itemId of Object.keys(obj.recipe.out)) {
              this.addItemValue(state.itemValues, itemId);
              this.parseItemRecursively(itemId, state);
            }

            this.parseRecipeRecursively(obj.recipe, state);

            break;
          }
          case ObjectiveType.Input: {
            // Parse inputs and add them as though they were item objective inputs
            for (const itemId of Object.keys(obj.recipe.out).filter((i) =>
              obj.recipe.produces.has(i),
            )) {
              const rate = obj.value.mul(obj.recipe.output[itemId]);
              this.addItemValue(state.itemValues, itemId, rate, 'in');
            }
            break;
          }
          case ObjectiveType.Limit: {
            /**
             * Add recipe objective count to recipe limits if current limit is
             * null or greater than this objective's value
             */
            const current = state.recipeLimits[obj.targetId];
            if (current == null || current.gt(obj.value)) {
              state.recipeLimits[obj.targetId] = obj.value;
            }
            break;
          }
        }
      } else {
        switch (obj.type) {
          case ObjectiveType.Output: {
            // Add item objective value to output and parse item for recipes
            this.addItemValue(state.itemValues, obj.targetId, obj.value);
            this.parseItemRecursively(obj.targetId, state);
            break;
          }
          case ObjectiveType.Input: {
            // Add item objective value to input, no need to add recipes
            this.addItemValue(state.itemValues, obj.targetId, obj.value, 'in');
            break;
          }
          case ObjectiveType.Maximize: {
            /**
             * Add item objective value to maximize and parse item for recipes
             * Add item to standard output values with 0-value
             */
            this.addItemValue(state.itemValues, obj.targetId, obj.value, 'max');
            this.addItemValue(state.itemValues, obj.targetId);
            this.parseItemRecursively(obj.targetId, state);
            break;
          }
          case ObjectiveType.Limit: {
            /**
             * Add item objective value to limits if current limit is null or
             * greater than this objective's value, no need to add recipes
             * Add item to standard output values with 0-value
             */
            this.addItemValue(state.itemValues, obj.targetId);
            this.parseItemRecursively(obj.targetId, state);
            const current = state.itemValues[obj.targetId].lim;
            if (current == null || current.gt(obj.value)) {
              state.itemValues[obj.targetId].lim = obj.value;
            }
            break;
          }
        }
      }
    }

    // Include any output-only items to calculate surplus
    this.addSurplusVariables(state);

    // Parse items that are unproduceable (no recipe available)
    this.parseUnproduceable(state);

    return state;
  }

  /** Find matching recipes for an item that have not yet been parsed */
  static recipeMatches(itemId: string, state: MatrixState): Recipe[] {
    const recipes = state.data.itemIncludedRecipeIds[itemId]
      .filter((r) => !state.recipes[r])
      .map((r) => state.data.adjustedRecipe[r]);

    recipes.forEach((r) => (state.recipes[r.id] = r));

    return recipes;
  }

  /** Find matching item inputs for a recipe that have not yet been parsed */
  static itemMatches(recipe: Recipe, state: MatrixState): string[] {
    const itemIds = Object.keys(recipe.in).filter(
      (i) => state.itemValues[i]?.out == null,
    );
    for (const itemId of itemIds) {
      this.addItemValue(state.itemValues, itemId);
    }
    return itemIds;
  }

  /** Look for item inputs for a recipe, recursively */
  static parseRecipeRecursively(recipe: Recipe, state: MatrixState): void {
    if (recipe.in) {
      const matches = this.itemMatches(recipe, state);
      for (const itemId of matches.filter(
        (m) => state.itemIds.indexOf(m) !== -1,
      )) {
        this.parseItemRecursively(itemId, state);
      }
    }
  }

  /** Look for recipes that output a passed item, recursively */
  static parseItemRecursively(itemId: string, state: MatrixState): void {
    const matches = this.recipeMatches(itemId, state);
    for (const recipe of matches) {
      this.parseRecipeRecursively(recipe, state);
    }
  }

  /** Include items that only function as outputs to calculate surplus values */
  static addSurplusVariables(state: MatrixState): void {
    const recipes = Object.keys(state.recipes).map((r) => state.recipes[r]);
    for (const recipe of recipes) {
      for (const id of Object.keys(recipe.out).filter(
        (o) => state.itemValues[o]?.out == null,
      )) {
        this.addItemValue(state.itemValues, id);
      }
    }
  }

  /**
   * Determines which items in the matrix are unproduceable (not produced by any
   * recipe)
   */
  static parseUnproduceable(state: MatrixState): void {
    const itemIds = Object.keys(state.itemValues);
    const recipeSet = new Set(Object.keys(state.recipes));
    state.unproduceableIds = itemIds.filter((i) =>
      state.data.itemIncludedRecipeIds[i].every((r) => !recipeSet.has(r)),
    );
  }
  //#endregion

  //#region Simplex
  /** Convert state to canonical tableau, solve using simplex, and parse solution */
  static getSolution(state: MatrixState): MatrixSolution {
    const glpkResult = this.glpk(state);

    if (glpkResult.error) {
      // No solution found
      return {
        resultType: SimplexResultType.Failed,
        returnCode: glpkResult.returnCode,
        simplexStatus: glpkResult.status,
        unboundedRecipeId: glpkResult.unboundedRecipeId,
        surplus: {},
        unproduceable: {},
        excluded: {},
        recipes: {},
        time: 0,
        cost: rational(0n),
        itemIds: [],
        recipeIds: [],
        unproduceableIds: [],
        excludedIds: [],
      };
    }

    const itemIds = Object.keys(state.itemValues);
    const recipeIds = Object.keys(state.recipes);
    const { unproduceableIds, excludedIds } = state;
    const { surplus, unproduceable, excluded, recipes } = glpkResult;

    return {
      resultType: SimplexResultType.Solved,
      surplus,
      recipes,
      unproduceable,
      excluded,
      time: glpkResult.time,
      itemIds,
      recipeIds,
      unproduceableIds,
      excludedIds,
      cost: glpkResult.cost,
    };
  }

  static itemCost(
    itemId: string,
    costKey: CostKey,
    state: MatrixState,
  ): number {
    const base =
      state.data.itemEntities[itemId].stack == null &&
      state.data.game === Game.Factorio
        ? FACTORIO_FLUID_COST_RATIO
        : rational(1n);
    const cost = state.costs[costKey];
    return base.mul(cost).toNumber();
  }

  static glpk(state: MatrixState): GlpkResult {
    const itemIds = Object.keys(state.itemValues);
    const recipeIds = Object.keys(state.recipes);

    const m = new Model({ sense: 'min' });
    // Variables for recipes
    const recipeVarEntities: Entities<Variable> = {};
    // Variables for recipe output objectives, where lb and ub represent
    // objective quantity (no surplus allowed on recipe objectives)
    const recipeObjectiveVarEntities: Entities<Variable> = {};
    // Variables for (free) inputs, where ub represents input quantity
    const inputVarEntities: Entities<Variable> = {};
    // Variables for items that cannot be produced by any recipe
    const unproduceableVarEntities: Entities<Variable> = {};
    // Variables for items that have been excluded
    const excludedVarEntities: Entities<Variable> = {};
    // Variables for surplus values
    const surplusVarEntities: Entities<Variable> = {};
    // Variables for maximize item objectives
    const maximizeItemVarEntities: Entities<Variable> = {};
    // Variables for maximize recipe objectives
    const maximizeRecipeVarEntities: Entities<Variable> = {};
    // Track net output of items, for item output constraints
    const itemConstrEntities: Entities<Constraint> = {};
    // Track consumption of items, for item limit constraints
    const inputLimitConstrEntities: Entities<Constraint> = {};
    // Track number of machines for recipe maximization constraints
    const recipeObjectiveConstrEntities: Entities<Constraint> = {};
    // Variable for maximization ratio
    const config: VariableProperties = {
      obj: state.costs.maximize.toNumber(),
      lb: 0,
      name: 'maximize',
    };
    const maximizeVar = m.addVar(config);

    // Used to track quantities from maximization ratio
    let maximizeFactor = rational(0n);

    // Add recipe vars to model
    for (const recipeId of recipeIds) {
      const config: VariableProperties = {
        obj: (state.recipes[recipeId].cost ?? rational(0n)).toNumber(),
        lb: 0,
        name: recipeId,
      };

      // Add limit, if any
      if (state.recipeLimits[recipeId]) {
        config.ub = state.recipeLimits[recipeId].toNumber();
      }

      recipeVarEntities[recipeId] = m.addVar(config);
    }

    // Add recipe objective vars to model
    for (const obj of state.recipeObjectives) {
      const config: VariableProperties = {
        lb: 0,
        name: obj.id,
      };

      // Set ub/lb if type is output, maximize will be set up later
      if (obj.type === ObjectiveType.Output) {
        config.ub = obj.value.toNumber();
        config.lb = obj.value.toNumber();
      }

      recipeObjectiveVarEntities[obj.id] = m.addVar(config);

      if (obj.type === ObjectiveType.Maximize) {
        switch (state.maximizeType) {
          case MaximizeType.Weight: {
            const varConfig: VariableProperties = {
              obj: obj.value.mul(state.costs.maximize).toNumber(),
              lb: 0,
              name: obj.id,
            };
            maximizeRecipeVarEntities[obj.id] = m.addVar(varConfig);
            const coeffs: [Variable, number][] = [
              [recipeObjectiveVarEntities[obj.id], 1],
              [maximizeRecipeVarEntities[obj.id], -1],
            ];
            const constrConfig: ConstraintProperties = {
              coeffs,
              lb: 0,
              name: obj.id,
            };
            recipeObjectiveConstrEntities[obj.id] = m.addConstr(constrConfig);
            break;
          }
          case MaximizeType.Ratio: {
            maximizeFactor = maximizeFactor.add(obj.value);
            const coeffs: [Variable, number][] = [
              [recipeObjectiveVarEntities[obj.id], 1],
              [maximizeVar, obj.value.inverse().toNumber()],
            ];
            const config: ConstraintProperties = {
              coeffs,
              lb: 0,
              name: obj.id,
            };
            recipeObjectiveConstrEntities[obj.id] = m.addConstr(config);
            break;
          }
        }
      }
    }

    // Add unproduceable vars to model
    for (const itemId of state.unproduceableIds) {
      const obj = this.itemCost(itemId, 'unproduceable', state);
      const config: VariableProperties = {
        obj,
        lb: 0,
        name: itemId,
      };
      unproduceableVarEntities[itemId] = m.addVar(config);
    }

    // Add excluded vars to model
    for (const itemId of state.excludedIds) {
      const obj = this.itemCost(itemId, 'excluded', state);
      const config: VariableProperties = {
        obj,
        lb: 0,
        name: itemId,
      };
      excludedVarEntities[itemId] = m.addVar(config);
    }

    // Add input/output vars to model
    for (const itemId of itemIds) {
      const obj = this.itemCost(itemId, 'surplus', state);
      const config: VariableProperties = {
        obj,
        lb: 0,
        name: itemId,
      };
      surplusVarEntities[itemId] = m.addVar(config);

      const values = state.itemValues[itemId];
      if (values.in) {
        const inputConfig: VariableProperties = {
          lb: 0,
          ub: values.in.toNumber(),
          name: itemId,
        };
        inputVarEntities[itemId] = m.addVar(inputConfig);
      }
    }

    // Add net output and input item constraints to model
    const recipeObjectiveOutput: Entities<Entities<Rational>> = {};
    for (const itemId of itemIds) {
      const values = state.itemValues[itemId];
      const netCoeffs: [Variable, number][] = [];
      const inputCoeffs: [Variable, number][] = [];
      state.data.itemIncludedIoRecipeIds[itemId].forEach((recipeId) => {
        const recipe = state.recipes[recipeId];
        if (recipe == null) return;

        const val = recipe.output[itemId];
        if (val?.nonzero()) {
          netCoeffs.push([recipeVarEntities[recipeId], val.toNumber()]);
        }

        if (recipe.in[itemId]) {
          inputCoeffs.push([
            recipeVarEntities[recipeId],
            recipe.in[itemId].div(recipe.time).toNumber(),
          ]);
        }
      });

      for (const obj of state.recipeObjectives) {
        const recipe = obj.recipe;
        const val = recipe.output[itemId];
        if (val?.nonzero()) {
          if (val.gt(rational(0n)) && !state.surplusMachinesOutput) {
            if (recipeObjectiveOutput[itemId] == null)
              recipeObjectiveOutput[itemId] = {};
            recipeObjectiveOutput[itemId][obj.id] = val;
          } else {
            netCoeffs.push([
              recipeObjectiveVarEntities[obj.id],
              val.toNumber(),
            ]);
          }
        }

        if (recipe.in[itemId]) {
          inputCoeffs.push([
            recipeObjectiveVarEntities[obj.id],
            recipe.in[itemId].div(recipe.time).toNumber(),
          ]);
        }
      }

      // Add unproduceable coeff
      if (state.unproduceableIds.includes(itemId)) {
        netCoeffs.push([unproduceableVarEntities[itemId], 1]);
      }

      // Add excluded coeff
      if (state.excludedIds.includes(itemId)) {
        netCoeffs.push([excludedVarEntities[itemId], 1]);
      }

      // Add input coeff
      if (values.in) {
        netCoeffs.push([inputVarEntities[itemId], 1]);
      }

      // Add surplus coeff
      netCoeffs.push([surplusVarEntities[itemId], -1]);

      // Add maximize coeff
      if (values.max != null) {
        switch (state.maximizeType) {
          case MaximizeType.Weight: {
            const config: VariableProperties = {
              obj: values.max.mul(state.costs.maximize).toNumber(),
              lb: 0,
              name: itemId,
            };
            maximizeItemVarEntities[itemId] = m.addVar(config);
            netCoeffs.push([maximizeItemVarEntities[itemId], -1]);
            break;
          }
          case MaximizeType.Ratio: {
            maximizeFactor = maximizeFactor.add(values.max);
            netCoeffs.push([maximizeVar, values.max.inverse().toNumber()]);
            break;
          }
        }
      }

      const netConfig: ConstraintProperties = {
        coeffs: netCoeffs,
        lb: values.out.toNumber(),
        ub: values.out.toNumber(),
        name: itemId,
      };
      itemConstrEntities[itemId] = m.addConstr(netConfig);

      if (values.lim) {
        const inputConfig: ConstraintProperties = {
          coeffs: inputCoeffs,
          ub: values.lim.toNumber(),
          name: itemId,
        };
        inputLimitConstrEntities[itemId] = m.addConstr(inputConfig);
      }
    }

    /**
     * Scale maximize cost based on summed values from max objectives. This
     * helps prevent increases in values of maximize objectives from overtaking
     * the maximize cost and resulting in no production as the optimal solution.
     */
    maximizeVar.obj = maximizeVar.obj * maximizeFactor.toNumber();

    // Run GLPK simplex
    const start = Date.now();
    const [returnCode, status] = this.glpkSimplex(m);
    const time = Date.now() - start;
    const surplus: Entities<Rational> = {};
    const unproduceable: Entities<Rational> = {};
    const excluded: Entities<Rational> = {};
    const recipes: Entities<Rational> = {};
    const cost = rational(m.value);

    if (returnCode !== 'ok' || status !== 'optimal') {
      let ray: Constraint | Variable | undefined;
      try {
        ray = m.ray;
      } catch {
        // Ignore error
      }

      let unboundedRecipeId: string | undefined;
      if (ray && contains(recipeVarEntities, ray)) {
        unboundedRecipeId = ray.name;
      }

      return {
        returnCode,
        status,
        unboundedRecipeId,
        time,
        surplus,
        unproduceable,
        excluded,
        recipes,
        cost,
        error: true,
      };
    }

    // Parse solution
    for (const itemId of itemIds) {
      const values = state.itemValues[itemId];
      const val = rational(surplusVarEntities[itemId].value);
      if (val.nonzero()) surplus[itemId] = val;

      if (recipeObjectiveOutput[itemId]) {
        for (const objId of Object.keys(recipeObjectiveOutput[itemId])) {
          const outRat = recipeObjectiveOutput[itemId][objId];
          const recipeVal = recipeObjectiveVarEntities[objId].value;
          const recipeValRat = rational(recipeVal);
          const val = recipeValRat.mul(outRat);
          values.out = values.out.add(val);
        }
      }

      if (values.max != null) {
        switch (state.maximizeType) {
          case MaximizeType.Ratio: {
            const maxVal = maximizeVar.value;
            const maxRat = rational(maxVal);
            const val = maxRat.mul(values.max);
            // Add maximize output to items output
            values.out = values.out.add(val);
            break;
          }
          case MaximizeType.Weight: {
            const maxVal = maximizeItemVarEntities[itemId].value;
            const val = rational(maxVal);
            // Add maximize output to items output
            values.out = values.out.add(val);
            break;
          }
        }
      }
    }

    for (const recipeId of recipeIds) {
      const val = rational(recipeVarEntities[recipeId].value);
      if (val.nonzero()) recipes[recipeId] = val;
    }

    for (const itemId of state.unproduceableIds) {
      const val = rational(unproduceableVarEntities[itemId].value);
      if (val.nonzero()) unproduceable[itemId] = val;
    }

    for (const itemId of state.excludedIds) {
      const val = rational(excludedVarEntities[itemId].value);
      if (val.nonzero()) excluded[itemId] = val;
    }

    // Update recipe objective counts to account for maximizations
    state.recipeObjectives = state.recipeObjectives.map((o) => ({
      ...o,
      ...{ value: rational(recipeObjectiveVarEntities[o.id].value) },
    }));

    return {
      returnCode,
      status,
      time,
      surplus,
      unproduceable,
      excluded,
      recipes,
      cost,
      error: false,
    };
  }

  /** Simplex method wrapper mainly for test mocking */
  static glpkSimplex(model: Model): [Simplex.ReturnCode, Status] {
    const returnCode = model.simplex(simplexConfig);
    return [returnCode, model.status];
  }
  //#endregion

  //#region Solution
  /** Update steps with matrix solution */
  static updateSteps(solution: MatrixSolution, state: MatrixState): void {
    for (const itemId of Object.keys(state.itemValues)) {
      this.addItemStep(itemId, solution, state);
    }

    this.assignRecipes(solution, state);
    for (const recipe of Object.keys(solution.recipes).map(
      (r) => state.recipes[r],
    )) {
      this.addRecipeStep(recipe, solution, state);
    }

    for (const objective of state.recipeObjectives) {
      this.addRecipeStep(objective.recipe, solution, state, objective);
    }

    // Move output steps to the top of the list
    state.steps.sort(
      (a, b) => (a.output != null ? 0 : 1) - (b.output != null ? 0 : 1),
    );
  }

  /** Update steps with item from matrix solution */
  static addItemStep(
    itemId: string,
    solution: MatrixSolution,
    state: MatrixState,
  ): void {
    const values = state.itemValues[itemId];
    const steps = state.steps;
    let output = rational(0n);
    state.data.itemIncludedIoRecipeIds[itemId].forEach((recipeId) => {
      const recipeAmt = solution.recipes[recipeId];
      if (recipeAmt == null) return;

      const recipe = state.recipes[recipeId];
      if (recipe == null || recipe.out[itemId] == null) return;

      const amount = recipe.out[itemId]
        .mul(solution.recipes[recipe.id])
        .div(recipe.time);
      output = output.add(amount);
    });

    const input = state.itemValues[itemId].in;
    if (input) output = output.add(input);

    for (const objective of state.recipeObjectives) {
      const recipe = objective.recipe;
      if (!recipe.out[itemId]) continue;
      output = output.add(
        recipe.out[itemId].mul(objective.value).div(recipe.time),
      );
    }

    if (solution.unproduceable[itemId])
      output = output.add(solution.unproduceable[itemId]);

    if (solution.excluded[itemId])
      output = output.add(solution.excluded[itemId]);

    if (output.nonzero()) {
      const step: Step = {
        id: steps.length.toString(),
        itemId,
        items: output,
      };
      if (values.out.gt(rational(0n))) {
        step.output = values.out;
        step.parents = { '': step.output };
      }

      steps.push(step);

      if (solution.surplus[itemId]?.nonzero()) {
        /**
         * Check for floating point errors in surplus amount. If surplus only
         * differs from output by a rounding error, set surplus to the output
         * amount, since that is the more reliable value.
         */
        const diff = rational(output.sub(solution.surplus[itemId]).toNumber());
        step.surplus = diff.isZero() ? step.items : solution.surplus[itemId];
      }
    }
  }

  /** Attempt to intelligently assign recipes to steps with no recipe */
  static assignRecipes(solution: MatrixSolution, state: MatrixState): void {
    const steps = state.steps;
    const recipes = Object.keys(solution.recipes).map((r) => state.recipes[r]);
    recipes.push(...state.recipeObjectives.map((p) => p.recipe));
    // Check for exact id matches
    for (const step of steps.filter((s) => s.recipeId == null)) {
      const i = recipes.findIndex(
        (r) => r.id === step.itemId && r.produces.has(step.itemId),
      );
      if (i !== -1) {
        step.recipeId = recipes[i].id;
        recipes.splice(i, 1);
      }
    }

    // Find best recipe match for remaining steps
    const potentials: Entities<string[]> = {};
    for (const step of steps.filter((s) => s.recipeId == null)) {
      if (step.itemId) {
        potentials[step.itemId] = recipes
          .filter((r) => step.itemId && r.produces.has(step.itemId))
          .sort((a, b) => Object.keys(a.out).length - Object.keys(b.out).length)
          .map((r) => r.id);
      }
    }

    const order = Object.keys(potentials).sort(
      (a, b) => potentials[a].length - potentials[b].length,
    );
    for (const itemId of order) {
      for (const option of potentials[itemId]) {
        if (!steps.some((s) => s.recipeId === option)) {
          const step = steps.find((s) => s.itemId === itemId);
          if (step) {
            step.recipeId = option;
            break;
          }
        }
      }
    }
  }

  /** Update steps with recipe from matrix solution */
  static addRecipeStep(
    recipe: AdjustedRecipe,
    solution: MatrixSolution,
    state: MatrixState,
    recipeObjective?: RecipeObjective,
  ): void {
    const steps = state.steps;
    // Don't assign to any step that already has a recipe or objective assigned
    // (Those steps should have non-nullish machines)
    const options = steps.filter((s) => s.machines == null);
    // Look for a step that was selected to be associated with this recipe
    let step = options.find((s) => s.recipeId === recipe.id);
    if (!step) {
      // Look for any existing step that could be a match
      step = options.find(
        (s) =>
          s.recipeId == null &&
          s.itemId != null &&
          recipe.produces.has(s.itemId),
      );
    }

    if (!step) {
      // No step was found, need to create a new one for this recipe/objective
      const index = steps.findIndex(
        (s) => s.itemId && recipe.produces.has(s.itemId),
      );
      step = {
        id: steps.length.toString(),
      };
      if (index !== -1 && index < steps.length - 1) {
        steps.splice(index + 1, 0, step);
      } else {
        steps.push(step);
      }
    }

    step.recipeId = recipe.id;
    step.recipe = recipe;
    if (recipeObjective) {
      step.machines = recipeObjective.value;
      step.recipeObjectiveId = recipeObjective.id;
    } else {
      step.machines = solution.recipes[recipe.id].add(
        step.machines ?? rational(0n),
      );
    }

    RateUtility.adjustPowerPollution(step, recipe, state.data.game);
  }
  //#endregion
}

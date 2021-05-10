import {
  Step,
  Dataset,
  DisplayRate,
  Entities,
  Rational,
  DisplayRateVal,
  RationalRecipe,
} from '~/models';
import { ItemsState } from '~/store/items';

export class RateUtility {
  static LAUNCH_TIME = new Rational(BigInt(2420), BigInt(60));

  static addStepsFor(
    itemId: string,
    rate: Rational,
    steps: Step[],
    itemSettings: ItemsState,
    data: Dataset,
    parentId: string = null
  ): void {
    let recipe = data.recipeR[data.itemRecipeIds[itemId]];
    if (recipe && !recipe.produces(itemId)) {
      recipe = null;
    }

    // Find existing step for this item
    let step = steps.find((s) => s.itemId === itemId);

    if (step) {
      steps.push(steps.splice(steps.indexOf(step), 1)[0]);
    } else {
      // No existing step found, create a new one
      step = {
        itemId,
        recipeId: recipe ? recipe.id : null,
        items: Rational.zero,
        factories: Rational.zero,
      };

      steps.push(step);
    }

    // Adjust for consumption instead of production if desired
    if (recipe?.adjustProd) {
      rate = rate.mul(recipe.productivity);
    }

    // Add items to the step
    step.items = step.items.add(rate);

    this.addParentValue(step, parentId, rate);

    if (recipe) {
      // Calculate number of outputs from recipe
      const out = recipe.out[itemId].sub(recipe.in?.[itemId] || Rational.zero);

      // Calculate factories
      step.factories = step.items.mul(recipe.time).div(out);

      this.adjustPowerPollution(step, recipe);

      // Recurse adding steps for ingredients
      if (
        recipe.in &&
        step.items.nonzero() &&
        !itemSettings[step.itemId].ignore
      ) {
        for (const ingredient of Object.keys(recipe.in).filter(
          (i) => i !== itemId
        )) {
          const ingredientRate = rate.mul(recipe.in[ingredient]).div(out);
          RateUtility.addStepsFor(
            ingredient,
            ingredientRate,
            steps,
            itemSettings,
            data,
            recipe.id
          );
        }
      }
    }
  }

  static addParentValue(step: Step, parentId: string, rate: Rational): void {
    if (parentId) {
      if (!step.parents) {
        step.parents = {};
      }
      if (step.parents[parentId]) {
        step.parents[parentId] = step.parents[parentId].add(rate);
      } else {
        step.parents[parentId] = rate;
      }
    }
  }

  static adjustPowerPollution(step: Step, recipe: RationalRecipe): void {
    if (step.factories?.nonzero()) {
      // Calculate power
      if (recipe.consumption?.nonzero()) {
        step.power = step.factories.mul(recipe.consumption);
      }
      // Calculate pollution
      if (recipe.pollution?.nonzero()) {
        step.pollution = step.factories.mul(recipe.pollution);
      }
    }
  }

  static calculateBelts(
    steps: Step[],
    itemSettings: ItemsState,
    beltSpeed: Entities<Rational>,
    data: Dataset
  ): Step[] {
    for (const step of steps) {
      const belt = itemSettings[step.itemId]?.belt;
      if (step.items && belt) {
        step.belts = step.items.div(beltSpeed[belt]);
      }
      const wagon = itemSettings[step.itemId]?.wagon;
      if (step.items && wagon) {
        const item = data.itemR[step.itemId];
        if (item.stack) {
          step.wagons = step.items.div(
            data.itemR[wagon].cargoWagon.size.mul(item.stack)
          );
        } else {
          step.wagons = step.items.div(data.itemR[wagon].fluidWagon.capacity);
        }
      }
    }
    return steps;
  }

  static calculateOutputs(steps: Step[], data: Dataset): Step[] {
    for (const step of steps.filter((s) => s.recipeId)) {
      const recipe = data.recipeR[step.recipeId];
      step.outputs = {};
      for (const id of Object.keys(recipe.out)) {
        const val = recipe.out[id].mul(step.factories).div(recipe.time);
        const outStep = steps.find((s) => s.itemId === id);
        step.outputs[id] = val.div(outStep.items);
      }
    }
    return steps;
  }

  static displayRate(steps: Step[], displayRate: DisplayRate): Step[] {
    const displayRateVal = DisplayRateVal[displayRate];
    for (const step of steps) {
      if (step.items) {
        if (step.parents) {
          for (const key of Object.keys(step.parents)) {
            step.parents[key] = step.parents[key].div(step.items);
          }
        }
        step.items = step.items.mul(displayRateVal);
      }
      if (step.surplus) {
        step.surplus = step.surplus.mul(displayRateVal);
      }
      if (step.wagons) {
        step.wagons = step.wagons.mul(displayRateVal);
      }
      if (step.pollution) {
        step.pollution = step.pollution.mul(displayRateVal);
      }
    }
    return steps;
  }

  static copy(steps: Step[]): Step[] {
    return steps.map((s) =>
      s.parents ? { ...s, ...{ parents: { ...s.parents } } } : { ...s }
    );
  }
}

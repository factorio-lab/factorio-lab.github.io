import Fraction from 'fraction.js';

import { Step, Recipe, RateType, DisplayRate, Entities } from '../models';
import { RecipeState } from '../store/recipe';

const WAGON_STACKS = 40;
const WAGON_FLUID = 25000;

export class RateUtility {
  public static toFactories(
    rate: Fraction,
    time: Fraction,
    quantity: Fraction,
    factors: [Fraction, Fraction]
  ) {
    return rate
      .mul(time)
      .div(quantity)
      .div(factors[0].mul(factors[1]));
  }

  public static toRate(
    factories: Fraction,
    time: Fraction,
    quantity: Fraction,
    factors: [Fraction, Fraction]
  ) {
    return factories
      .div(time)
      .mul(quantity)
      .mul(factors[0].mul(factors[1]));
  }

  public static normalizeRate(
    rate: Fraction,
    rateType: RateType,
    displayRate: DisplayRate,
    stack: number,
    beltSpeed: number,
    flowRate: number,
    recipe: Recipe,
    recipeFactors: [Fraction, Fraction]
  ) {
    switch (rateType) {
      case RateType.Items:
        return rate.div(displayRate);
      case RateType.Lanes:
        return rate.mul(stack ? beltSpeed : flowRate);
      case RateType.Wagons:
        return rate
          .div(displayRate)
          .mul(stack ? stack * WAGON_STACKS : WAGON_FLUID);
      case RateType.Factories:
        return this.toRate(
          rate,
          new Fraction(recipe.time),
          new Fraction(recipe.out ? recipe.out[recipe.id] : 1),
          recipeFactors
        );
      default:
        return rate;
    }
  }

  public static addStepsFor(
    id: string,
    rate: Fraction,
    recipe: Recipe,
    steps: Step[],
    recipeSettings: RecipeState,
    beltSpeed: Entities<Fraction>,
    recipeFactors: Entities<[Fraction, Fraction]>,
    recipes: Entities<Recipe>
  ) {
    // Find existing step for this item
    let step = steps.find(s => s.itemId === id);

    if (!step) {
      // No existing step found, create a new one
      step = {
        itemId: id,
        items: new Fraction(0),
        factories: new Fraction(0),
        settings: recipe ? recipeSettings[recipe.id] : null
      };

      steps.push(step);
    }

    // Add items to the step
    step.items = step.items.add(rate);

    if (recipe) {
      // Calculate recipe and ingredients
      step.lanes = step.items.div(beltSpeed[step.settings.belt]);

      // Calculate number of outputs from recipe
      const out = new Fraction(recipe.out ? recipe.out[id] : 1);

      // Calculate number of factories required
      step.factories = RateUtility.toFactories(
        step.items,
        new Fraction(recipe.time),
        out,
        recipeFactors[recipe.id]
      );

      // Recurse adding steps for ingredients
      if (recipe.in) {
        for (const ingredient of Object.keys(recipe.in)) {
          RateUtility.addStepsFor(
            ingredient,
            rate
              .mul(recipe.in[ingredient])
              .div(out)
              .div(recipeFactors[recipe.id][1]),
            recipes[ingredient],
            steps,
            recipeSettings,
            beltSpeed,
            recipeFactors,
            recipes
          );
        }
      }
    }
  }

  public static displayRate(steps: Step[], displayRate: DisplayRate) {
    for (const step of steps) {
      step.items = step.items.mul(displayRate);
    }
    return steps;
  }
}

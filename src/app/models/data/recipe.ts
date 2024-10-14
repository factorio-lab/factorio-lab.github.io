import { cloneEntities, Entities, toRationalEntities } from '../entities';
import { rational, Rational } from '../rational';

export interface RecipeJson {
  id: string;
  name: string;
  category: string;
  row: number;
  time: number | string;
  producers: string[];
  in: Entities<number | string>;
  out: Entities<number | string>;
  /** Denotes amount of output that is not affected by productivity */
  catalyst?: Entities<number | string>;
  cost?: number | string;
  /** If recipe is a rocket launch, indicates the rocket part recipe used */
  part?: string;
  /** If a recipe is locked initially, indicates which technology is required */
  unlockedBy?: string | string[];
  isMining?: boolean;
  isTechnology?: boolean;
  isBurn?: boolean;
  /** Used to link the recipe to an alternate icon id */
  icon?: string;
  /** Used to add extra text to an already defined icon */
  iconText?: string;
  /** Used to override the machine's usage for this recipe */
  usage?: number | string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  row: number;
  time: Rational;
  producers: string[];
  in: Entities<Rational>;
  out: Entities<Rational>;
  /** Denotes amount of output that is not affected by productivity */
  catalyst?: Entities<Rational>;
  cost?: Rational;
  /** If recipe is a rocket launch, indicates the rocket part recipe used */
  part?: string;
  /** If a recipe is locked initially, indicates which technology unlocks it */
  unlockedBy?: string | string[];
  isMining?: boolean;
  isTechnology?: boolean;
  isBurn?: boolean;
  /** Used to link the recipe to an alternate icon id */
  icon?: string;
  /** Used to add extra text to an already defined icon */
  iconText?: string;
  usage?: Rational;
  drain?: Rational;
  consumption?: Rational;
  pollution?: Rational;
}

export function parseRecipe(json: RecipeJson): Recipe {
  return {
    id: json.id,
    name: json.name,
    category: json.category,
    row: json.row,
    time: rational(json.time),
    producers: json.producers,
    in: toRationalEntities(json.in),
    out: toRationalEntities(json.out),
    catalyst: toRationalEntities(json.catalyst),
    cost: rational(json.cost),
    part: json.part,
    unlockedBy: json.unlockedBy,
    isMining: json.isMining,
    isTechnology: json.isTechnology,
    isBurn: json.isBurn,
    icon: json.icon,
    iconText: json.iconText,
    usage: rational(json.usage),
  };
}

export function cloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ...{
      in: cloneEntities(recipe.in),
      out: cloneEntities(recipe.out),
      catalyst: cloneEntities(recipe.catalyst),
    },
  };
}

export interface AdjustedRecipe extends Recipe {
  productivity: Rational;
  produces: Set<string>;
  output: Entities<Rational>;
}

export function finalizeRecipe(recipe: AdjustedRecipe): void {
  for (const outId of Object.keys(recipe.out)) {
    const output = recipe.out[outId];
    if (recipe.in[outId] == null || recipe.in[outId].lt(output)) {
      recipe.produces.add(outId);
    }

    recipe.output[outId] = output
      .sub(recipe.in[outId] ?? rational(0n))
      .div(recipe.time);
  }

  for (const inId of Object.keys(recipe.in).filter(
    (i) => recipe.out[i] == null,
  )) {
    const input = recipe.in[inId];
    recipe.output[inId] = input.inverse().div(recipe.time);
  }
}

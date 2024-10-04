import { MenuItem } from './menu-item';
import { Rational } from './rational';
import { Step } from './step';

export interface StepOutput {
  inputs?: boolean;
  value: Rational;
  step?: Step;
}

export interface StepDetail {
  tabs: MenuItem[];
  outputs: StepOutput[];
  recipeIds: string[];
  allRecipesIncluded: boolean;
}

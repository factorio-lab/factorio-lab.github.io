import { Action } from '@ngrx/store';

import {
  BeaconSettings,
  IdValueDefaultPayload,
  IdValuePayload,
  ModuleSettings,
  Rational,
} from '~/models';

export const enum RecipesActionType {
  SET_EXCLUDED = '[Recipes] Set Excluded',
  SET_EXCLUDED_BATCH = '[Recipes] Set Excluded Batch',
  SET_CHECKED = '[Recipes] Set Checked',
  SET_MACHINE = '[Recipes] Set Machine',
  SET_FUEL = '[Recipes] Set Fuel',
  SET_MODULES = '[Recipes] Set Modules',
  SET_BEACONS = '[Recipes] Set Beacons',
  SET_OVERCLOCK = '[Recipes] Set Overclock',
  SET_COST = '[Recipes] Set Cost',
  RESET_RECIPE = '[Recipes] Reset Recipe',
  RESET_RECIPE_MACHINE = '[Recipes] Reset Recipe Machine',
  RESET_EXCLUDED = '[Recipes] Reset Excluded',
  RESET_MACHINES = '[Recipes] Reset Machines',
  RESET_BEACONS = '[Recipes] Reset Beacons',
  RESET_COST = '[Recipes] Reset Cost',
}

export class SetExcludedAction implements Action {
  readonly type = RecipesActionType.SET_EXCLUDED;
  constructor(public payload: IdValueDefaultPayload<boolean>) {}
}

export class SetExcludedBatchAction implements Action {
  readonly type = RecipesActionType.SET_EXCLUDED_BATCH;
  constructor(public payload: IdValueDefaultPayload<boolean>[]) {}
}

export class SetCheckedAction implements Action {
  readonly type = RecipesActionType.SET_CHECKED;
  constructor(public payload: IdValuePayload<boolean>) {}
}

export class SetMachineAction implements Action {
  readonly type = RecipesActionType.SET_MACHINE;
  constructor(public payload: IdValueDefaultPayload) {}
}

export class SetFuelAction implements Action {
  readonly type = RecipesActionType.SET_FUEL;
  constructor(public payload: IdValueDefaultPayload) {}
}

export class SetModulesAction implements Action {
  readonly type = RecipesActionType.SET_MODULES;
  constructor(public payload: IdValuePayload<ModuleSettings[] | undefined>) {}
}

export class SetBeaconsAction implements Action {
  readonly type = RecipesActionType.SET_BEACONS;
  constructor(public payload: IdValuePayload<BeaconSettings[] | undefined>) {}
}

export class SetOverclockAction implements Action {
  readonly type = RecipesActionType.SET_OVERCLOCK;
  constructor(public payload: IdValueDefaultPayload<Rational>) {}
}

export class SetCostAction implements Action {
  readonly type = RecipesActionType.SET_COST;
  constructor(public payload: IdValuePayload<Rational | undefined>) {}
}

export class ResetRecipeAction implements Action {
  readonly type = RecipesActionType.RESET_RECIPE;
  constructor(public payload: string) {}
}

export class ResetRecipeMachineAction implements Action {
  readonly type = RecipesActionType.RESET_RECIPE_MACHINE;
  constructor(public payload: string) {}
}

export class ResetExcludedAction implements Action {
  readonly type = RecipesActionType.RESET_EXCLUDED;
}

export class ResetMachinesAction implements Action {
  readonly type = RecipesActionType.RESET_MACHINES;
}

export class ResetBeaconsAction implements Action {
  readonly type = RecipesActionType.RESET_BEACONS;
}

export class ResetCostAction implements Action {
  readonly type = RecipesActionType.RESET_COST;
}

export type RecipesAction =
  | SetExcludedAction
  | SetExcludedBatchAction
  | SetCheckedAction
  | SetMachineAction
  | SetFuelAction
  | SetModulesAction
  | SetBeaconsAction
  | SetOverclockAction
  | SetCostAction
  | ResetRecipeAction
  | ResetRecipeMachineAction
  | ResetExcludedAction
  | ResetMachinesAction
  | ResetBeaconsAction
  | ResetCostAction;

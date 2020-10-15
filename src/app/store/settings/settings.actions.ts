import { Action } from '@ngrx/store';

import {
  DisplayRate,
  ResearchSpeed,
  Theme,
  DefaultPayload,
  Preset,
  Sort,
  LinkValue,
  IdPayload,
  InserterTarget,
  InserterCapacity,
} from '~/models';

export const enum SettingsActionType {
  SAVE_STATE = '[Settings] Save State',
  DELETE_STATE = '[Settings] Delete State',
  SET_PRESET = '[Settings] Set Preset',
  SET_BASE = '[Settings] Set Base',
  SET_MODS = '[Settings] Set Mods',
  SET_DISABLED_RECIPES = '[Settings] Set Disabled Recipes',
  SET_EXPENSIVE = '[Settings] Set Expensive',
  SET_FACTORY_RANK = '[Settings] Set Factory Rank',
  SET_MODULE_RANK = '[Settings] Set Module Rank',
  SET_DRILL_MODULE = '[Settings] Set Drill Module',
  SET_BEACON = '[Settings] Set Beacon',
  SET_BEACON_MODULE = '[Settings] Set Beacon Module',
  SET_BEACON_COUNT = '[Settings] Set Beacon Count',
  SET_BELT = '[Settings] Set Belt',
  SET_FUEL = '[Settings] Set Fuel',
  SET_FLOW_RATE = '[Settings] Set Flow Rate',
  SET_DISPLAY_RATE = '[Settings] Set Display Rate',
  SET_ITEM_PRECISION = '[Settings] Set Item Precision',
  SET_BELT_PRECISION = '[Settings] Set Belt Precision',
  SET_WAGON_PRECISION = '[Settings] Set Wagon Precision',
  SET_FACTORY_PRECISION = '[Settings] Set Factory Precision',
  SET_POWER_PRECISION = '[Settings] Set Power Precision',
  SET_POLLUTION_PRECISION = '[Settings] Set Pollution Precision',
  SET_MINING_BONUS = '[Settings] Set Mining Bonus',
  SET_RESEARCH_SPEED = '[Settings] Set Research Speed',
  SET_INSERTER_TARGET = '[Settings] Set Inserter Target',
  SET_INSERTER_CAPACITY = '[Settings] Set Inserter Capacity',
  SET_COLUMNS = '[Settings] Set Columns',
  SET_SORT = '[Settings] Set Sort',
  SET_LINK_VALUE = '[Settings] Set Link Value',
  SET_THEME = '[Settings] Set Theme',
  SHOW_HEADER = '[Settings] Show Header',
  HIDE_HEADER = '[Settings] Hide Header',
  RESET = '[Settings] Reset',
}

export class SaveStateAction implements Action {
  readonly type = SettingsActionType.SAVE_STATE;
  constructor(public payload: IdPayload) {}
}

export class DeleteStateAction implements Action {
  readonly type = SettingsActionType.DELETE_STATE;
  constructor(public payload: string) {}
}

export class SetPresetAction implements Action {
  readonly type = SettingsActionType.SET_PRESET;
  constructor(public payload: Preset) {}
}

export class SetBaseAction implements Action {
  readonly type = SettingsActionType.SET_BASE;
  constructor(public payload: string) {}
}

export class SetModsAction implements Action {
  readonly type = SettingsActionType.SET_MODS;
  constructor(public payload: DefaultPayload<string[]>) {}
}

export class SetDisabledRecipesAction implements Action {
  readonly type = SettingsActionType.SET_DISABLED_RECIPES;
  constructor(public payload: DefaultPayload<string[]>) {}
}

export class SetExpensiveAction implements Action {
  readonly type = SettingsActionType.SET_EXPENSIVE;
  constructor(public payload: boolean) {}
}

export class SetFactoryRankAction implements Action {
  readonly type = SettingsActionType.SET_FACTORY_RANK;
  constructor(public payload: DefaultPayload<string[]>) {}
}

export class SetModuleRankAction implements Action {
  readonly type = SettingsActionType.SET_MODULE_RANK;
  constructor(public payload: DefaultPayload<string[]>) {}
}

export class SetDrillModuleAction implements Action {
  readonly type = SettingsActionType.SET_DRILL_MODULE;
  constructor(public payload: boolean) {}
}

export class SetBeaconAction implements Action {
  readonly type = SettingsActionType.SET_BEACON;
  constructor(public payload: DefaultPayload) {}
}

export class SetBeaconModuleAction implements Action {
  readonly type = SettingsActionType.SET_BEACON_MODULE;
  constructor(public payload: DefaultPayload) {}
}

export class SetBeaconCountAction implements Action {
  readonly type = SettingsActionType.SET_BEACON_COUNT;
  constructor(public payload: DefaultPayload<number>) {}
}

export class SetBeltAction implements Action {
  readonly type = SettingsActionType.SET_BELT;
  constructor(public payload: DefaultPayload) {}
}

export class SetFuelAction implements Action {
  readonly type = SettingsActionType.SET_FUEL;
  constructor(public payload: DefaultPayload) {}
}

export class SetFlowRateAction implements Action {
  readonly type = SettingsActionType.SET_FLOW_RATE;
  constructor(public payload: number) {}
}

export class SetDisplayRateAction implements Action {
  readonly type = SettingsActionType.SET_DISPLAY_RATE;
  constructor(public payload: DisplayRate) {}
}

export class SetItemPrecisionAction implements Action {
  readonly type = SettingsActionType.SET_ITEM_PRECISION;
  constructor(public payload: number) {}
}

export class SetBeltPrecisionAction implements Action {
  readonly type = SettingsActionType.SET_BELT_PRECISION;
  constructor(public payload: number) {}
}

export class SetWagonPrecisionAction implements Action {
  readonly type = SettingsActionType.SET_WAGON_PRECISION;
  constructor(public payload: number) {}
}

export class SetFactoryPrecisionAction implements Action {
  readonly type = SettingsActionType.SET_FACTORY_PRECISION;
  constructor(public payload: number) {}
}

export class SetPowerPrecisionAction implements Action {
  readonly type = SettingsActionType.SET_POWER_PRECISION;
  constructor(public payload: number) {}
}

export class SetPollutionPrecisionAction implements Action {
  readonly type = SettingsActionType.SET_POLLUTION_PRECISION;
  constructor(public payload: number) {}
}

export class SetMiningBonusAction implements Action {
  readonly type = SettingsActionType.SET_MINING_BONUS;
  constructor(public payload: number) {}
}

export class SetResearchSpeedAction implements Action {
  readonly type = SettingsActionType.SET_RESEARCH_SPEED;
  constructor(public payload: ResearchSpeed) {}
}

export class SetInserterTargetAction implements Action {
  readonly type = SettingsActionType.SET_INSERTER_TARGET;
  constructor(public payload: InserterTarget) {}
}

export class SetInserterCapacityAction implements Action {
  readonly type = SettingsActionType.SET_INSERTER_CAPACITY;
  constructor(public payload: InserterCapacity) {}
}

export class SetColumnsAction implements Action {
  readonly type = SettingsActionType.SET_COLUMNS;
  constructor(public payload: string[]) {}
}

export class SetSortAction implements Action {
  readonly type = SettingsActionType.SET_SORT;
  constructor(public payload: Sort) {}
}

export class SetLinkValueAction implements Action {
  readonly type = SettingsActionType.SET_LINK_VALUE;
  constructor(public payload: LinkValue) {}
}

export class SetThemeAction implements Action {
  readonly type = SettingsActionType.SET_THEME;
  constructor(public payload: Theme) {}
}

export class ShowHeaderAction implements Action {
  readonly type = SettingsActionType.SHOW_HEADER;
}

export class HideHeaderAction implements Action {
  readonly type = SettingsActionType.HIDE_HEADER;
}

export class ResetAction implements Action {
  readonly type = SettingsActionType.RESET;
}

export type SettingsAction =
  | SaveStateAction
  | DeleteStateAction
  | SetPresetAction
  | SetBaseAction
  | SetModsAction
  | SetDisabledRecipesAction
  | SetExpensiveAction
  | SetFactoryRankAction
  | SetModuleRankAction
  | SetDrillModuleAction
  | SetBeaconAction
  | SetBeaconModuleAction
  | SetBeaconCountAction
  | SetBeltAction
  | SetFuelAction
  | SetFlowRateAction
  | SetDisplayRateAction
  | SetItemPrecisionAction
  | SetBeltPrecisionAction
  | SetWagonPrecisionAction
  | SetFactoryPrecisionAction
  | SetPowerPrecisionAction
  | SetPollutionPrecisionAction
  | SetMiningBonusAction
  | SetResearchSpeedAction
  | SetInserterTargetAction
  | SetInserterCapacityAction
  | SetColumnsAction
  | SetSortAction
  | SetLinkValueAction
  | SetThemeAction
  | HideHeaderAction
  | ShowHeaderAction
  | ResetAction;

import { createSelector } from '@ngrx/store';
import { SelectItem } from 'primeng/api';

import { environment } from 'src/environments';
import { fnPropsNotNullish, getIdOptions } from '~/helpers';
import {
  Column,
  columnOptions,
  Dataset,
  Defaults,
  displayRateInfo,
  Entities,
  FuelType,
  Game,
  InserterData,
  ItemId,
  Preset,
  presetOptions,
  rateTypeOptions,
  Rational,
  RationalBeacon,
  RationalBelt,
  RationalCargoWagon,
  RationalFactory,
  RationalFluidWagon,
  RationalFuel,
  RationalItem,
  RationalModule,
  RationalRecipe,
  researchSpeedFactor,
  toBoolEntities,
  toEntities,
} from '~/models';
import { Options } from '~/models/options';
import { LabState } from '../';
import * as Datasets from '../datasets';
import * as Preferences from '../preferences';
import { initialSettingsState, SettingsState } from './settings.reducer';

/* Base selector functions */
export const settingsState = (state: LabState): SettingsState =>
  state.settingsState;

export const getPreset = createSelector(settingsState, (state) => state.preset);
export const getModId = createSelector(settingsState, (state) => state.modId);
export const getBeaconReceivers = createSelector(
  settingsState,
  (state) => state.beaconReceivers
);
export const getFlowRate = createSelector(
  settingsState,
  (state) => state.flowRate
);
export const getDisplayRate = createSelector(
  settingsState,
  (state) => state.displayRate
);
export const getMiningBonus = createSelector(
  settingsState,
  (state) => state.miningBonus
);
export const getResearchSpeed = createSelector(
  settingsState,
  (state) => state.researchSpeed
);
export const getInserterTarget = createSelector(
  settingsState,
  (state) => state.inserterTarget
);
export const getInserterCapacity = createSelector(
  settingsState,
  (state) => state.inserterCapacity
);
export const getCostFactor = createSelector(
  settingsState,
  (state) => state.costFactor
);
export const getCostFactory = createSelector(
  settingsState,
  (state) => state.costFactory
);
export const getCostInput = createSelector(
  settingsState,
  (state) => state.costInput
);
export const getCostIgnored = createSelector(
  settingsState,
  (state) => state.costIgnored
);
export const getProliferatorSprayId = createSelector(
  settingsState,
  (state) => state.proliferatorSprayId
);

/* Complex selectors */
export const getMod = createSelector(
  getModId,
  Datasets.getModEntities,
  (id, data) => data[id]
);

export const getHash = createSelector(
  getModId,
  Datasets.getHashEntities,
  (id, hashEntities) => hashEntities[id]
);

export const getGame = createSelector(
  getModId,
  Datasets.getModInfoEntities,
  (id, data) => data[id].game
);

export const getColumnOptions = createSelector(getGame, (game) =>
  columnOptions(game)
);

export const getDisplayRateInfo = createSelector(
  getDisplayRate,
  (displayRate) => displayRateInfo[displayRate]
);

export const getRateTypeOptions = createSelector(
  getGame,
  getDisplayRateInfo,
  (game, dispRateInfo) => rateTypeOptions(dispRateInfo, game)
);

export const getPresetOptions = createSelector(getGame, (game) =>
  presetOptions(game)
);

export const getModOptions = createSelector(
  getGame,
  Datasets.getModSets,
  (game, modSets) =>
    modSets
      .filter((b) => b.game === game)
      .map(
        (m): SelectItem => ({
          label: m.name,
          value: m.id,
        })
      )
);

export const getColumnsState = createSelector(
  getGame,
  Preferences.getColumns,
  (game, col): Preferences.ColumnsState => {
    switch (game) {
      case Game.CaptainOfIndustry:
        return {
          ...Preferences.initialColumnsState,
          ...col,
          ...{
            [Column.Wagons]: { ...col[Column.Wagons], ...{ show: false } },
            [Column.Beacons]: { ...col[Column.Beacons], ...{ show: false } },
            [Column.Power]: { ...col[Column.Power], ...{ show: false } },
            [Column.Pollution]: {
              ...col[Column.Pollution],
              ...{ show: false },
            },
          },
        };
      case Game.DysonSphereProgram:
        return {
          ...Preferences.initialColumnsState,
          ...col,
          ...{
            [Column.Wagons]: { ...col[Column.Wagons], ...{ show: false } },
            [Column.Beacons]: { ...col[Column.Beacons], ...{ show: false } },
            [Column.Pollution]: {
              ...col[Column.Pollution],
              ...{ show: false },
            },
          },
        };
      case Game.Satisfactory:
        return {
          ...Preferences.initialColumnsState,
          ...col,
          ...{
            [Column.Beacons]: { ...col[Column.Beacons], ...{ show: false } },
            [Column.Pollution]: {
              ...col[Column.Pollution],
              ...{ show: false },
            },
          },
        };
      default:
        return {
          ...Preferences.initialColumnsState,
          ...col,
        };
    }
  }
);

export const getDefaults = createSelector(getPreset, getMod, (preset, base) => {
  if (base) {
    const m = base.defaults;
    if (m) {
      let moduleRank: string[] = [];
      switch (base.game) {
        case Game.Factorio: {
          moduleRank = preset === Preset.Minimum ? [] : m.moduleRank;
          break;
        }
        case Game.DysonSphereProgram: {
          moduleRank = preset === Preset.Beacon8 ? m.moduleRank : [];
          break;
        }
        case Game.Satisfactory: {
          moduleRank = m.moduleRank;
        }
      }
      const defaults: Defaults = {
        beltId: preset === Preset.Minimum ? m.minBelt : m.maxBelt,
        pipeId: preset === Preset.Minimum ? m.minPipe : m.maxPipe,
        fuelId: m.fuel,
        cargoWagonId: m.cargoWagon,
        fluidWagonId: m.fluidWagon,
        disabledRecipeIds: m.disabledRecipes,
        factoryRankIds:
          preset === Preset.Minimum ? m.minFactoryRank : m.maxFactoryRank,
        moduleRankIds: moduleRank,
        beaconCount:
          preset < Preset.Beacon8 ? '0' : preset < Preset.Beacon12 ? '8' : '12',
        beaconId: m.beacon,
        beaconModuleId:
          preset < Preset.Beacon8 ? ItemId.Module : m.beaconModule,
      };
      return defaults;
    }
  }
  return null;
});

export const getSettings = createSelector(
  settingsState,
  getDefaults,
  (s, d) => ({
    ...s,
    ...{
      beltId: s.beltId ?? d?.beltId,
      pipeId: s.pipeId ?? d?.pipeId,
      fuelId: s.fuelId ?? d?.fuelId,
      cargoWagonId: s.cargoWagonId ?? d?.cargoWagonId,
      fluidWagonId: s.fluidWagonId ?? d?.fluidWagonId,
      disabledRecipeIds: s.disabledRecipeIds ?? d?.disabledRecipeIds ?? [],
    },
  })
);

export const getFuelId = createSelector(getSettings, (s) => s.fuelId);

export const getDisabledRecipeIds = createSelector(
  getSettings,
  (s) => s.disabledRecipeIds
);

export const getRationalMiningBonus = createSelector(getMiningBonus, (bonus) =>
  Rational.fromNumber(bonus).div(Rational.hundred)
);

export const getResearchFactor = createSelector(
  getResearchSpeed,
  (speed) => researchSpeedFactor[speed]
);

export const getRationalBeaconReceivers = createSelector(
  getBeaconReceivers,
  (total) => (total ? Rational.fromString(total) : null)
);

export const getRationalFlowRate = createSelector(getFlowRate, (rate) =>
  Rational.fromNumber(rate)
);

export const getRationalCostFactor = createSelector(getCostFactor, (cost) =>
  Rational.fromString(cost)
);

export const getRationalCostFactory = createSelector(getCostFactory, (cost) =>
  Rational.fromString(cost)
);

export const getRationalCostInput = createSelector(getCostInput, (cost) =>
  Rational.fromString(cost)
);

export const getRationalCostIgnored = createSelector(getCostIgnored, (cost) =>
  Rational.fromString(cost)
);

export const getSimplexModifiers = createSelector(
  getRationalCostInput,
  getRationalCostIgnored,
  Preferences.getSimplexType,
  (costInput, costIgnored, simplexType) => ({
    costInput,
    costIgnored,
    simplexType,
  })
);

export const getI18n = createSelector(
  getMod,
  Datasets.getI18nEntities,
  Preferences.getLanguage,
  (base, i18n, lang) => (base ? i18n[`${base.id}-${lang}`] : null)
);

export const getDataset = createSelector(
  getMod,
  getI18n,
  getHash,
  getDefaults,
  getGame,
  (mod, i18n, hash, defaults, game) => {
    // Map out entities with mods
    const categoryEntities = toEntities(
      mod?.categories ?? [],
      {},
      environment.debug
    );
    const modIconPath = mod?.iconPath ?? `data/${mod?.id}/icons.png`;
    const iconEntities = toEntities(
      (mod?.icons ?? []).map((i) => ({
        ...i,
        ...{ file: i.file ?? modIconPath },
      })),
      {},
      environment.debug
    );
    const itemData = toEntities(mod?.items ?? [], {}, environment.debug);
    const recipeEntities = toEntities(
      mod?.recipes ?? [],
      {},
      environment.debug
    );
    const limitations = reduceEntities(mod?.limitations ?? []);

    // Apply localization
    if (i18n) {
      for (const i of Object.keys(i18n.categories).filter(
        (i) => categoryEntities[i]
      )) {
        categoryEntities[i] = {
          ...categoryEntities[i],
          ...{
            name: i18n.categories[i],
          },
        };
      }
      for (const i of Object.keys(i18n.items).filter((i) => itemData[i])) {
        itemData[i] = {
          ...itemData[i],
          ...{
            name: i18n.items[i],
          },
        };
      }
      for (const i of Object.keys(i18n.recipes).filter(
        (i) => recipeEntities[i]
      )) {
        recipeEntities[i] = {
          ...recipeEntities[i],
          ...{
            name: i18n.recipes[i],
          },
        };
      }
    }

    // Convert to id arrays
    const categoryIds = Object.keys(categoryEntities);
    const iconIds = Object.keys(iconEntities);
    const itemIds = Object.keys(itemData);
    const recipeIds = Object.keys(recipeEntities);

    // Generate temporary object arrays
    const items = itemIds.map((i) => itemData[i]);
    const recipes = recipeIds.map((r) => recipeEntities[r]);

    // Filter for item types
    const beaconIds = items
      .filter(fnPropsNotNullish('beacon'))
      .sort((a, b) => a.beacon.modules - b.beacon.modules)
      .map((i) => i.id);
    const beltIds = items
      .filter(fnPropsNotNullish('belt'))
      .sort((a, b) =>
        /** Don't sort belts in DSP, leave based on stacks */
        game === Game.DysonSphereProgram
          ? 0
          : Rational.fromJson(a.belt.speed)
              .sub(Rational.fromJson(b.belt.speed))
              .toNumber()
      )
      .map((i) => i.id);
    const pipeIds = items
      .filter(fnPropsNotNullish('pipe'))
      .sort((a, b) =>
        Rational.fromJson(a.pipe.speed)
          .sub(Rational.fromJson(b.pipe.speed))
          .toNumber()
      )
      .map((i) => i.id);
    const cargoWagonIds = items
      .filter(fnPropsNotNullish('cargoWagon'))
      .sort((a, b) => a.cargoWagon.size - b.cargoWagon.size)
      .map((i) => i.id);
    const fluidWagonIds = items
      .filter(fnPropsNotNullish('fluidWagon'))
      .sort((a, b) => a.fluidWagon.capacity - b.fluidWagon.capacity)
      .map((i) => i.id);
    const factoryIds = items.filter((i) => i.factory).map((i) => i.id);
    const modules = items.filter((i) => i.module);
    const moduleIds = modules.map((i) => i.id);
    const proliferatorModuleIds = modules
      .filter(fnPropsNotNullish('module'))
      .filter((i) => i.module.sprays != null)
      .map((i) => i.id);
    const fuelIds = items
      .filter(fnPropsNotNullish('fuel'))
      .sort((a, b) => a.fuel.value - b.fuel.value)
      .reduce((e: Entities<string[]>, f) => {
        const cat = f.fuel.category;
        if (!e[cat]) {
          e[cat] = [];
        }
        e[cat].push(f.id);
        return e;
      }, {});

    // Calculate missing implicit recipe icons
    // For recipes with no icon, use icon of first output product
    recipes
      .filter((r) => !iconEntities[r.id] && !recipeEntities[r.id].icon)
      .forEach((r) => {
        recipeEntities[r.id] = {
          ...recipeEntities[r.id],
          ...{ icon: Object.keys(r.out)[0] },
        };
      });

    // Calculate category item rows
    const categoryItemRows: Entities<string[][]> = {};
    for (const id of categoryIds) {
      const rows: string[][] = [[]];
      const rowItems = items
        .filter((i) => i.category === id)
        .sort((a, b) => a.row - b.row);
      if (rowItems.length) {
        let index = rowItems[0].row;
        for (const item of rowItems) {
          if (item.row > index) {
            rows.push([]);
            index = item.row;
          }
          rows[rows.length - 1].push(item.id);
        }
        categoryItemRows[id] = rows;
      }
    }

    // Calculate recipe item rows
    const categoryRecipeRows: Entities<string[][]> = {};
    for (const id of categoryIds) {
      const rows: string[][] = [[]];
      const rowRecipes = recipes
        .filter((r) => r.category === id)
        .sort((a, b) => a.row - b.row);
      if (rowRecipes.length) {
        let index = rowRecipes[0].row;
        for (const recipe of rowRecipes) {
          if (recipe.row > index) {
            rows.push([]);
            index = recipe.row;
          }
          rows[rows.length - 1].push(recipe.id);
        }
        categoryRecipeRows[id] = rows;
      }
    }

    // Convert to rationals
    const beaconEntities: Entities<RationalBeacon> = {};
    const beltEntities: Entities<RationalBelt> = {};
    const cargoWagonEntities: Entities<RationalCargoWagon> = {};
    const fluidWagonEntities: Entities<RationalFluidWagon> = {};
    const factoryEntities: Entities<RationalFactory> = {};
    const moduleEntities: Entities<RationalModule> = {};
    const fuelEntities: Entities<RationalFuel> = {};
    const itemEntities = itemIds.reduce((e: Entities<RationalItem>, i) => {
      const item = new RationalItem(itemData[i]);
      if (item.beacon) {
        beaconEntities[i] = item.beacon;
      }
      if (item.belt) {
        beltEntities[i] = item.belt;
      } else if (item.pipe) {
        beltEntities[i] = item.pipe;
      }
      if (item.cargoWagon) {
        cargoWagonEntities[i] = item.cargoWagon;
      }
      if (item.fluidWagon) {
        fluidWagonEntities[i] = item.fluidWagon;
      }
      if (item.factory) {
        factoryEntities[i] = item.factory;
      }
      if (item.module) {
        moduleEntities[i] = item.module;
      }
      if (item.fuel) {
        fuelEntities[i] = item.fuel;
      }

      e[i] = item;
      return e;
    }, {});
    const recipeR = recipeIds.reduce((e: Entities<RationalRecipe>, r) => {
      e[r] = new RationalRecipe(recipeEntities[r]);
      return e;
    }, {});

    // Calculate item simple recipes
    const recipeMatches = recipeIds.reduce(
      (e: Entities<RationalRecipe[]>, r) => {
        const recipe = recipeR[r];
        const outputs = Object.keys(recipe.out);
        for (const o of outputs.filter((i) => recipe.produces(i))) {
          if (!e[o]) {
            e[o] = [recipe];
          } else {
            e[o].push(recipe);
          }
        }
        return e;
      },
      {}
    );
    const itemRecipeId = itemIds.reduce((e: Entities, i) => {
      const matches = Object.prototype.hasOwnProperty.call(recipeMatches, i)
        ? recipeMatches[i]
        : [];
      if (matches.length === 1) {
        e[i] = matches[0].id;
      }
      return e;
    }, {});

    // Calculate complex recipes
    const simpleRecipeIds = Object.keys(itemRecipeId).map(
      (i) => itemRecipeId[i]
    );
    const complexRecipeIds = recipeIds
      .filter(
        (r) =>
          simpleRecipeIds.indexOf(r) === -1 ||
          Object.keys(recipeEntities[r].out).length > 1
      )
      .sort();

    const dataset: Dataset = {
      game,
      version: mod?.version,
      categoryIds,
      categoryEntities,
      categoryItemRows,
      categoryRecipeRows,
      iconIds,
      iconEntities,
      itemIds,
      itemEntities,
      itemRecipeId,
      beaconIds,
      beaconEntities,
      beltIds,
      pipeIds,
      beltEntities,
      cargoWagonIds,
      cargoWagonEntities,
      fluidWagonIds,
      fluidWagonEntities,
      factoryIds,
      factoryEntities,
      moduleIds,
      proliferatorModuleIds,
      moduleEntities,
      fuelIds,
      fuelEntities,
      recipeIds,
      complexRecipeIds,
      recipeEntities,
      recipeR,
      limitations,
      hash,
      defaults,
    };
    return dataset;
  }
);

export const getOptions = createSelector(
  getDataset,
  (data): Options => ({
    items: getIdOptions(data.itemIds, data.itemEntities),
    beacons: getIdOptions(data.beaconIds, data.itemEntities),
    belts: getIdOptions(data.beltIds, data.itemEntities),
    pipes: getIdOptions(data.pipeIds, data.itemEntities),
    cargoWagons: getIdOptions(data.cargoWagonIds, data.itemEntities),
    fluidWagons: getIdOptions(data.fluidWagonIds, data.itemEntities),
    proliferatorModules: getIdOptions(
      data.proliferatorModuleIds,
      data.itemEntities,
      true
    ),
    chemicalFuels: getIdOptions(
      data.fuelIds[FuelType.Chemical] ?? [],
      data.itemEntities
    ),
    complexRecipes: getIdOptions(data.complexRecipeIds, data.recipeEntities),
  })
);

export const getBeltSpeed = createSelector(
  getDataset,
  getRationalFlowRate,
  (data, flowRate) => {
    const value: Entities<Rational> = { [ItemId.Pipe]: flowRate };
    if (data.beltIds) {
      for (const id of data.beltIds) {
        value[id] = data.beltEntities[id].speed;
      }
    }
    if (data.pipeIds) {
      for (const id of data.pipeIds) {
        value[id] = data.beltEntities[id].speed;
      }
    }
    return value;
  }
);

export const getBeltSpeedTxt = createSelector(
  getBeltSpeed,
  getDisplayRateInfo,
  (beltSpeed, dispRateInfo) =>
    Object.keys(beltSpeed).reduce((e: Entities<string>, beltId) => {
      const speed = beltSpeed[beltId].mul(dispRateInfo.value);
      const speedTxt = Number(speed.toNumber().toFixed(2));
      const rateTxt = dispRateInfo.label;
      e[beltId] = speedTxt + rateTxt;
      return e;
    }, {})
);

export const getAdjustmentData = createSelector(
  getFuelId,
  getProliferatorSprayId,
  getRationalMiningBonus,
  getResearchFactor,
  getRationalCostFactor,
  getRationalCostFactory,
  getDataset,
  (
    fuelId,
    proliferatorSprayId,
    miningBonus,
    researchSpeed,
    costFactor,
    costFactory,
    data
  ) => ({
    fuelId,
    proliferatorSprayId,
    miningBonus,
    researchSpeed,
    costFactor,
    costFactory,
    data,
  })
);

export const getSettingsModified = createSelector(settingsState, (state) => ({
  cost:
    state.costFactor !== initialSettingsState.costFactor ||
    state.costFactory !== initialSettingsState.costFactory ||
    state.costInput !== initialSettingsState.costInput ||
    state.costIgnored !== initialSettingsState.costIgnored,
}));

export const getInserterData = createSelector(
  getInserterTarget,
  getInserterCapacity,
  (target, capacity) => InserterData[target][capacity]
);

export function reduceEntities(
  value: Entities<string[]>,
  init: Entities<Entities<boolean>> = {}
): Entities<Entities<boolean>> {
  return Object.keys(value).reduce((e: Entities<Entities<boolean>>, x) => {
    e[x] = toBoolEntities(value[x], init[x]);
    return e;
  }, init);
}

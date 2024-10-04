import { computed, effect, inject, Injectable } from '@angular/core';
import { environment } from 'src/environments';

import {
  coalesce,
  fnPropsNotNullish,
  getIdOptions,
  reduceEntities,
  spread,
  toEntities,
} from '~/helpers';
import { DEFAULT_MOD } from '~/models/constants';
import { Beacon } from '~/models/data/beacon';
import { Belt } from '~/models/data/belt';
import { CargoWagon } from '~/models/data/cargo-wagon';
import { FluidWagon } from '~/models/data/fluid-wagon';
import { Fuel } from '~/models/data/fuel';
import { Item, parseItem } from '~/models/data/item';
import { Machine } from '~/models/data/machine';
import { ModHash } from '~/models/data/mod-hash';
import { ModI18n } from '~/models/data/mod-i18n';
import { Module } from '~/models/data/module';
import { parseRecipe, Recipe } from '~/models/data/recipe';
import { Technology } from '~/models/data/technology';
import { Dataset } from '~/models/dataset';
import { Defaults } from '~/models/defaults';
import { DisplayRate, displayRateInfo } from '~/models/enum/display-rate';
import { Game } from '~/models/enum/game';
import { InserterCapacity } from '~/models/enum/inserter-capacity';
import { InserterTarget } from '~/models/enum/inserter-target';
import { ItemId } from '~/models/enum/item-id';
import { linkValueOptions } from '~/models/enum/link-value';
import { MaximizeType } from '~/models/enum/maximize-type';
import { objectiveUnitOptions } from '~/models/enum/objective-unit';
import { Preset, presetOptions } from '~/models/enum/preset';
import { researchBonusValue } from '~/models/enum/research-bonus';
import { gameInfo } from '~/models/game-info';
import { MenuItem } from '~/models/menu-item';
import { Mod } from '~/models/mod';
import { Option } from '~/models/option';
import { Options } from '~/models/options';
import { Rational, rational } from '~/models/rational';
import { BeaconSettings } from '~/models/settings/beacon-settings';
import {
  columnOptions,
  gameColumnsState,
  initialColumnsState,
} from '~/models/settings/column-settings';
import { CostSettings } from '~/models/settings/cost-settings';
import { ModuleSettings } from '~/models/settings/module-settings';
import { Settings } from '~/models/settings/settings';
import { Entities, Optional } from '~/models/utils';
import { RecipeService } from '~/services/recipe.service';

import { AnalyticsService } from '../services/analytics.service';
import { DatasetsService } from './datasets.service';
import { PreferencesService } from './preferences.service';
import { Store } from './store';

export interface SettingsState {
  modId?: string;
  checkedObjectiveIds: Set<string>;
  maximizeType: MaximizeType;
  surplusMachinesOutput: boolean;
  displayRate: DisplayRate;
  excludedItemIds: Set<string>;
  checkedItemIds: Set<string>;
  beltId?: string;
  pipeId?: string;
  cargoWagonId?: string;
  fluidWagonId?: string;
  flowRate: Rational;
  excludedRecipeIds?: Set<string>;
  checkedRecipeIds: Set<string>;
  netProductionOnly: boolean;
  preset: Preset;
  machineRankIds?: string[];
  fuelRankIds?: string[];
  moduleRankIds?: string[];
  beacons?: BeaconSettings[];
  overclock?: Rational;
  beaconReceivers?: Rational;
  proliferatorSprayId: string;
  inserterTarget: InserterTarget;
  miningBonus: Rational;
  researchBonus: Rational;
  inserterCapacity: InserterCapacity;
  researchedTechnologyIds?: Set<string>;
  costs: CostSettings;
}

export type PartialSettingsState = Partial<Omit<SettingsState, 'costs'>> & {
  costs?: Partial<CostSettings>;
};

export const initialSettingsState: SettingsState = {
  checkedObjectiveIds: new Set(),
  preset: Preset.Minimum,
  maximizeType: MaximizeType.Weight,
  surplusMachinesOutput: false,
  displayRate: DisplayRate.PerMinute,
  excludedItemIds: new Set(),
  checkedItemIds: new Set(),
  flowRate: rational(1200n),
  checkedRecipeIds: new Set(),
  netProductionOnly: false,
  proliferatorSprayId: ItemId.Module,
  inserterTarget: InserterTarget.ExpressTransportBelt,
  miningBonus: rational.zero,
  researchBonus: researchBonusValue.speed6,
  inserterCapacity: InserterCapacity.Capacity7,
  costs: {
    factor: rational.one,
    machine: rational.one,
    footprint: rational.one,
    unproduceable: rational(1000000n),
    excluded: rational.zero,
    surplus: rational.zero,
    maximize: rational(-1000000n),
  },
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService extends Store<SettingsState> {
  analyticsSvc = inject(AnalyticsService);
  datasetsSvc = inject(DatasetsService);
  preferencesSvc = inject(PreferencesService);
  recipeSvc = inject(RecipeService);

  displayRate = this.select('displayRate');
  flowRate = this.select('flowRate');
  maximizeType = this.select('maximizeType');
  modId = this.select('modId');
  preset = this.select('preset');
  researchedTechnologyIds = this.select('researchedTechnologyIds');

  mod = computed(() => {
    const modId = this.modId();
    if (modId == null) return undefined;
    const entities = this.datasetsSvc.modEntities();
    return entities[modId];
  });

  hash = computed(() => {
    const modId = this.modId();
    if (modId == null) return undefined;
    const datasets = this.datasetsSvc.state();
    return datasets[modId]?.hash;
  });

  i18n = computed(() => {
    const modId = this.modId();
    if (modId == null) return undefined;
    const datasets = this.datasetsSvc.state();
    const lang = this.preferencesSvc.language();
    return datasets[modId]?.i18n?.[lang];
  });

  game = computed(() => {
    const mod = this.mod();
    return coalesce(mod?.game, Game.Factorio);
  });

  gameStates = computed(() => {
    const game = this.game();
    const states = this.preferencesSvc.states();
    return states[game];
  });

  stateOptions = computed(() => {
    const states = this.gameStates();
    return Object.keys(states)
      .sort()
      .map((i): Option => ({ label: i, value: i }));
  });

  gameInfo = computed(() => {
    const game = this.game();
    return gameInfo[game];
  });

  columnOptions = computed(() => {
    const gameInfo = this.gameInfo();
    return columnOptions(gameInfo);
  });

  displayRateInfo = computed(() => {
    const displayRate = this.displayRate();
    return displayRateInfo[displayRate];
  });

  objectiveUnitOptions = computed(() => {
    const dispRateInfo = this.displayRateInfo();
    const game = this.game();
    return objectiveUnitOptions(dispRateInfo, game);
  });

  presetOptions = computed(() => {
    const game = this.game();
    return presetOptions(game);
  });

  linkValueOptions = computed(() => {
    const game = this.game();
    return linkValueOptions(game);
  });

  columnsState = computed(() => {
    const gameInfo = this.gameInfo();
    const columns = this.preferencesSvc.columns();
    return gameColumnsState(spread(initialColumnsState, columns), gameInfo);
  });

  defaults = computed(() => this.computeDefaults(this.mod(), this.preset()));

  dataset = computed(() =>
    this.computeDataset(
      this.mod(),
      this.hash(),
      this.i18n(),
      this.game(),
      this.defaults(),
    ),
  );

  allResearchedTechnologyIds = computed(() => {
    const researchedTechnologyIds = this.researchedTechnologyIds();
    const data = this.dataset();

    const allTechnologyIds = Object.keys(data.technologyEntities);
    if (
      /** No need to parse if all researched */
      researchedTechnologyIds == null ||
      /** Skip if data is not loaded */
      allTechnologyIds.length === 0
    )
      return new Set(allTechnologyIds);

    return researchedTechnologyIds;
  });

  settings = computed(() =>
    this.computeSettings(
      this.state(),
      this.defaults(),
      this.allResearchedTechnologyIds(),
    ),
  );

  options = computed((): Options => {
    const data = this.dataset();

    return {
      categories: getIdOptions(data.categoryIds, data.categoryEntities),
      items: getIdOptions(data.itemIds, data.itemEntities),
      beacons: getIdOptions(data.beaconIds, data.itemEntities),
      belts: getIdOptions(data.beltIds, data.itemEntities),
      pipes: getIdOptions(data.pipeIds, data.itemEntities),
      cargoWagons: getIdOptions(data.cargoWagonIds, data.itemEntities),
      fluidWagons: getIdOptions(data.fluidWagonIds, data.itemEntities),
      fuels: getIdOptions(data.fuelIds, data.itemEntities),
      modules: getIdOptions(data.moduleIds, data.itemEntities),
      proliferatorModules: getIdOptions(
        data.proliferatorModuleIds,
        data.itemEntities,
        true,
      ),
      machines: getIdOptions(data.machineIds, data.itemEntities),
      recipes: getIdOptions(data.recipeIds, data.recipeEntities),
    };
  });

  beltSpeed = computed(() => {
    const data = this.dataset();
    const flowRate = this.flowRate();

    const value: Entities<Rational> = { [ItemId.Pipe]: flowRate };
    if (data.beltIds) {
      for (const id of data.beltIds) value[id] = data.beltEntities[id].speed;
    }

    if (data.pipeIds) {
      for (const id of data.pipeIds) value[id] = data.beltEntities[id].speed;
    }
    return value;
  });

  beltSpeedTxt = computed(() => {
    const beltSpeed = this.beltSpeed();
    const dispRateInfo = this.displayRateInfo();

    return Object.keys(beltSpeed).reduce((e: Entities, beltId) => {
      const speed = beltSpeed[beltId].mul(dispRateInfo.value);
      e[beltId] = Number(speed.toNumber().toFixed(2)).toString();
      return e;
    }, {});
  });

  availableRecipeIds = computed(() => {
    const researchedTechnologyIds = this.allResearchedTechnologyIds();
    const data = this.dataset();

    return data.recipeIds.filter((i) => {
      const recipe = data.recipeEntities[i];
      return (
        recipe.unlockedBy == null ||
        researchedTechnologyIds.has(recipe.unlockedBy)
      );
    });
  });

  modMenuItem = computed((): MenuItem => {
    const mod = this.mod();

    return {
      icon: 'fa-solid fa-database',
      routerLink: '/data',
      queryParamsHandling: 'preserve',
      label: mod?.name,
    };
  });

  constructor() {
    super(initialSettingsState, ['costs']);

    effect(() => {
      const modId = this.modId();
      if (modId) this.analyticsSvc.event('set_mod_id', modId);
    });

    effect(() => {
      const mod = this.mod();
      if (mod) this.analyticsSvc.event('set_game', mod.game);
    });
  }

  computeDefaults(mod: Optional<Mod>, preset: Preset): Optional<Defaults> {
    if (mod?.defaults == null) return;

    const m = mod.defaults;
    let beacons: BeaconSettings[] = [];
    let moduleRank: string[] | undefined;
    let overclock: Rational | undefined;
    switch (mod.game) {
      case Game.Factorio: {
        moduleRank = preset === Preset.Minimum ? undefined : m.moduleRank;
        if (m.beacon) {
          const beacon = mod.items.find((i) => i.id === m.beacon)?.beacon;
          if (beacon) {
            const id = m.beacon;
            const modules: ModuleSettings[] = [
              {
                count: rational(beacon.modules),
                id: coalesce(m.beaconModule, ItemId.Module),
              },
            ];

            const count =
              preset < Preset.Beacon8
                ? rational.zero
                : preset === Preset.Beacon8
                  ? rational(8n)
                  : rational(12n);
            beacons = [{ count, id, modules }];
          }
        }
        break;
      }
      case Game.DysonSphereProgram: {
        moduleRank = preset === Preset.Beacon8 ? m.moduleRank : undefined;
        break;
      }
      case Game.Satisfactory: {
        moduleRank = m.moduleRank;
        overclock = rational(100n);
        break;
      }
      case Game.FinalFactory: {
        moduleRank = m.moduleRank;
        break;
      }
    }

    const machineRankIds =
      preset === Preset.Minimum ? m.minMachineRank : m.maxMachineRank;
    return {
      beltId: preset === Preset.Minimum ? m.minBelt : m.maxBelt,
      pipeId: preset === Preset.Minimum ? m.minPipe : m.maxPipe,
      cargoWagonId: m.cargoWagon,
      fluidWagonId: m.fluidWagon,
      excludedRecipeIds: coalesce(m.excludedRecipes, []),
      machineRankIds: coalesce(machineRankIds, []),
      fuelRankIds: coalesce(m.fuelRank, []),
      moduleRankIds: coalesce(moduleRank, []),
      beacons,
      overclock,
    };
  }

  computeDataset(
    mod: Optional<Mod>,
    hash: Optional<ModHash>,
    i18n: Optional<ModI18n>,
    game: Game,
    defaults: Optional<Defaults>,
  ): Dataset {
    // Map out entities with mods
    const categoryEntities = toEntities(
      coalesce(mod?.categories, []),
      {},
      environment.debug,
    );
    const iconFile = `data/${coalesce(mod?.id, DEFAULT_MOD)}/icons.webp`;
    const iconEntities = toEntities(
      coalesce(mod?.icons, []),
      {},
      environment.debug,
    );
    const itemData = toEntities(
      coalesce(mod?.items, []),
      {},
      environment.debug,
    );
    const recipeData = toEntities(
      coalesce(mod?.recipes, []),
      {},
      environment.debug,
    );
    const limitations = reduceEntities(coalesce(mod?.limitations, {}));

    // Apply localization
    if (i18n) {
      for (const i of Object.keys(i18n.categories).filter(
        (i) => categoryEntities[i],
      )) {
        categoryEntities[i] = spread(categoryEntities[i], {
          name: i18n.categories[i],
        });
      }

      for (const i of Object.keys(i18n.items).filter((i) => itemData[i]))
        itemData[i] = spread(itemData[i], { name: i18n.items[i] });

      for (const i of Object.keys(i18n.recipes).filter((i) => recipeData[i]))
        recipeData[i] = spread(recipeData[i], { name: i18n.recipes[i] });
    }

    // Convert to id arrays
    const categoryIds = Object.keys(categoryEntities);
    const iconIds = Object.keys(iconEntities);
    const itemIds = Object.keys(itemData);
    const recipeIds = Object.keys(recipeData);

    // Generate temporary object arrays
    const items = itemIds.map((i) => parseItem(itemData[i]));
    const recipes = recipeIds.map((r) => parseRecipe(recipeData[r]));

    // Filter for item types
    const beaconIds = items
      .filter(fnPropsNotNullish('beacon'))
      .sort((a, b) => a.beacon.modules.sub(b.beacon.modules).toNumber())
      .map((i) => i.id);
    const beltIds = items
      .filter(fnPropsNotNullish('belt'))
      .sort((a, b) =>
        /** Don't sort belts in DSP, leave based on stacks */
        game === Game.DysonSphereProgram
          ? 0
          : a.belt.speed.sub(b.belt.speed).toNumber(),
      )
      .map((i) => i.id);
    const pipeIds = items
      .filter(fnPropsNotNullish('pipe'))
      .sort((a, b) => a.pipe.speed.sub(b.pipe.speed).toNumber())
      .map((i) => i.id);
    const cargoWagonIds = items
      .filter(fnPropsNotNullish('cargoWagon'))
      .sort((a, b) => a.cargoWagon.size.sub(b.cargoWagon.size).toNumber())
      .map((i) => i.id);
    const fluidWagonIds = items
      .filter(fnPropsNotNullish('fluidWagon'))
      .sort((a, b) =>
        a.fluidWagon.capacity.sub(b.fluidWagon.capacity).toNumber(),
      )
      .map((i) => i.id);
    const machineIds = items
      .filter(fnPropsNotNullish('machine'))
      .map((i) => i.id);
    const modules = items.filter(fnPropsNotNullish('module'));
    const moduleIds = modules.map((i) => i.id);
    const proliferatorModuleIds = modules
      .filter((i) => i.module.sprays != null)
      .map((i) => i.id);
    const fuels = items
      .filter(fnPropsNotNullish('fuel'))
      .sort((a, b) => a.fuel.value.sub(b.fuel.value).toNumber());
    const fuelIds = fuels.map((i) => i.id);
    const technologyIds = items
      .filter(fnPropsNotNullish('technology'))
      .map((r) => r.id);

    // Calculate missing implicit recipe icons
    // For recipes with no icon, use icon of first output item
    recipes
      .filter((r) => !iconEntities[r.id] && !r.icon)
      .forEach((r) => {
        const firstOutId = Object.keys(r.out)[0];
        const firstOutItem = itemData[firstOutId];
        r.icon = firstOutItem.icon ?? firstOutId;
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
    const beaconEntities: Entities<Beacon> = {};
    const beltEntities: Entities<Belt> = {};
    const cargoWagonEntities: Entities<CargoWagon> = {};
    const fluidWagonEntities: Entities<FluidWagon> = {};
    const machineEntities: Entities<Machine> = {};
    const moduleEntities: Entities<Module> = {};
    const fuelEntities: Entities<Fuel> = {};
    const technologyEntities: Entities<Technology> = {};
    const itemEntities = items.reduce((e: Entities<Item>, i) => {
      if (i.beacon) beaconEntities[i.id] = i.beacon;

      if (i.belt) beltEntities[i.id] = i.belt;
      else if (i.pipe) beltEntities[i.id] = i.pipe;

      if (i.cargoWagon) cargoWagonEntities[i.id] = i.cargoWagon;
      if (i.fluidWagon) fluidWagonEntities[i.id] = i.fluidWagon;
      if (i.machine) machineEntities[i.id] = i.machine;
      if (i.module) moduleEntities[i.id] = i.module;
      if (i.fuel) fuelEntities[i.id] = i.fuel;
      if (i.technology) technologyEntities[i.id] = i.technology;

      e[i.id] = i;
      return e;
    }, {});
    const recipeEntities = recipes.reduce((e: Entities<Recipe>, r) => {
      e[r.id] = r;
      return e;
    }, {});

    return {
      game,
      version: coalesce(mod?.version, {}),
      categoryIds,
      categoryEntities,
      categoryItemRows,
      categoryRecipeRows,
      iconFile,
      iconIds,
      iconEntities,
      itemIds,
      itemEntities,
      beaconIds,
      beaconEntities,
      beltIds,
      pipeIds,
      beltEntities,
      cargoWagonIds,
      cargoWagonEntities,
      fluidWagonIds,
      fluidWagonEntities,
      machineIds,
      machineEntities,
      moduleIds,
      proliferatorModuleIds,
      moduleEntities,
      fuelIds,
      fuelEntities,
      recipeIds,
      recipeEntities,
      technologyIds,
      technologyEntities,
      limitations,
      hash,
      defaults,
    };
  }

  computeSettings(
    state: SettingsState,
    defaults: Optional<Defaults>,
    researchedTechnologyIds: Set<string>,
  ): Settings {
    const defaultBeltId = defaults?.beltId;
    const beltId = coalesce(state.beltId, defaultBeltId);
    const defaultPipeId = defaults?.pipeId;
    const pipeId = coalesce(state.pipeId, defaultPipeId);
    const defaultCargoWagonId = defaults?.cargoWagonId;
    const cargoWagonId = coalesce(state.cargoWagonId, defaultCargoWagonId);
    const defaultFluidWagonId = defaults?.fluidWagonId;
    const fluidWagonId = coalesce(state.fluidWagonId, defaultFluidWagonId);
    const defaultExcludedRecipeIds = new Set(defaults?.excludedRecipeIds);
    const excludedRecipeIds = coalesce(
      state.excludedRecipeIds,
      defaultExcludedRecipeIds,
    );
    const defaultMachineRankIds = coalesce(defaults?.machineRankIds, []);
    const machineRankIds = coalesce(
      state.machineRankIds,
      defaultMachineRankIds,
    );
    const defaultFuelRankIds = coalesce(defaults?.fuelRankIds, []);
    const fuelRankIds = coalesce(state.fuelRankIds, defaultFuelRankIds);
    const defaultModuleRankIds = coalesce(defaults?.moduleRankIds, []);
    const moduleRankIds = coalesce(state.moduleRankIds, defaultModuleRankIds);

    return spread(state as Settings, {
      beltId,
      defaultBeltId,
      pipeId,
      defaultPipeId,
      cargoWagonId,
      defaultCargoWagonId,
      fluidWagonId,
      defaultFluidWagonId,
      excludedRecipeIds,
      defaultExcludedRecipeIds,
      machineRankIds,
      defaultMachineRankIds,
      fuelRankIds,
      defaultFuelRankIds,
      moduleRankIds,
      defaultModuleRankIds,
      beacons: this.recipeSvc.hydrateBeacons(state.beacons, defaults?.beacons),
      overclock: state.overclock ?? defaults?.overclock,
      researchedTechnologyIds,
    });
  }
}

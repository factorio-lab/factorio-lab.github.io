import { Injectable } from '@angular/core';

import {
  areArraysEqual,
  coalesce,
  fnPropsNotNullish,
  notNullish,
  spread,
} from '~/helpers';
import { Beacon } from '~/models/data/beacon';
import { Machine, MachineJson } from '~/models/data/machine';
import {
  AdjustedRecipe,
  cloneRecipe,
  finalizeRecipe,
  Recipe,
  RecipeJson,
} from '~/models/data/recipe';
import { AdjustedDataset, Dataset } from '~/models/dataset';
import { EnergyType } from '~/models/enum/energy-type';
import { Game } from '~/models/enum/game';
import { ItemId } from '~/models/enum/item-id';
import {
  isRecipeObjective,
  ObjectiveSettings,
  ObjectiveState,
} from '~/models/objective';
import { Option } from '~/models/option';
import { Rational, rational } from '~/models/rational';
import {
  areBeaconSettingsEqual,
  BeaconSettings,
} from '~/models/settings/beacon-settings';
import { CostSettings } from '~/models/settings/cost-settings';
import { ItemState } from '~/models/settings/item-settings';
import {
  areModuleSettingsEqual,
  ModuleSettings,
} from '~/models/settings/module-settings';
import { RecipeSettings, RecipeState } from '~/models/settings/recipe-settings';
import { Settings } from '~/models/settings/settings';
import { Entities } from '~/models/utils';
import { ItemsSettings } from '~/store/items.service';
import { MachinesSettings } from '~/store/machines.service';
import { RecipesSettings } from '~/store/recipes.service';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  minFactor = rational(1n, 5n);
  pollutionFactor = rational(60n);
  minFactorioRecipeTime = rational(1n, 60n);

  /** Determines what option to use based on preferred rank */
  bestMatch(options: string[], rank: string[]): string {
    if (options.length > 1) {
      for (const r of rank) {
        // Return first matching option in rank list
        if (options.includes(r)) return r;
      }
    }
    return options[0];
  }

  fuelOptions(entity: MachineJson | Machine, data: Dataset): Option[] {
    if (entity.fuel) {
      const fuel = data.itemEntities[entity.fuel];
      return [{ value: fuel.id, label: fuel.name }];
    }

    if (entity.fuelCategories == null) return [];

    const fuelCategories = entity.fuelCategories;
    const allowed = data.fuelIds
      .map((f) => data.itemEntities[f])
      .filter(fnPropsNotNullish('fuel'))
      .filter((f) => fuelCategories.includes(f.fuel.category));
    return allowed.map((f): Option => ({ value: f.id, label: f.name }));
  }

  moduleOptions(
    entity: Machine | Beacon,
    data: Dataset,
    recipeId?: string,
  ): Option[] {
    // Get all modules
    let allowed = data.moduleIds
      .map((i) => data.itemEntities[i])
      .filter(fnPropsNotNullish('module'));

    let recipe: Recipe | undefined;
    if (recipeId != null) {
      recipe = data.recipeEntities[recipeId];
      if (
        data.game === Game.Satisfactory ||
        (!recipe.isMining && !recipe.isTechnology)
      ) {
        // Filter for modules allowed on this recipe
        allowed = allowed.filter(
          (m) =>
            !m.module.limitation ||
            data.limitations[m.module.limitation][recipeId],
        );
      }
    }

    // Filter for modules allowed on this entity
    if (entity.disallowedEffects) {
      for (const disallowedEffect of entity.disallowedEffects) {
        allowed = allowed.filter((m) => m.module[disallowedEffect] == null);
      }
    }

    const options = allowed.map(
      (m): Option => ({ value: m.id, label: m.name }),
    );
    if (
      (data.game !== Game.Satisfactory || !recipe?.isMining) &&
      data.game !== Game.FinalFactory
    ) {
      options.unshift({ label: 'None', value: ItemId.Module });
    }
    return options;
  }

  /** Determines default modules for a recipe/machine */
  defaultModules(
    options: Option[],
    moduleRankIds: string[],
    count: Rational | true | undefined,
    machineValue?: ModuleSettings[],
  ): ModuleSettings[] | undefined {
    if (count == null) return undefined;

    if (machineValue) {
      const set = new Set(options.map((o) => o.value));
      if (machineValue.every((m) => m.id && set.has(m.id))) return machineValue;
    }

    const id = this.bestMatch(
      options.map((o) => o.value),
      moduleRankIds,
    );
    count = count === true ? rational.zero : count;
    return [{ id, count }];
  }

  adjustRecipe(
    recipeId: string,
    recipeSettings: RecipeState,
    itemsState: Entities<ItemState>,
    settings: Settings,
    data: Dataset,
  ): AdjustedRecipe {
    const recipe = spread(
      cloneRecipe(data.recipeEntities[recipeId]) as AdjustedRecipe,
      { productivity: rational.one, produces: new Set(), output: {} },
    );

    const {
      proliferatorSprayId,
      miningBonus,
      researchBonus,
      netProductionOnly,
    } = settings;

    const miningFactor = miningBonus.div(rational(100n));
    const researchFactor = researchBonus
      .add(rational(100n))
      .div(rational(100n));

    if (recipeSettings.machineId != null) {
      const machine = data.machineEntities[recipeSettings.machineId];

      if (machine.speed != null) {
        // Adjust for machine speed
        recipe.time = recipe.time.div(machine.speed);
      } else {
        // Calculate based on belt speed
        // Use minimum speed of all inputs/outputs in recipe
        const ids = [
          ...Object.keys(recipe.in).filter((i) => recipe.in[i].nonzero()),
          ...Object.keys(recipe.out).filter((i) => recipe.out[i].nonzero()),
        ];
        const belts = ids
          .map((i) => itemsState[i].beltId)
          .filter(notNullish)
          .map((beltId) => data.beltEntities[beltId]);
        let minSpeed = rational.zero;
        for (const b of belts.filter(notNullish)) {
          if (minSpeed.lt(b.speed)) minSpeed = b.speed;
        }
        recipe.time = recipe.time.div(minSpeed);
      }

      if (recipe.isTechnology && data.game === Game.Factorio) {
        // Adjust for research factor
        recipe.time = recipe.time.div(researchFactor);
      }

      // Calculate factors
      let speed = rational.one;
      let prod = rational.one;
      let consumption = rational.one;
      let pollution = rational.one;

      if (recipe.isMining) {
        // Adjust for mining bonus
        prod = prod.add(miningFactor);
      }

      const proliferatorSprays: Entities<Rational> = {};

      // Modules
      if (recipeSettings.modules) {
        for (const { id, count } of recipeSettings.modules) {
          if (id == null || count == null) continue;
          const module = data.moduleEntities[id];
          if (module == null) continue;

          // Scale Satisfactory Somersloop bonus based on number of slots
          let scale: Rational | undefined;
          if (
            data.game === Game.Satisfactory &&
            id === ItemId.Somersloop &&
            machine.modules instanceof Rational
          )
            scale = machine.modules;

          if (module.speed) {
            speed = speed.add(module.speed.mul(count));
          }

          if (module.productivity) {
            let effect = module.productivity.mul(count);

            if (scale) effect = effect.div(scale);

            prod = prod.add(effect);
          }

          if (module.consumption) {
            let effect = module.consumption.mul(count);

            if (scale) {
              // Overall effect = (1 + filled slots / total slots) ^ 2
              effect = effect.div(scale).add(rational.one);
              effect = effect.mul(effect).sub(rational.one);
            }

            consumption = consumption.add(effect);
          }

          if (module.pollution) {
            pollution = pollution.add(module.pollution.mul(count));
          }

          // Note: Count is ignored for proliferator / sprays (assumed to be 1)
          if (module.sprays) {
            let sprays = module.sprays;
            // If proliferator is applied to proliferator, apply productivity bonus to sprays
            const pModule = data.moduleEntities[proliferatorSprayId];
            if (pModule) {
              sprays = sprays
                .mul(
                  rational.one.add(
                    coalesce(pModule.productivity, rational.zero),
                  ),
                )
                .floor(); // DSP rounds down # of sprays
            }
            // Calculate amount of proliferator required for this recipe
            const pId = module.proliferator;
            if (pId) {
              if (!proliferatorSprays[pId]) {
                proliferatorSprays[pId] = rational.zero;
              }
              proliferatorSprays[pId] = proliferatorSprays[pId].add(sprays);
            }
          }
        }
      }

      // Beacons
      if (recipeSettings.beacons != null) {
        for (const beaconSettings of recipeSettings.beacons) {
          if (
            !beaconSettings.count?.nonzero() ||
            beaconSettings.id == null ||
            beaconSettings.modules == null
          ) {
            continue;
          }

          for (const { id, count } of beaconSettings.modules) {
            if (id == null || id === ItemId.Module || count == null) continue;
            const module = data.moduleEntities[id];
            const beacon = data.beaconEntities[beaconSettings.id];
            const factor = beaconSettings.count // Num of beacons
              .mul(beacon.effectivity) // Effectivity of beacons
              .mul(count); // Num of modules/beacon

            if (module.speed) {
              speed = speed.add(module.speed.mul(factor));
            }

            if (module.productivity) {
              prod = prod.add(module.productivity.mul(factor));
            }

            if (module.consumption) {
              consumption = consumption.add(module.consumption.mul(factor));
            }

            if (module.pollution) {
              pollution = pollution.add(module.pollution.mul(factor));
            }
          }
        }
      }

      // Check for speed, consumption, or pollution below minimum value (20%)
      if (speed.lt(this.minFactor)) {
        speed = this.minFactor;
      }

      if (consumption.lt(this.minFactor)) {
        consumption = this.minFactor;
      }

      if (pollution.lt(this.minFactor)) {
        pollution = this.minFactor;
      }

      // Overclock effects
      let oc: Rational | undefined;
      if (
        recipeSettings.overclock &&
        !recipeSettings.overclock.eq(rational(100n))
      ) {
        oc = recipeSettings.overclock.div(rational(100n));
        speed = speed.mul(oc);
      }

      // Calculate module/beacon effects
      // Speed
      recipe.time = recipe.time.div(speed);

      // In Factorio, minimum recipe time is 1/60s (1 tick)
      if (
        recipe.time.lt(this.minFactorioRecipeTime) &&
        data.game === Game.Factorio
      ) {
        recipe.time = this.minFactorioRecipeTime;
      }

      // Productivity
      for (const outId of Object.keys(recipe.out)) {
        if (recipe.catalyst?.[outId]) {
          // Catalyst - only multiply prod by extra produced
          const catalyst = recipe.catalyst[outId];
          const affected = recipe.out[outId].sub(catalyst);
          // Only change output if affected amount > 0
          if (affected.gt(rational.zero)) {
            recipe.out[outId] = catalyst.add(affected.mul(prod));
          }
        } else {
          recipe.out[outId] = recipe.out[outId].mul(prod);
        }
      }

      recipe.productivity = prod;

      // Power
      recipe.drain = machine.drain;
      let usage =
        (recipe.usage ? recipe.usage : machine.usage) ?? rational.zero;
      if (oc) {
        if (machine.usage?.gt(rational.zero)) {
          // Polynomial effect only on production buildings, not power generation
          const factor = Math.pow(oc.toNumber(), 1.321928);
          usage = usage.mul(rational(factor));
        } else {
          usage = usage.mul(oc);
        }
      }

      recipe.consumption =
        machine.type === EnergyType.Electric
          ? usage.mul(consumption)
          : rational.zero;

      // Pollution
      recipe.pollution =
        machine.pollution && recipeSettings.machineId !== ItemId.Pumpjack
          ? machine.pollution
              .div(this.pollutionFactor)
              .mul(pollution)
              .mul(consumption)
          : rational.zero;

      // Add machine consumption
      if (machine.consumption) {
        const consumption = machine.consumption;
        for (const id of Object.keys(consumption)) {
          const amount = recipe.time.div(rational(60n)).mul(consumption[id]);
          recipe.in[id] = (recipe.in[id] || rational.zero).add(amount);
        }
      }

      // Calculate burner fuel inputs
      if (recipeSettings.fuelId) {
        const fuel = data.fuelEntities[recipeSettings.fuelId];

        if (fuel) {
          const fuelIn = recipe.time
            .mul(usage)
            .div(fuel.value)
            .div(rational(1000n));

          recipe.in[recipeSettings.fuelId] = (
            recipe.in[recipeSettings.fuelId] || rational.zero
          ).add(fuelIn);

          if (fuel.result) {
            recipe.out[fuel.result] = (
              recipe.out[fuel.result] || rational.zero
            ).add(fuelIn);
          }
        }
      }

      // Calculate proliferator usage
      if (Object.keys(proliferatorSprays).length > 0) {
        const proliferatorUses: Entities<Rational> = {};

        for (const pId of Object.keys(proliferatorSprays)) {
          proliferatorUses[pId] = rational.zero;

          for (const id of Object.keys(recipe.in)) {
            const sprays = proliferatorSprays[pId];
            const amount = recipe.in[id].div(sprays);
            proliferatorUses[pId] = proliferatorUses[pId].add(amount);
          }
        }

        // If proliferator spray is applied to proliferator, add its usage to inputs
        const pModule = data.moduleEntities[proliferatorSprayId];
        if (pModule?.sprays) {
          const sprays = pModule.sprays
            .mul(
              rational.one.add(coalesce(pModule.productivity, rational.zero)),
            )
            .floor() // DSP rounds down # of sprays
            .sub(rational.one); // Subtract one spray of self
          let usage = rational.zero;
          for (const id of Object.keys(proliferatorUses)) {
            const amount = proliferatorUses[id].div(sprays);
            usage = usage.add(amount);
          }
          const pId = pModule.proliferator;
          if (pId) {
            if (!proliferatorUses[pId]) proliferatorUses[pId] = rational.zero;
            proliferatorUses[pId] = proliferatorUses[pId].add(usage);
          }
        }

        // Add proliferator consumption to recipe inputs
        // Assume recipe already has listed inputs, otherwise it could not be proliferated
        for (const pId of Object.keys(proliferatorUses)) {
          if (!recipe.in[pId]) recipe.in[pId] = proliferatorUses[pId];
          else recipe.in[pId] = recipe.in[pId].add(proliferatorUses[pId]);
        }
      }
    }

    if (netProductionOnly) {
      for (const outId of Object.keys(recipe.out)) {
        const output = recipe.out[outId];
        if (recipe.in[outId] != null) {
          // Recipe contains loop; reduce to net production
          const input = recipe.in[outId];

          if (input.gt(output)) {
            // More input, delete the output
            recipe.in[outId] = input.sub(output);
            delete recipe.out[outId];
          } else if (input.lt(output)) {
            // More output, delete the input
            recipe.out[outId] = output.sub(input);
            delete recipe.in[outId];
          } else {
            // Equal amounts, remove both
            delete recipe.in[outId];
            delete recipe.out[outId];
          }
        }
      }
    }

    return recipe;
  }

  /** Adjust rocket launch objective recipes */
  adjustLaunchRecipeObjective(
    recipe: Recipe,
    settings: Entities<RecipeState>,
    data: AdjustedDataset,
  ): void {
    if (!recipe.part) return;
    const partMachineId = settings[recipe.part].machineId;
    if (!partMachineId) return;
    const rocketMachine = data.machineEntities[partMachineId];
    if (!rocketMachine?.silo) return;

    const rocketRecipe = data.adjustedRecipe[recipe.part];
    const itemId = Object.keys(rocketRecipe.out)[0];
    const factor = rocketMachine.silo.parts.div(rocketRecipe.out[itemId]);
    recipe.time = rocketRecipe.time.mul(factor);
  }

  /** Adjust rocket launch and rocket part recipes */
  adjustSiloRecipes(
    adjustedRecipe: Entities<AdjustedRecipe>,
    settings: Entities<RecipeState>,
    data: Dataset,
  ): Entities<AdjustedRecipe> {
    for (const partId of Object.keys(adjustedRecipe)) {
      const partMachineId = settings[partId].machineId;
      if (!partMachineId) continue;

      const rocketMachine = data.machineEntities[partMachineId];
      const rocketRecipe = adjustedRecipe[partId];
      if (!rocketMachine?.silo || rocketRecipe.part) continue;

      const itemId = Object.keys(rocketRecipe.out)[0];
      const factor = rocketMachine.silo.parts.div(rocketRecipe.out[itemId]);
      for (const launchId of Object.keys(adjustedRecipe).filter(
        (i) =>
          adjustedRecipe[i].part === partId &&
          settings[i].machineId === partMachineId,
      )) {
        adjustedRecipe[launchId].time = rocketRecipe.time
          .mul(factor)
          .add(rocketMachine.silo.launch);
      }

      rocketRecipe.time = rocketRecipe.time
        .mul(factor)
        .add(rocketMachine.silo.launch)
        .div(factor);
    }

    return adjustedRecipe;
  }

  allowsModules(recipe: RecipeJson | Recipe, machine: Machine): boolean {
    return (!machine.silo || !recipe.part) && !!machine.modules;
  }

  adjustDataset(
    recipeIds: string[],
    recipes: RecipesSettings,
    items: ItemsSettings,
    settings: Settings,
    data: Dataset,
  ): AdjustedDataset {
    const adjustedRecipe = this.adjustRecipes(
      recipeIds,
      recipes,
      items,
      settings,
      data,
    );
    this.adjustCosts(recipeIds, adjustedRecipe, recipes, settings.costs, data);
    return this.finalizeData(
      recipeIds,
      settings.excludedRecipeIds,
      adjustedRecipe,
      data,
    );
  }

  adjustRecipes(
    recipeIds: string[],
    recipes: RecipesSettings,
    items: ItemsSettings,
    settings: Settings,
    data: Dataset,
  ): Entities<AdjustedRecipe> {
    return this.adjustSiloRecipes(
      recipeIds.reduce((e: Entities<AdjustedRecipe>, i) => {
        e[i] = this.adjustRecipe(i, recipes[i], items, settings, data);
        return e;
      }, {}),
      recipes,
      data,
    );
  }

  adjustCosts(
    recipeIds: string[],
    adjustedRecipe: Entities<Recipe>,
    recipes: RecipesSettings,
    costs: CostSettings,
    data: Dataset,
  ): void {
    recipeIds
      .map((i) => adjustedRecipe[i])
      .forEach((recipe) => {
        const settings = recipes[recipe.id];
        if (settings.cost) {
          recipe.cost = settings.cost;
        } else if (recipe.cost) {
          // Recipe has a declared cost, base this on output items not machines
          // Calculate total output, sum, and multiply cost by output
          const output = Object.keys(recipe.out)
            .reduce((v, o) => v.add(recipe.out[o]), rational.zero)
            .div(recipe.time);
          recipe.cost = output.mul(recipe.cost).mul(costs.factor);
        } else {
          recipe.cost = costs.machine;
          if (settings.machineId != null && costs.footprint.nonzero()) {
            // Adjust based on machine size
            const machine = data.machineEntities[settings.machineId];
            if (machine.size != null) {
              recipe.cost = recipe.cost.mul(
                rational(machine.size[0] * machine.size[1]),
              );
            }
          }
        }
      });
  }

  finalizeData(
    recipeIds: string[],
    excludedRecipeIds: Set<string>,
    adjustedRecipe: Entities<AdjustedRecipe>,
    data: Dataset,
  ): AdjustedDataset {
    const itemRecipeIds: Entities<string[]> = {};
    const itemIncludedRecipeIds: Entities<string[]> = {};
    const itemIncludedIoRecipeIds: Entities<string[]> = {};
    data.itemIds.forEach((i) => {
      itemRecipeIds[i] = [];
      itemIncludedRecipeIds[i] = [];
      itemIncludedIoRecipeIds[i] = [];
    });

    recipeIds
      .map((i) => adjustedRecipe[i])
      .forEach((recipe) => {
        finalizeRecipe(recipe);
        recipe.produces.forEach((productId) =>
          itemRecipeIds[productId].push(recipe.id),
        );

        if (!excludedRecipeIds.has(recipe.id)) {
          recipe.produces.forEach((productId) =>
            itemIncludedRecipeIds[productId].push(recipe.id),
          );

          Object.keys(recipe.output).forEach((ioId) =>
            itemIncludedIoRecipeIds[ioId].push(recipe.id),
          );
        }
      });

    return spread(data as AdjustedDataset, {
      adjustedRecipe,
      itemRecipeIds,
      itemIncludedRecipeIds,
      itemIncludedIoRecipeIds,
    });
  }

  computeRecipeSettings(
    s: RecipeSettings,
    recipe: Recipe,
    machines: MachinesSettings,
    settings: Settings,
    data: Dataset,
  ): void {
    s.defaultMachineId = this.bestMatch(
      recipe.producers,
      settings.machineRankIds,
    );
    s.machineId = coalesce(s.machineId, s.defaultMachineId);

    const machine = data.machineEntities[s.machineId];
    const def = machines[s.machineId];

    if (recipe.isBurn) {
      s.defaultFuelId = Object.keys(recipe.in)[0];
      s.fuelId = s.defaultFuelId;
    } else if (machine.type === EnergyType.Burner) {
      s.defaultFuelId = def?.fuelId;
      s.fuelId = coalesce(s.fuelId, s.defaultFuelId);
      s.fuelOptions = def?.fuelOptions;
    } else {
      // Machine doesn't support fuel, remove any
      delete s.fuelId;
    }

    if (machine != null && this.allowsModules(recipe, machine)) {
      s.moduleOptions = this.moduleOptions(machine, data, recipe.id);
      s.modules = this.hydrateModules(
        s.modules,
        s.moduleOptions,
        settings.moduleRankIds,
        machine.modules,
        def.modules,
      );
      s.beacons = this.hydrateBeacons(s.beacons, def.beacons);
    } else {
      // Machine doesn't support modules, remove any
      delete s.modules;
      delete s.beacons;
    }

    if (s.beacons) {
      for (const beaconSettings of s.beacons) {
        if (
          beaconSettings.total != null &&
          (beaconSettings.count == null || beaconSettings.count.isZero())
        )
          // No actual beacons, ignore the total beacons
          delete beaconSettings.total;
      }
    }

    s.defaultOverclock = def?.overclock;
    s.overclock = coalesce(s.overclock, s.defaultOverclock);
  }

  adjustObjective(
    objective: ObjectiveState,
    items: ItemsSettings,
    recipes: RecipesSettings,
    machines: MachinesSettings,
    settings: Settings,
    data: AdjustedDataset,
  ): ObjectiveSettings {
    if (!isRecipeObjective(objective)) return objective;

    const result: ObjectiveSettings = spread(objective);
    const recipe = data.recipeEntities[result.targetId];
    this.computeRecipeSettings(result, recipe, machines, settings, data);

    result.recipe = this.adjustRecipe(
      result.targetId,
      result,
      items,
      settings,
      data,
    );
    this.adjustLaunchRecipeObjective(result.recipe, recipes, data);
    finalizeRecipe(result.recipe);

    return result;
  }

  dehydrateModules(
    value: ModuleSettings[],
    options: Option[],
    moduleRankIds: string[],
    count: Rational | true | undefined,
    machineValue?: ModuleSettings[] | undefined,
  ): ModuleSettings[] | undefined {
    const def = this.defaultModules(
      options,
      moduleRankIds,
      count,
      machineValue,
    );
    if (areArraysEqual(value, def, areModuleSettingsEqual)) return undefined;

    const moduleId = this.bestMatch(
      options.map((o) => o.value),
      moduleRankIds,
    );
    const moduleCount = count === true || count == null ? rational.zero : count;
    const result = value
      // Exclude empty module entry
      .filter((m) => m.id !== ItemId.Module)
      .map((m) => {
        const r = {} as ModuleSettings;
        if (m.id !== moduleId) r.id = m.id;
        if (m.id == null || !m.count?.eq(moduleCount)) r.count = m.count;
        return r;
      });

    return result;
  }

  hydrateModules(
    value: ModuleSettings[] | undefined,
    options: Option[],
    moduleRankIds: string[],
    count: Rational | true | undefined,
    machineValue?: ModuleSettings[] | undefined,
  ): ModuleSettings[] | undefined {
    if (value == null)
      return this.defaultModules(options, moduleRankIds, count, machineValue);

    const moduleCount = count === true || count == null ? rational.zero : count;
    const moduleId = this.bestMatch(
      options.map((o) => o.value),
      moduleRankIds,
    );
    const result = value.map((m) => ({
      count: coalesce(m.count, moduleCount),
      id: coalesce(m.id, moduleId),
    }));

    if (moduleCount.nonzero()) {
      // Restore empty module entry
      const total = result.reduce((a, b) => a.add(b.count), rational.zero);
      const empty = moduleCount.sub(total);
      if (empty.gt(rational.zero))
        result.push({ count: empty, id: ItemId.Module });
    }

    return result;
  }

  dehydrateBeacons(
    value: BeaconSettings[],
    def: BeaconSettings[] | undefined,
  ): BeaconSettings[] | undefined {
    if (areArraysEqual(value, def, areBeaconSettingsEqual)) return undefined;

    if (def == null || def.length === 0) return value;

    const beaconSettings = def[0];
    const moduleId = beaconSettings?.modules?.[0].id;
    const moduleCount = coalesce(
      beaconSettings?.modules?.[0].count,
      rational.zero,
    );
    const result = value.map((b) => {
      const r = {} as BeaconSettings;
      if (b.id && b.id !== beaconSettings.id) r.id = b.id;
      if (!b.count?.eq(coalesce(beaconSettings.count, rational.zero)))
        r.count = b.count;
      if (
        !areArraysEqual(
          b.modules,
          beaconSettings.modules,
          areModuleSettingsEqual,
        )
      )
        r.modules = b.modules
          ?.filter((m) => m.id !== ItemId.Module)
          .map((m) => {
            const r = {} as ModuleSettings;
            if (m.id !== moduleId) r.id = m.id;
            if (!m.count?.eq(moduleCount)) r.count = m.count;
            return r;
          });
      if (b.total) r.total = b.total;
      return r;
    });

    if (result.every((r) => Object.keys(r).length === 0)) return [];

    return result;
  }

  hydrateBeacons(
    value: BeaconSettings[] | undefined,
    def: BeaconSettings[] | undefined,
  ): BeaconSettings[] | undefined {
    if (value == null || def == null || def.length === 0) return def;

    const beaconSettings = def[0];
    const moduleSettings = beaconSettings.modules?.[0];
    const result = value.map((b) => ({
      id: coalesce(b.id, beaconSettings.id),
      count: b.count ?? beaconSettings.count,
      modules: coalesce(
        b.modules?.map((m) => ({
          id: coalesce(m.id, moduleSettings?.id),
          count: coalesce(m.count, moduleSettings?.count),
        })),
        beaconSettings.modules,
      ),
      total: coalesce(b.total, beaconSettings.total),
    }));

    if (moduleSettings?.count == null) return result;

    return result.filter(fnPropsNotNullish('modules')).map((b) => {
      // Restore empty module entry
      const total = b.modules.reduce(
        (a, b) => a.add(coalesce(b.count, rational.zero)),
        rational.zero,
      );
      const empty = moduleSettings?.count?.sub(total);
      if (empty?.gt(rational.zero))
        b.modules.push({ count: empty, id: ItemId.Module });

      return b;
    });
  }
}

import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { saveAs } from 'file-saver';

import { fnPropsNotNullish, notNullish } from '~/helpers';
import { FlowData, rational, Step } from '~/models';
import { Items, LabState, Recipes, Settings } from '~/store';
import { BrowserUtility, RecipeUtility } from '~/utilities';

const CSV_TYPE = 'text/csv;charset=UTF-8';
const CSV_EXTENSION = '.csv';
const JSON_TYPE = 'text/json;charset=UTF-8';
const JSON_EXTENSION = '.json';

export interface StepExport {
  Item?: string;
  Items?: string;
  Surplus?: string;
  Inputs?: string;
  Outputs?: string;
  Targets?: string;
  Belts?: string;
  Belt?: string;
  Wagons?: string;
  Wagon?: string;
  Recipe?: string;
  Machines?: string;
  Machine?: string;
  Modules?: string;
  Beacons?: string;
  Power?: string;
  Pollution?: string;
}

export const StepKeys = [
  'Item',
  'Items',
  'Surplus',
  'Inputs',
  'Outputs',
  'Targets',
  'Belts',
  'Belt',
  'Wagons',
  'Wagon',
  'Recipes',
  'Machines',
  'Machine',
  'Modules',
  'Beacons',
  'Beacon',
  'BeaconModules',
  'Power',
  'Pollution',
] as (keyof StepExport)[];

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  store = inject(Store<LabState>);
  itemsState = this.store.selectSignal(Items.getItemsState);
  recipesState = this.store.selectSignal(Recipes.getRecipesState);
  columnsState = this.store.selectSignal(Settings.getColumnsState);
  data = this.store.selectSignal(Recipes.getAdjustedDataset);

  stepsToCsv(steps: Step[]): void {
    const json = steps.map((s) => this.stepToJson(s, steps));
    const fields = StepKeys.filter((k) => json.some((s) => s[k] != null));
    const csv = json.map((row) => fields.map((f) => row[f]).join(','));
    csv.unshift(fields.join(','));
    csv.unshift(`"${BrowserUtility.href}"`);
    this.saveAsCsv(csv.join('\r\n'), 'factoriolab_list');
  }

  flowToJson(flowData: FlowData): void {
    this.saveAsJson(JSON.stringify(flowData), 'factoriolab_flow');
  }

  /* Don't test dependencies (file-saver) */
  /* istanbul ignore next */
  saveAsCsv(data: string, name: string): void {
    saveAs(new Blob([data], { type: CSV_TYPE }), name + CSV_EXTENSION);
  }

  /* Don't test dependencies (file-saver) */
  /* istanbul ignore next */
  saveAsJson(data: string, name: string): void {
    saveAs(new Blob([data], { type: JSON_TYPE }), name + JSON_EXTENSION);
  }

  stepToJson(step: Step, steps: Step[]): StepExport {
    const columns = this.columnsState();
    const itemsState = this.itemsState();
    const recipesState = this.recipesState();
    const data = this.data();
    const exp: StepExport = {};
    if (step.itemId != null) {
      exp.Item = step.itemId;
      const itemSettings = itemsState[step.itemId];
      if (step.items != null) {
        exp.Items =
          '=' + step.items.sub(step.surplus ?? rational(0n)).toString();
      }

      if (step.surplus != null) exp.Surplus = '=' + step.surplus.toString();

      if (columns.belts.show) {
        if (step.belts != null) exp.Belts = '=' + step.belts.toString();
        exp.Belt = itemSettings.beltId;
      }

      if (columns.wagons.show) {
        if (step.wagons != null) exp.Wagons = '=' + step.wagons.toString();
        exp.Wagon = itemSettings.wagonId;
      }
    }
    if (step.recipeId != null) {
      exp.Recipe = step.recipeId;

      const recipe = data.adjustedRecipe[step.recipeId];
      const recipeSettings = recipesState[step.recipeId];
      const inputs = Object.keys(recipe.in)
        .map((i) => {
          const inStep = steps.find((s) => s.itemId === i);
          return [i, inStep?.parents?.[step.id]?.toString()];
        })
        .filter((v) => v[1])
        .map((v) => `${v[0]}:${v[1]}`)
        .join(',');

      if (inputs) exp.Inputs = `"${inputs}"`;

      if (recipeSettings.machineId != null) {
        const machine = data.machineEntities[recipeSettings.machineId];
        const allowsModules = RecipeUtility.allowsModules(recipe, machine);
        if (columns.machines.show) {
          if (step.machines != null)
            exp.Machines = '=' + step.machines.toString();
          exp.Machine = recipeSettings.machineId;
          if (allowsModules && recipeSettings.modules != null) {
            exp.Modules = `"${recipeSettings.modules
              .filter(fnPropsNotNullish('count', 'id'))
              .map((m) => `${m.count.toString()} ${m.id}`)
              .join(',')}"`;
          }
        }

        if (columns.beacons.show && allowsModules) {
          exp.Beacons = `"${recipeSettings.beacons
            ?.map(
              (b) =>
                `${b.count?.toString()} ${b.id} (${b.modules
                  ?.filter(fnPropsNotNullish('count', 'id'))
                  .map((m) => `${m.count.toString()} ${m.id}`)
                  .join(',')})`,
            )
            .join(',')}"`;
        }

        if (columns.power.show && step.power != null)
          exp.Power = '=' + step.power.toString();

        if (columns.pollution.show && step.pollution != null) {
          exp.Pollution = '=' + step.pollution.toString();
        }
      }
    }

    if (step.outputs != null) {
      const outputs = step.outputs; // Store as non-null
      const outputsStr = Object.keys(outputs)
        .map((o) => `${o}:${outputs[o].toString()}`)
        .join(',');
      exp.Outputs = `"${outputsStr}"`;
    }

    if (step.parents != null) {
      const parents = step.parents; // Store as non-null
      const parentsStr = Object.keys(parents)
        .map((p) => steps.find((s) => s.id === p))
        .filter(notNullish)
        .map((s) => `${s.recipeId}:${parents[s.id].toString()}`)
        .join(',');
      exp.Targets = `"${parentsStr}"`;
    }

    return exp;
  }
}

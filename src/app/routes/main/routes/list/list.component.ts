import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MenuItem } from 'primeng/api';
import { Table } from 'primeng/table';
import { combineLatest, filter, first, map, tap } from 'rxjs';

import { AppSharedModule } from '~/app-shared.module';
import {
  ColumnsState,
  Dataset,
  Entities,
  Game,
  ItemId,
  Rational,
  RecipeField,
  Step,
  StepDetail,
  StepDetailTab,
} from '~/models';
import { StepIdPipe } from '~/pipes/step-id.pipe';
import {
  ContentService,
  ExportService,
  RouterService,
  TrackService,
} from '~/services';
import {
  Items,
  LabState,
  Machines,
  Objectives,
  Recipes,
  Settings,
} from '~/store';
import { RecipeUtility } from '~/utilities';

@Component({
  standalone: true,
  imports: [CommonModule, AppSharedModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListComponent implements OnInit, AfterViewInit {
  vm$ = combineLatest([
    this.store.select(Machines.getMachinesState),
    this.store.select(Items.getItemsState),
    this.store.select(Items.getItemsModified),
    this.store.select(Objectives.getStepsModified),
    this.store.select(Objectives.getTotals),
    this.store.select(Objectives.getSteps),
    this.store.select(Objectives.getStepDetails),
    this.store.select(Objectives.getStepById),
    this.store.select(Objectives.getStepByItemEntities),
    this.store.select(Objectives.getStepTree),
    this.store.select(Objectives.getEffectivePowerUnit),
    this.store.select(Recipes.getRecipesState),
    this.store.select(Objectives.getRecipesModified),
    this.store.select(Recipes.getAdjustedDataset),
    this.store.select(Settings.getColumnsState),
    this.store.select(Settings.getSettings),
    this.store.select(Settings.getDisplayRateInfo),
    this.store.select(Settings.getOptions),
    this.store.select(Settings.getBeltSpeed),
    this.store.select(Settings.getBeltSpeedTxt),
    this.routerSvc.zipConfig$,
  ]).pipe(
    map(
      ([
        machinesState,
        itemsState,
        itemsModified,
        stepsModified,
        totals,
        steps,
        stepDetails,
        stepById,
        stepByItemEntities,
        stepTree,
        effectivePowerUnit,
        recipesState,
        recipesModified,
        data,
        columnsState,
        settings,
        dispRateInfo,
        options,
        beltSpeed,
        beltSpeedTxt,
        zipPartial,
      ]) => ({
        machinesState,
        itemsState,
        itemsModified,
        stepsModified,
        totals,
        steps,
        stepDetails,
        stepById,
        stepByItemEntities,
        stepTree,
        effectivePowerUnit,
        recipesState,
        recipesModified,
        data,
        columnsState,
        settings,
        dispRateInfo,
        options,
        beltSpeed,
        beltSpeedTxt,
        zipPartial,
      })
    ),
    tap((vm) => this.setActiveItems(vm.steps, vm.stepDetails))
  );

  @ViewChild('stepsTable') stepsTable: Table | undefined;

  activeItem: Entities<MenuItem> = {};
  fragmentId: string | null | undefined;

  ItemId = ItemId;
  StepDetailTab = StepDetailTab;
  Game = Game;
  RecipeField = RecipeField;
  Rational = Rational;

  constructor(
    public route: ActivatedRoute,
    public contentSvc: ContentService,
    public trackSvc: TrackService,
    @Inject(DOCUMENT) private document: Document,
    private store: Store<LabState>,
    private exportSvc: ExportService,
    private routerSvc: RouterService
  ) {}

  ngOnInit(): void {
    this.route.fragment
      .pipe(
        first(),
        filter((f) => f != null)
      )
      .subscribe((id) => {
        // Store the fragment to navigate to it after the component loads
        this.fragmentId = id;
      });
  }

  ngAfterViewInit(): void {
    // Now that component is loaded, try navigating to the fragment
    try {
      if (this.fragmentId) {
        const [_, stepId, tabId] = this.fragmentId.split('_');
        combineLatest([
          this.store.select(Objectives.getSteps),
          this.store.select(Objectives.getStepDetails),
        ])
          .pipe(first())
          .subscribe(([steps, stepDetails]) => {
            const step = steps.find((s) => s.id === stepId);
            if (step) {
              const tabs = stepDetails[step.id].tabs;
              if (tabs.length) {
                if (this.stepsTable) {
                  this.stepsTable.toggleRow(step);
                  setTimeout(() => {
                    if (tabId) {
                      const tab = this.document.querySelector(
                        '#' + this.fragmentId + '_tab'
                      ) as HTMLElement | null;
                      if (tab) {
                        tab.click();
                      }
                    } else {
                      this.document
                        .querySelector('#' + this.fragmentId)
                        ?.scrollIntoView();
                    }
                  }, 10);
                }
              }
            }
          });
      }
    } catch {
      // ignore error
    }
  }

  setActiveItems(steps: Step[], stepDetails: Entities<StepDetail>): void {
    steps.forEach((s) => {
      const id = StepIdPipe.transform(s);
      const old = this.activeItem[id];
      const detail = stepDetails[s.id];
      if (detail == null) return;

      if (old == null) {
        this.activeItem[id] = detail.tabs[0];
      } else {
        const match = detail.tabs.find((t) => t.label === old.label);
        if (match == null) {
          this.activeItem[id] = detail.tabs[0];
        } else {
          this.activeItem[id] = match;
        }
      }
    });
  }

  setActiveItem(step: Step, item: MenuItem): void {
    const id = StepIdPipe.transform(step);
    this.activeItem[id] = item;
  }

  resetStep(step: Step): void {
    if (step.itemId) {
      this.resetItem(step.itemId);
    }

    if (step.recipeObjectiveId) {
      this.resetRecipeObjective(step.recipeObjectiveId);
    } else if (step.recipeId) {
      this.resetRecipe(step.recipeId);
    }
  }

  export(
    steps: Step[],
    itemsState: Items.ItemsState,
    recipesState: Recipes.RecipesState,
    columnsState: ColumnsState,
    data: Dataset
  ): void {
    this.exportSvc.stepsToCsv(
      steps,
      columnsState,
      itemsState,
      recipesState,
      data
    );
  }

  toggleRecipe(
    id: string,
    recipesState: Recipes.RecipesState,
    data: Dataset
  ): void {
    const value = !recipesState[id].excluded;
    const def = (data.defaults?.excludedRecipeIds ?? []).some((i) => i === id);
    this.setRecipeExcluded(id, value, def);
  }

  changeRecipeField(
    step: Step,
    event: string | number,
    machinesState: Machines.MachinesState,
    data: Dataset,
    field: RecipeField,
    index?: number,
    subindex?: number
  ): void {
    if (step.recipeId == null) return;

    const id = step.recipeObjectiveId ?? step.recipeId;
    const isObjective = step.recipeObjectiveId != null;
    const settings = step.recipeSettings;
    if (settings?.machineId) {
      const machineSettings = machinesState.entities[settings.machineId];
      switch (field) {
        case RecipeField.Machine: {
          if (typeof event === 'string' && machinesState.ids != null) {
            this.setMachine(
              step.recipeObjectiveId ?? step.recipeId,
              event,
              RecipeUtility.bestMatch(
                data.recipeEntities[step.recipeId].producers,
                machinesState.ids
              ),
              step.recipeObjectiveId != null
            );
          }

          break;
        }
        case RecipeField.MachineModules: {
          if (
            machineSettings.moduleRankIds != null &&
            data != null &&
            typeof event === 'string' &&
            index != null &&
            settings.machineModuleIds != null
          ) {
            const machine = data.machineEntities[settings.machineId];
            const count = settings.machineModuleIds.length;
            const options = RecipeUtility.moduleOptions(
              machine,
              step.recipeId,
              data
            );
            const def = RecipeUtility.defaultModules(
              options,
              machineSettings.moduleRankIds,
              count
            );
            const modules = this.generateModules(
              index,
              event,
              settings.machineModuleIds
            );
            this.setMachineModules(id, modules, def, isObjective);
          }
          break;
        }
        case RecipeField.BeaconCount: {
          if (typeof event === 'string' && index != null) {
            const def = machineSettings.beaconCount;
            this.setBeaconCount(id, index, event, def, isObjective);
          }
          break;
        }
        case RecipeField.Beacon: {
          if (typeof event === 'string' && index != null) {
            const def = machineSettings.beaconId;
            this.setBeacon(id, index, event, def, isObjective);
          }
          break;
        }
        case RecipeField.BeaconModules: {
          if (
            machineSettings.beaconModuleRankIds != null &&
            typeof event === 'string' &&
            index != null &&
            subindex != null
          ) {
            const beaconSettings = settings.beacons?.[index];
            if (
              beaconSettings?.id != null &&
              beaconSettings?.moduleIds != null
            ) {
              const beacon = data.beaconEntities[beaconSettings.id];
              const count = beaconSettings.moduleIds.length;
              const options = RecipeUtility.moduleOptions(
                beacon,
                step.recipeId,
                data
              );
              const def = RecipeUtility.defaultModules(
                options,
                machineSettings.beaconModuleRankIds,
                count
              );
              const value = this.generateModules(
                subindex,
                event,
                beaconSettings.moduleIds
              );
              this.setBeaconModules(id, index, value, def, isObjective);
            }
          }
          break;
        }
        case RecipeField.BeaconTotal: {
          if (typeof event === 'string' && index != null) {
            this.setBeaconTotal(id, index, event, isObjective);
          }
          break;
        }
        case RecipeField.Overclock: {
          if (typeof event === 'number') {
            const def = machineSettings.overclock;
            const value = Math.max(1, Math.min(250, event));
            this.setOverclock(id, value, def, isObjective);
          }
          break;
        }
      }
    }
  }

  generateModules(index: number, value: string, original: string[]): string[] {
    const modules = [...original]; // Copy
    // Fill in index to the right
    for (let i = index; i < modules.length; i++) {
      modules[i] = value;
    }
    return modules;
  }

  changeStepChecked(step: Step, checked: boolean): void {
    // Priority: 1) Item state, 2) Recipe objective state, 3) Recipe state
    if (step.itemId != null) {
      this.setItemChecked(step.itemId, checked);
    } else if (step.recipeObjectiveId != null) {
      this.setRecipeChecked(step.recipeObjectiveId, checked, true);
    } else if (step.recipeId != null) {
      this.setRecipeChecked(step.recipeId, checked);
    }
  }

  /** Action Dispatch Methods */
  setItemExcluded(id: string, value: boolean): void {
    this.store.dispatch(new Items.SetExcludedAction({ id, value }));
  }

  setItemChecked(id: string, value: boolean): void {
    this.store.dispatch(new Items.SetCheckedAction({ id, value }));
  }

  setBelt(id: string, value: string, def: string): void {
    this.store.dispatch(new Items.SetBeltAction({ id, value, def }));
  }

  setWagon(id: string, value: string, def: string): void {
    this.store.dispatch(new Items.SetWagonAction({ id, value, def }));
  }

  setRecipeExcluded(id: string, value: boolean, def: boolean): void {
    this.store.dispatch(new Recipes.SetExcludedAction({ id, value, def }));
  }

  setMachine(id: string, value: string, def: string, objective = false): void {
    const action = objective
      ? Objectives.SetMachineAction
      : Recipes.SetMachineAction;
    this.store.dispatch(new action({ id, value, def }));
  }

  setMachineModules(
    id: string,
    value: string[],
    def: string[] | undefined,
    objective = false
  ): void {
    const action = objective
      ? Objectives.SetMachineModulesAction
      : Recipes.SetMachineModulesAction;
    this.store.dispatch(new action({ id, value, def }));
  }

  addBeacon(id: string, objective = false): void {
    const action = objective
      ? Objectives.AddBeaconAction
      : Recipes.AddBeaconAction;
    this.store.dispatch(new action(id));
  }

  removeBeacon(id: string, value: number, objective = false): void {
    const action = objective
      ? Objectives.RemoveBeaconAction
      : Recipes.RemoveBeaconAction;
    this.store.dispatch(new action({ id, value }));
  }

  setBeaconCount(
    id: string,
    index: number,
    value: string,
    def: string | undefined,
    objective = false
  ): void {
    const action = objective
      ? Objectives.SetBeaconCountAction
      : Recipes.SetBeaconCountAction;
    this.store.dispatch(new action({ id, index, value, def }));
  }

  setBeacon(
    id: string,
    index: number,
    value: string,
    def: string | undefined,
    objective = false
  ): void {
    const action = objective
      ? Objectives.SetBeaconAction
      : Recipes.SetBeaconAction;
    this.store.dispatch(new action({ id, index, value, def }));
  }

  setBeaconModules(
    id: string,
    index: number,
    value: string[],
    def: string[] | undefined,
    objective = false
  ): void {
    const action = objective
      ? Objectives.SetBeaconModulesAction
      : Recipes.SetBeaconModulesAction;
    this.store.dispatch(new action({ id, index, value, def }));
  }

  setBeaconTotal(
    id: string,
    index: number,
    value: string,
    objective = false
  ): void {
    const action = objective
      ? Objectives.SetBeaconTotalAction
      : Recipes.SetBeaconTotalAction;
    this.store.dispatch(new action({ id, index, value }));
  }

  setOverclock(
    id: string,
    value: number,
    def: number | undefined,
    objective = false
  ): void {
    const action = objective
      ? Objectives.SetOverclockAction
      : Recipes.SetOverclockAction;
    this.store.dispatch(new action({ id, value, def }));
  }

  setRecipeChecked(id: string, value: boolean, objective = false): void {
    const action = objective
      ? Objectives.SetCheckedAction
      : Recipes.SetCheckedAction;
    this.store.dispatch(new action({ id, value }));
  }

  resetItem(value: string): void {
    this.store.dispatch(new Items.ResetItemAction(value));
  }

  resetRecipe(value: string): void {
    this.store.dispatch(new Recipes.ResetRecipeAction(value));
  }

  resetRecipeObjective(value: string): void {
    this.store.dispatch(new Objectives.ResetObjectiveAction(value));
  }

  resetChecked(): void {
    this.store.dispatch(new Items.ResetCheckedAction());
  }

  resetExcluded(): void {
    this.store.dispatch(new Items.ResetExcludedAction());
  }

  resetBelts(): void {
    this.store.dispatch(new Items.ResetBeltsAction());
  }

  resetWagons(): void {
    this.store.dispatch(new Items.ResetWagonsAction());
  }

  resetMachines(): void {
    this.store.dispatch(new Recipes.ResetMachinesAction());
  }

  resetBeacons(): void {
    this.store.dispatch(new Recipes.ResetBeaconsAction());
  }
}

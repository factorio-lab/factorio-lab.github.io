import {
  AsyncPipe,
  DOCUMENT,
  KeyValuePipe,
  NgTemplateOutlet,
} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, first } from 'rxjs';

import { NoDragDirective } from '~/directives/no-drag.directive';
import { coalesce, updateSetIds } from '~/helpers';
import { Game } from '~/models/enum/game';
import { ItemId } from '~/models/enum/item-id';
import { ObjectiveUnit } from '~/models/enum/objective-unit';
import { stepDetailIcon, StepDetailTab } from '~/models/enum/step-detail-tab';
import { MenuItem } from '~/models/menu-item';
import { rational } from '~/models/rational';
import { BeaconSettings } from '~/models/settings/beacon-settings';
import { ModuleSettings } from '~/models/settings/module-settings';
import { RecipeState } from '~/models/settings/recipe-settings';
import { Step } from '~/models/step';
import { StepDetail } from '~/models/step-detail';
import { storedSignal } from '~/models/stored-signal';
import { Entities } from '~/models/utils';
import { AsStepPipe } from '~/pipes/as-step.pipe';
import { IconClassPipe, IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { InserterSpeedPipe } from '~/pipes/inserter-speed.pipe';
import { LeftPadPipe } from '~/pipes/left-pad.pipe';
import { MachineRatePipe } from '~/pipes/machine-rate.pipe';
import { MachineShowPipe } from '~/pipes/machine-show.pipe';
import { MachineShowRatePipe } from '~/pipes/machine-show-rate.pipe';
import { OptionsPipe } from '~/pipes/options.pipe';
import { PowerPipe } from '~/pipes/power.pipe';
import { RatePipe } from '~/pipes/rate.pipe';
import { StepHrefPipe } from '~/pipes/step-href.pipe';
import { StepIdPipe } from '~/pipes/step-id.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import { ExportService } from '~/services/export.service';
import { RecipeService } from '~/services/recipe.service';
import { RouterService } from '~/services/router.service';
import { TrackService } from '~/services/track.service';
import { ItemsService } from '~/store/items.service';
import { MachinesService } from '~/store/machines.service';
import { ObjectivesService } from '~/store/objectives.service';
import { PreferencesService } from '~/store/preferences.service';
import { RecipesService } from '~/store/recipes.service';
import { SettingsService } from '~/store/settings.service';

import { BeaconsOverlayComponent } from '../beacons-overlay/beacons-overlay.component';
import { ColumnsComponent } from '../columns/columns.component';
import { ModulesOverlayComponent } from '../modules-overlay/modules-overlay.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type StepsMode = 'all' | 'focus';

@Component({
  selector: 'lab-steps',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    KeyValuePipe,
    NgTemplateOutlet,
    RouterLink,
    AsStepPipe,
    BeaconsOverlayComponent,
    ColumnsComponent,
    IconClassPipe,
    IconSmClassPipe,
    InserterSpeedPipe,
    LeftPadPipe,
    MachineRatePipe,
    MachineShowPipe,
    MachineShowRatePipe,
    ModulesOverlayComponent,
    NoDragDirective,
    OptionsPipe,
    PowerPipe,
    RatePipe,
    StepHrefPipe,
    StepIdPipe,
    TooltipComponent,
    TranslatePipe,
  ],
  templateUrl: './steps.component.html',
  styleUrls: ['./steps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsComponent implements OnInit, AfterViewInit {
  document = inject(DOCUMENT);
  route = inject(ActivatedRoute);
  ref = inject(ChangeDetectorRef);
  contentSvc = inject(ContentService);
  exportSvc = inject(ExportService);
  itemsSvc = inject(ItemsService);
  machinesSvc = inject(MachinesService);
  objectivesSvc = inject(ObjectivesService);
  preferencesSvc = inject(PreferencesService);
  recipeSvc = inject(RecipeService);
  recipesSvc = inject(RecipesService);
  routerSvc = inject(RouterService);
  settingsSvc = inject(SettingsService);
  trackSvc = inject(TrackService);

  focus = input(false);
  selectedId = input<string | null>();
  // stepsTable = viewChild.required<Table>('stepsTable');

  itemsState = this.itemsSvc.settings;
  itemsModified = this.itemsSvc.itemsModified;
  machinesState = this.machinesSvc.settings;
  recipesModified = this.objectivesSvc.recipesModified;
  stepsModified = this.objectivesSvc.stepsModified;
  stepTree = this.objectivesSvc.stepTree;
  stepDetails = this.objectivesSvc.stepDetails;
  stepById = this.objectivesSvc.stepById;
  stepByItemEntities = this.objectivesSvc.stepByItemEntities;
  effectivePowerUnit = this.objectivesSvc.effectivePowerUnit;
  totals = this.objectivesSvc.totals;
  settings = this.settingsSvc.settings;
  dispRateInfo = this.settingsSvc.displayRateInfo;
  beltSpeed = this.settingsSvc.beltSpeed;
  options = this.settingsSvc.options;
  columnsState = this.settingsSvc.columnsState;
  data = this.recipesSvc.adjustedDataset;
  preferences = this.preferencesSvc.state;
  _steps = this.objectivesSvc.steps;
  steps = computed(() => {
    const steps = [...this._steps()];
    const focus = this.focus();
    if (!focus) return steps;
    const selectedId = this.selectedId();
    return steps.filter((s) => s.id === selectedId);
  });
  activeItemsEffect = effect(() => {
    const steps = this.steps();
    const stepDetails = this.stepDetails();
    this.setActiveItems(steps, stepDetails);
  });
  toggleEffect = effect(() => {
    const focus = this.focus();
    const step = this.steps()[0];
    if (focus && step) {
      // TODO: Toggle row
      // this.stepsTable().toggleRow(step);
      this.expandRow(step, false);
    }
  });

  // TODO: Step sorting
  // sortSteps$ = new BehaviorSubject<SortEvent | null>(null);
  activeItem: Entities<MenuItem> = {};
  stepDetailTab = storedSignal('stepDetailTab');
  fragmentId: string | null | undefined;

  stepDetailIcon = stepDetailIcon;
  ItemId = ItemId;
  StepDetailTab = StepDetailTab;
  Game = Game;
  ObjectiveUnit = ObjectiveUnit;
  rational = rational;

  // constructor() {
  //   combineLatest([this.sortSteps$.pipe(pairwise()), toObservable(this._steps)])
  //     .pipe(takeUntilDestroyed())
  //     .subscribe(([[prev, curr], steps]) => {
  //       this.sortSteps(prev, curr, steps);
  //     });
  // }

  ngOnInit(): void {
    this.route.fragment
      .pipe(
        first(),
        filter((f) => f != null),
      )
      .subscribe((id) => {
        // Store the fragment to navigate to it after the component loads
        this.fragmentId = id;
      });
  }

  ngAfterViewInit(): void {
    // Now that component is loaded, try navigating to the fragment
    this.loadFragmentId();
  }

  loadFragmentId(): void {
    if (!this.fragmentId) return;
    try {
      const fragment = this.fragmentId;
      const [_, stepId, tabId] = fragment.split('_');
      const steps = this.steps();
      const stepDetails = this.stepDetails();
      const step = steps.find((s) => s.id === stepId);
      if (step == null) return;
      const tabs = stepDetails[step.id].tabs;
      if (!tabs.length) return;
      // TODO: Toggle row
      // this.stepsTable().toggleRow(step);
      setTimeout(() => {
        if (tabId) {
          const tab = this.document.querySelector<HTMLElement>(`#${fragment}`);
          if (tab) tab.click();
        } else {
          this.document.querySelector(`#${fragment}`)?.scrollIntoView();
        }
      }, 10);
    } catch {
      // ignore error
    }
  }

  // sortSteps(
  //   prev: SortEvent | null,
  //   curr: SortEvent | null,
  //   steps: Step[],
  // ): void {
  //   if (curr?.order == null || curr.field == null) return;
  //   const order = curr.order;
  //   const field = curr.field as
  //     | 'items'
  //     | 'belts'
  //     | 'wagons'
  //     | 'machines'
  //     | 'power'
  //     | 'pollution';

  //   if (
  //     prev != null &&
  //     prev.field === field &&
  //     prev.order !== order &&
  //     order === -1 &&
  //     this.stepsTable != null
  //   ) {
  //     /**
  //      * User has sorted the same column three times in a row. Reset sort and
  //      * reset table state, otherwise PrimeNG will not ever reset sort.
  //      */
  //     curr.data?.sort((a: Step, b: Step) => {
  //       const diff = steps.indexOf(a) - steps.indexOf(b);
  //       return diff;
  //     });
  //     this.stepsTable().sortOrder = 0;
  //     this.stepsTable().sortField = '';
  //     this.stepsTable().reset();
  //     this.sortSteps$.next(null);
  //     return;
  //   }

  //   // Sort by numeric field
  //   curr.data?.sort((a: Step, b: Step) => {
  //     const diff = (a[field] ?? rational(0n)).sub(b[field] ?? rational(0n));
  //     return diff.toNumber() * order;
  //   });
  // }

  setActiveItems(steps: Step[], stepDetails: Entities<StepDetail>): void {
    steps.forEach((step) => {
      this.updateActiveItem(step, stepDetails, false);
    });
  }

  expandRow(step: Step, expanded: boolean): void {
    if (expanded) return;
    this.updateActiveItem(step, this.stepDetails(), true);
  }

  updateActiveItem(
    step: Step,
    stepDetails: Entities<StepDetail>,
    force: boolean,
  ): void {
    const id = StepIdPipe.transform(step);
    const item = this._getActiveItem(step, id, stepDetails, force);
    if (item) {
      const id = StepIdPipe.transform(step);
      this.activeItem[id] = item;
    }
  }

  private _getActiveItem(
    step: Step,
    id: string,
    stepDetails: Entities<StepDetail>,
    force: boolean,
  ): MenuItem | null | undefined {
    const old = this.activeItem[id];
    const detail = stepDetails[step.id];

    if (detail == null) return null;

    if (old != null) {
      const match = detail.tabs.find((t) => t.label === old.label);
      if (match != null) return match;
    }

    if (old == null && !force) return null;

    const userTab = this.stepDetailTab();
    if (userTab) {
      const match = detail.tabs.find((t) => t.label === userTab);
      if (match != null) return match;
    }

    return detail.tabs[0];
  }

  setActiveItem(step: Step, item: MenuItem | null | undefined): void {
    if (item == null) return;
    const id = StepIdPipe.transform(step);
    this.activeItem[id] = item;
    this.stepDetailTab.set(item.label as StepDetailTab);
  }

  resetStep(step: Step): void {
    if (step.itemId) this.itemsSvc.resetId(step.itemId);

    if (step.recipeObjectiveId) {
      this.objectivesSvc.updateEntity(step.recipeObjectiveId, {
        machineId: undefined,
        fuelId: undefined,
        modules: undefined,
        beacons: undefined,
        overclock: undefined,
      });
    } else if (step.recipeId) {
      this.recipesSvc.resetId(step.recipeId);
    }
  }

  changeItemExcluded(id: string, value: boolean): void {
    const excludedItemIds = updateSetIds(
      id,
      value,
      this.settings().excludedItemIds,
    );
    this.settingsSvc.apply({ excludedItemIds });
  }

  changeRecipesExcluded(ids: string[], excluded: boolean): void {
    const value = updateSetIds(
      ids,
      excluded,
      this.settings().excludedRecipeIds,
    );
    this.settingsSvc.updateField(
      'excludedRecipeIds',
      value,
      this.settings().defaultExcludedRecipeIds,
    );
  }

  changeModulesBeacons(
    step: Step,
    state: { modules?: ModuleSettings[]; beacons?: BeaconSettings[] },
  ): void {
    const settings = step.recipeSettings;
    if (step.recipeId == null || settings?.machineId == null) return;

    const id = step.recipeObjectiveId ?? step.recipeId;
    const update =
      step.recipeObjectiveId != null
        ? this.objectivesSvc.updateEntity.bind(this)
        : this.recipesSvc.updateEntity.bind(this);

    const machine = this.data().machineEntities[settings.machineId];
    const machineSettings = this.machinesState()[settings.machineId];
    if (state.modules) {
      state.modules = this.recipeSvc.dehydrateModules(
        state.modules,
        coalesce(settings.moduleOptions, []),
        this.settings().moduleRankIds,
        machine.modules,
        machineSettings.modules,
      );
    }

    if (state.beacons) {
      state.beacons = this.recipeSvc.dehydrateBeacons(
        state.beacons,
        machineSettings.beacons,
      );
    }

    update(id, state);
  }

  changeStepChecked(step: Step, value: boolean): void {
    // Priority: 1) Item state, 2) Recipe objective state, 3) Recipe state
    if (step.itemId != null) {
      const checkedItemIds = updateSetIds(
        step.itemId,
        value,
        this.settings().checkedItemIds,
      );
      this.settingsSvc.apply({ checkedItemIds });
    } else if (step.recipeObjectiveId != null) {
      const checkedObjectiveIds = updateSetIds(
        step.recipeObjectiveId,
        value,
        this.settings().checkedObjectiveIds,
      );
      this.settingsSvc.apply({ checkedObjectiveIds });
    } else if (step.recipeId != null) {
      const checkedRecipeIds = updateSetIds(
        step.recipeId,
        value,
        this.settings().checkedRecipeIds,
      );
      this.settingsSvc.apply({ checkedRecipeIds });
    }
  }

  resetChecked(): void {
    this.settingsSvc.apply({
      checkedItemIds: new Set(),
      checkedObjectiveIds: new Set(),
      checkedRecipeIds: new Set(),
    });
  }

  resetExcludedItems(event: Event): void {
    this.settingsSvc.apply({ excludedItemIds: new Set() });
    event.stopImmediatePropagation();
  }

  resetBelts(event: Event): void {
    this.itemsSvc.resetFields('beltId');
    event.stopImmediatePropagation();
  }

  resetWagons(event: Event): void {
    this.itemsSvc.resetFields('wagonId');
    event.stopImmediatePropagation();
  }

  resetMachines(event: Event): void {
    const fields: (keyof RecipeState)[] = [
      'machineId',
      'overclock',
      'modules',
      'beacons',
    ];
    this.objectivesSvc.resetFields(...fields);
    this.recipesSvc.resetFields(...fields);
    event.stopImmediatePropagation();
  }

  resetBeacons(): void {
    this.objectivesSvc.resetFields('beacons');
    this.recipesSvc.resetFields('beacons');
  }
}

import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest, EMPTY, first, map, Observable } from 'rxjs';

import { NoDragDirective } from '~/directives/no-drag.directive';
import { AdjustedDataset } from '~/models/dataset';
import { displayRateOptions } from '~/models/enum/display-rate';
import { MaximizeType } from '~/models/enum/maximize-type';
import {
  ObjectiveType,
  objectiveTypeOptions,
} from '~/models/enum/objective-type';
import { ObjectiveUnit } from '~/models/enum/objective-unit';
import { SimplexResultType } from '~/models/enum/simplex-result-type';
import { MatrixResult } from '~/models/matrix-result';
import { Message } from '~/models/message';
import { ObjectiveState } from '~/models/objective';
import { rational } from '~/models/rational';
import { Settings } from '~/models/settings/settings';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import { RateService } from '~/services/rate.service';
import { TrackService } from '~/services/track.service';
import { TranslateService } from '~/services/translate.service';
import { ItemsService } from '~/store/items.service';
import { ObjectivesService } from '~/store/objectives.service';
import { PreferencesService } from '~/store/preferences.service';
import { RecipesService } from '~/store/recipes.service';
import { SettingsService } from '~/store/settings.service';

import { InputNumberComponent } from '../input-number/input-number.component';
import { PickerComponent } from '../picker/picker.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
  selector: 'lab-objectives',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    NoDragDirective,
    PickerComponent,
    IconSmClassPipe,
    InputNumberComponent,
    TooltipComponent,
    TranslatePipe,
  ],
  templateUrl: './objectives.component.html',
  styleUrls: ['./objectives.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectivesComponent {
  contentSvc = inject(ContentService);
  itemsSvc = inject(ItemsService);
  objectivesSvc = inject(ObjectivesService);
  preferencesSvc = inject(PreferencesService);
  rateSvc = inject(RateService);
  recipesSvc = inject(RecipesService);
  settingsSvc = inject(SettingsService);
  trackSvc = inject(TrackService);
  translateSvc = inject(TranslateService);

  result = this.objectivesSvc.matrixResult;
  itemsState = this.itemsSvc.settings;
  beltSpeed = this.settingsSvc.beltSpeed;
  dispRateInfo = this.settingsSvc.displayRateInfo;
  maximizeType = this.settingsSvc.maximizeType;
  unitOptions = this.settingsSvc.objectiveUnitOptions;
  recipeIds = this.settingsSvc.availableRecipeIds;
  itemIds = this.recipesSvc.availableItemIds;
  data = this.recipesSvc.adjustedDataset;
  convertObjectiveValues = this.preferencesSvc.convertObjectiveValues;
  paused = this.preferencesSvc.paused;
  objectives = computed(() => [...this.objectivesSvc.objectives()]);

  messages = computed(() => {
    const objectives = this.objectivesSvc.objectives();
    const matrixResult = this.objectivesSvc.matrixResult();
    const settings = this.settingsSvc.settings();

    return this.getMessages(objectives, matrixResult, settings);
  });

  objectiveTypeOptions = objectiveTypeOptions;
  displayRateOptions = displayRateOptions;

  MaximizeType = MaximizeType;
  ObjectiveUnit = ObjectiveUnit;
  ObjectiveType = ObjectiveType;

  getMessages(
    objectives: ObjectiveState[],
    matrixResult: MatrixResult,
    settings: Settings,
  ): Observable<Message[]> {
    if (matrixResult.resultType === SimplexResultType.Paused) {
      return this.translateSvc
        .get('objectives.pausedMessage')
        .pipe(map((detail): Message[] => [{ severity: 'info', detail }]));
    }

    if (matrixResult.resultType !== SimplexResultType.Failed) return EMPTY;

    if (matrixResult.simplexStatus === 'unbounded') {
      const maxObjectives = objectives.filter(
        (o) => o.type === ObjectiveType.Maximize,
      );

      if (
        maxObjectives.length &&
        objectives.every((o) => o.type !== ObjectiveType.Limit)
      ) {
        // Found maximize objectives but no limits
        return this.buildErrorMessages(
          'objectives.errorUnbounded',
          'objectives.errorNoLimits',
          matrixResult,
        );
      }

      if (
        maxObjectives.some((o) =>
          o.unit === ObjectiveUnit.Machines
            ? settings.excludedRecipeIds.has(o.targetId)
            : settings.excludedItemIds.has(o.targetId),
        )
      ) {
        // Found an excluded maximize objective
        return this.buildErrorMessages(
          'objectives.errorUnbounded',
          'objectives.errorMaximizeExcluded',
          matrixResult,
        );
      }

      return this.buildErrorMessages(
        'objectives.errorUnbounded',
        'objectives.errorUnboundedDetail',
        matrixResult,
      );
    } else if (matrixResult.simplexStatus === 'no_feasible') {
      return this.buildErrorMessages(
        'objectives.errorInfeasible',
        'objectives.errorInfeasibleDetail',
        matrixResult,
      );
    } else {
      return this.buildErrorMessages(
        'objectives.error',
        'objectives.errorDetail',
        matrixResult,
      );
    }
  }

  buildErrorMessages(
    summary: string,
    detail: string,
    matrixResult: MatrixResult,
  ): Observable<Message[]> {
    return combineLatest([
      this.translateSvc.get(summary),
      this.translateSvc.get(detail),
      this.translateSvc.get('objectives.errorSimplexInfo', {
        returnCode: matrixResult.returnCode ?? 'unknown',
        simplexStatus: matrixResult.simplexStatus ?? 'unknown',
      }),
    ]).pipe(
      map(([summary, detail, detailInfo]): Message[] => [
        {
          severity: 'error',
          summary,
          detail: `${detail} ${detailInfo}`,
        },
      ]),
    );
  }

  changeUnit(
    objective: ObjectiveState,
    unit: ObjectiveUnit,
    chooseItemPicker: PickerComponent,
    chooseRecipePicker: PickerComponent,
  ): void {
    const data = this.data();
    if (unit === ObjectiveUnit.Machines) {
      if (objective.unit !== ObjectiveUnit.Machines) {
        const recipeIds = data.itemRecipeIds[objective.targetId];
        const updateFn = (recipeId: string): void => {
          this.convertItemsToMachines(objective, recipeId, data);
        };
        if (recipeIds.length === 1) {
          updateFn(recipeIds[0]);
        } else {
          chooseRecipePicker.selectId.pipe(first()).subscribe((targetId) => {
            updateFn(targetId);
          });
          chooseRecipePicker.clickOpen('recipe', recipeIds);
        }
      }
    } else {
      if (objective.unit === ObjectiveUnit.Machines) {
        const itemIds = Array.from(
          data.adjustedRecipe[objective.targetId].produces,
        );
        const updateFn = (itemId: string): void => {
          this.convertMachinesToItems(objective, itemId, unit, data);
        };

        if (itemIds.length === 1) {
          updateFn(itemIds[0]);
        } else {
          chooseItemPicker.selectId.pipe(first()).subscribe((itemId) => {
            updateFn(itemId);
          });
          chooseItemPicker.clickOpen('item', itemIds);
        }
      } else {
        // No target conversion required
        this.convertItemsToItems(objective, objective.targetId, unit, data);
      }
    }
  }

  /**
   * Update unit field (non-machines -> machines), then convert and update
   * objective value so that number of items remains constant
   */
  convertItemsToMachines(
    objective: ObjectiveState,
    recipeId: string,
    data: AdjustedDataset,
  ): void {
    this.objectivesSvc.updateEntity(objective.id, {
      targetId: recipeId,
      unit: ObjectiveUnit.Machines,
    });

    if (
      !this.convertObjectiveValues() ||
      objective.type === ObjectiveType.Maximize
    )
      return;

    const itemsState = this.itemsState();
    const beltSpeed = this.beltSpeed();
    const dispRateInfo = this.dispRateInfo();
    const oldValue = this.rateSvc.objectiveNormalizedRate(
      objective,
      itemsState,
      beltSpeed,
      dispRateInfo,
      data,
    );
    const recipe = data.adjustedRecipe[recipeId];
    const newValue = oldValue.div(recipe.output[objective.targetId]);
    this.objectivesSvc.updateEntity(objective.id, { value: newValue });
  }

  /**
   * Update unit field (machines -> non-machines), then convert and update
   * objective value so that number of items remains constant
   */
  convertMachinesToItems(
    objective: ObjectiveState,
    itemId: string,
    unit: ObjectiveUnit,
    data: AdjustedDataset,
  ): void {
    this.objectivesSvc.updateEntity(objective.id, {
      targetId: itemId,
      unit,
    });

    if (
      !this.convertObjectiveValues() ||
      objective.type === ObjectiveType.Maximize ||
      objective.recipe == null
    )
      return;

    const itemsState = this.itemsState();
    const beltSpeed = this.beltSpeed();
    const dispRateInfo = this.dispRateInfo();
    const factor = this.rateSvc.objectiveNormalizedRate(
      {
        id: '',
        targetId: itemId,
        value: rational.one,
        unit,
        type: ObjectiveType.Output,
      },
      itemsState,
      beltSpeed,
      dispRateInfo,
      data,
    );
    const oldValue = objective.value.mul(objective.recipe.output[itemId]);
    const newValue = oldValue.div(factor);
    this.objectivesSvc.updateEntity(objective.id, { value: newValue });
  }

  /**
   * Update unit field (non-machines -> non-machines), then convert and update
   * objective value so that number of items remains constant
   */
  convertItemsToItems(
    objective: ObjectiveState,
    itemId: string,
    unit: ObjectiveUnit,
    data: AdjustedDataset,
  ): void {
    this.objectivesSvc.updateEntity(objective.id, {
      targetId: itemId,
      unit,
    });

    if (
      !this.convertObjectiveValues() ||
      objective.type === ObjectiveType.Maximize
    )
      return;

    const itemsState = this.itemsState();
    const beltSpeed = this.beltSpeed();
    const dispRateInfo = this.dispRateInfo();
    const oldValue = this.rateSvc.objectiveNormalizedRate(
      objective,
      itemsState,
      beltSpeed,
      dispRateInfo,
      data,
    );
    const factor = this.rateSvc.objectiveNormalizedRate(
      {
        id: '',
        targetId: itemId,
        value: rational.one,
        unit,
        type: ObjectiveType.Output,
      },
      itemsState,
      beltSpeed,
      dispRateInfo,
      data,
    );
    const newValue = oldValue.div(factor);
    this.objectivesSvc.updateEntity(objective.id, { value: newValue });
  }
}

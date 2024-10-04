import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { InputNumberComponent } from '~/components/input-number/input-number.component';
import { PickerComponent } from '~/components/picker/picker.component';
import { displayRateOptions } from '~/models/enum/display-rate';
import { ObjectiveType } from '~/models/enum/objective-type';
import { ObjectiveUnit } from '~/models/enum/objective-unit';
import { rational } from '~/models/rational';
import { IconClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ObjectivesService } from '~/store/objectives.service';
import { RecipesService } from '~/store/recipes.service';
import { SettingsService } from '~/store/settings.service';

export type WizardState = 'type' | 'item' | 'recipe';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IconClassPipe,
    InputNumberComponent,
    PickerComponent,
    TranslatePipe,
  ],
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardComponent {
  router = inject(Router);
  route = inject(ActivatedRoute);
  objectivesSvc = inject(ObjectivesService);
  recipesSvc = inject(RecipesService);
  settingsSvc = inject(SettingsService);

  itemIds = this.recipesSvc.availableItemIds;
  recipeIds = this.settingsSvc.availableRecipeIds;
  data = this.settingsSvc.dataset;
  displayRate = this.settingsSvc.displayRate;

  id = '';
  value = rational.one;
  state: WizardState = 'type';

  displayRateOptions = displayRateOptions;

  ObjectiveUnit = ObjectiveUnit;

  selectId(value: string, state: WizardState): void {
    this.id = value;
    this.state = state;
  }

  createItemObjective(targetId: string): void {
    this.objectivesSvc.create({
      targetId,
      value: this.value,
      unit: ObjectiveUnit.Items,
      type: ObjectiveType.Output,
    });
    void this.router.navigate(['../list'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  createRecipeObjective(targetId: string): void {
    this.objectivesSvc.create({
      targetId,
      value: this.value,
      unit: ObjectiveUnit.Machines,
      type: ObjectiveType.Output,
    });
    void this.router.navigate(['../list'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }
}

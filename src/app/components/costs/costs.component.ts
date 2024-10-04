import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { spread } from '~/helpers';
import { rational } from '~/models/rational';
import { CostKey, CostSettings } from '~/models/settings/cost-settings';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import {
  initialSettingsState,
  SettingsService,
} from '~/store/settings.service';

import { InputNumberComponent } from '../input-number/input-number.component';
import { DialogComponent } from '../modal';

@Component({
  selector: 'lab-costs',
  standalone: true,
  imports: [FormsModule, InputNumberComponent, TranslatePipe],
  templateUrl: './costs.component.html',
  styleUrls: ['./costs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostsComponent extends DialogComponent {
  contentSvc = inject(ContentService);
  settingsSvc = inject(SettingsService);

  editValue = spread(initialSettingsState.costs);

  rational = rational;

  get modified(): boolean {
    return (Object.keys(this.editValue) as CostKey[]).some(
      (k) => this.editValue[k] !== initialSettingsState.costs[k],
    );
  }

  initEdit(costs: CostSettings): void {
    this.editValue = spread(costs);
  }

  open(value: CostSettings): void {
    this.initEdit(value);
    this.show();
  }

  reset(): void {
    this.editValue = spread(initialSettingsState.costs);
  }

  save(): void {
    const costs = this.editValue;
    this.settingsSvc.apply({ costs });
  }
}

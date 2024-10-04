import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { spread } from '~/helpers';
import { FlowDiagram, flowDiagramOptions } from '~/models/enum/flow-diagram';
import { sankeyAlignOptions } from '~/models/enum/sankey-align';
import { FlowSettings } from '~/models/settings/flow-settings';
import { TranslatePipe } from '~/pipes/translate.pipe';
import {
  initialPreferencesState,
  PreferencesService,
} from '~/store/preferences.service';
import { SettingsService } from '~/store/settings.service';

import { DialogComponent } from '../modal';

const initialValue = initialPreferencesState.flowSettings;

@Component({
  selector: 'lab-flow-settings',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './flow-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowSettingsComponent extends DialogComponent {
  preferencesSvc = inject(PreferencesService);
  settingsSvc = inject(SettingsService);

  linkValueOptions = this.settingsSvc.linkValueOptions;

  editValue = spread(initialValue);

  flowDiagramOptions = flowDiagramOptions;
  sankeyAlignOptions = sankeyAlignOptions;

  FlowDiagram = FlowDiagram;

  get modified(): boolean {
    return (Object.keys(this.editValue) as (keyof FlowSettings)[]).some(
      (k) => this.editValue[k] !== initialValue[k],
    );
  }

  initEdit(value: FlowSettings): void {
    this.editValue = spread(value);
  }

  open(value: FlowSettings): void {
    this.initEdit(value);
    this.show();
  }

  reset(): void {
    this.initEdit(initialValue);
  }

  save(): void {
    const flowSettings = this.editValue;
    this.preferencesSvc.apply({ flowSettings });
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { spread } from '~/helpers';
import {
  ColumnKey,
  ColumnSettings,
  columnsInfo,
  ColumnsState,
  initialColumnsState,
} from '~/models/settings/column-settings';
import { Entities } from '~/models/utils';
import { PrecisionExamplePipe } from '~/pipes/precision-example.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import {
  initialPreferencesState,
  PreferencesService,
} from '~/store/preferences.service';
import { SettingsService } from '~/store/settings.service';

import { DialogComponent } from '../modal';

@Component({
  selector: 'lab-columns',
  standalone: true,
  imports: [FormsModule, PrecisionExamplePipe, TranslatePipe],
  templateUrl: './columns.component.html',
  styleUrls: ['./columns.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnsComponent extends DialogComponent {
  preferencesSvc = inject(PreferencesService);
  settingsSvc = inject(SettingsService);

  columnOptions = this.settingsSvc.columnOptions;

  editValue: Entities<ColumnSettings> = initialColumnsState;
  columnsInf = columnsInfo;

  get modified(): boolean {
    return (Object.keys(this.editValue) as ColumnKey[]).some(
      (k) =>
        this.editValue[k].precision !==
          initialPreferencesState.columns[k].precision ||
        this.editValue[k].show !== initialPreferencesState.columns[k].show,
    );
  }

  initEdit(columns: ColumnsState): void {
    this.editValue = (Object.keys(columns) as ColumnKey[])
      .filter((c) => columnsInfo[c] != null) // Filter out any obsolete keys
      .reduce((e: Entities<ColumnSettings>, c) => {
        e[c] = spread(columns[c]);
        return e;
      }, {});
  }

  open(value: ColumnsState): void {
    this.initEdit(value);
    this.show();
  }

  changeFraction(value: boolean, column: ColumnKey): void {
    this.editValue[column].precision = value ? null : 1;
  }

  reset(): void {
    this.initEdit(initialPreferencesState.columns);
  }

  save(): void {
    const columns = this.editValue as ColumnsState;
    this.preferencesSvc.apply({ columns });
  }
}

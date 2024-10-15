import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { FormControlComponent } from '~/models/form-control';
import { Option } from '~/models/option';
import { TranslatePipe } from '~/pipes/translate.pipe';

@Component({
  selector: 'lab-select',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: SelectComponent,
    },
  ],
})
export class SelectComponent<T> extends FormControlComponent<T> {
  options = input.required<Option<T>[]>();
}

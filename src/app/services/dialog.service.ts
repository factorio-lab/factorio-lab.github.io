import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { PickerComponent } from '~/components/picker/picker.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  dialog = inject(Dialog);

  openPicker(header: string, type: 'item' | 'recipe', allIds: string[]): void {
    const ref = this.dialog.open(PickerComponent, {
      data: {
        header,
        type,
        allIds,
      },
    });
  }
}

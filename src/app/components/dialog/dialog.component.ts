import { CdkDialogContainer, DialogRef } from '@angular/cdk/dialog';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { TranslatePipe } from '~/pipes/translate.pipe';

@Component({
  selector: 'lab-dialog',
  standalone: true,
  imports: [CdkPortalOutlet, FaIconComponent, TranslatePipe],
  templateUrl: './dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bg-zinc-900 rounded border p-3',
  },
})
export class DialogComponent extends CdkDialogContainer {
  dialogRef = inject(DialogRef);

  icon = {
    Xmark: faXmark,
  };
}

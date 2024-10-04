import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  signal,
} from '@angular/core';

import { spread } from '~/helpers';
import { Machine } from '~/models/data/machine';
import { ModuleSettings } from '~/models/settings/module-settings';
import { TranslatePipe } from '~/pipes/translate.pipe';

import { OverlayComponent } from '../modal';
import { ModulesComponent } from '../modules/modules.component';

@Component({
  selector: 'lab-modules-overlay',
  standalone: true,
  imports: [ModulesComponent, TranslatePipe],
  templateUrl: './modules-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesOverlayComponent extends OverlayComponent {
  @Output() setValue = new EventEmitter<ModuleSettings[]>();

  machine = signal<Machine | undefined>(undefined);
  modules = signal<ModuleSettings[]>([]);
  recipeId = signal<string | undefined>(undefined);

  show(
    event: Event,
    modules: ModuleSettings[],
    machine: Machine,
    recipeId?: string,
  ): void {
    this.machine.set(machine);
    this.modules.set(modules.map((m) => spread(m)));
    this.recipeId.set(recipeId);
    this._show(event);
  }

  save(): void {
    let values = this.modules();
    if (this.machine()?.modules !== true)
      values = values.filter((e) => e.count?.nonzero());
    this.setValue.emit(values);
  }
}

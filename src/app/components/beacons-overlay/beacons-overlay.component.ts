import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { spread } from '~/helpers';
import { ItemId } from '~/models/enum/item-id';
import { Rational, rational } from '~/models/rational';
import { BeaconSettings } from '~/models/settings/beacon-settings';
import { ModuleSettings } from '~/models/settings/module-settings';
import { Optional } from '~/models/utils';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { SettingsService } from '~/store/settings.service';

import { InputNumberComponent } from '../input-number/input-number.component';
import { OverlayComponent } from '../modal';
import { ModulesComponent } from '../modules/modules.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
  selector: 'lab-beacons-overlay',
  standalone: true,
  imports: [
    FormsModule,
    IconSmClassPipe,
    InputNumberComponent,
    ModulesComponent,
    TooltipComponent,
    TranslatePipe,
  ],
  templateUrl: './beacons-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeaconsOverlayComponent extends OverlayComponent {
  settingsSvc = inject(SettingsService);

  @Output() setValue = new EventEmitter<BeaconSettings[]>();

  data = this.settingsSvc.dataset;
  options = this.settingsSvc.options;

  beacons = signal<BeaconSettings[]>([]);
  recipeId = signal<string | undefined>(undefined);
  rational = rational;

  show(event: Event, values: BeaconSettings[], recipeId?: string): void {
    this.beacons.set(
      values.map((v) =>
        spread(v, { modules: v.modules?.map((m) => spread(m)) }),
      ),
    );
    this.recipeId.set(recipeId);
    this._show(event);
  }

  setCount(i: number, count: Rational): void {
    this.beacons.update((values) => {
      values[i].count = count;
      return values;
    });
  }

  // setId(i: number, event: DropdownChangeEvent): void {
  //   event.originalEvent.stopPropagation();
  //   this.beacons.update((values) => {
  //     values[i].id = event.value as Optional<string>;
  //     return values;
  //   });
  // }

  setModules(i: number, modules: ModuleSettings[]): void {
    this.beacons.update((values) => {
      values[i].modules = modules;
      return values;
    });
  }

  setTotal(i: number, total: Rational): void {
    this.beacons.update((values) => {
      values[i].total = total;
      return values;
    });
  }

  removeEntry(i: number): void {
    this.beacons.update((values) => values.filter((_, vi) => vi !== i));
  }

  addEntry(): void {
    this.beacons.update((values) => {
      const id = this.options().beacons[0].value;
      const count = this.data().beaconEntities[id].modules;
      const modules: ModuleSettings[] = [
        {
          id: ItemId.Module,
          count: count,
        },
      ];
      values.push({ id, count: rational.zero, modules });
      return values;
    });
  }

  save(): void {
    const value = this.beacons().map((b) =>
      spread(b, { modules: b.modules?.filter((m) => m.count?.nonzero()) }),
    );
    this.setValue.emit(value);
  }
}

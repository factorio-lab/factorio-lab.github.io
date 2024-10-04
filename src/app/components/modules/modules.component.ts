import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { coalesce, notNullish, spread } from '~/helpers';
import { Beacon } from '~/models/data/beacon';
import { Machine } from '~/models/data/machine';
import { ItemId } from '~/models/enum/item-id';
import { Rational, rational } from '~/models/rational';
import { ModuleSettings } from '~/models/settings/module-settings';
import { FilterOptionsPipe } from '~/pipes/filter-options.pipe';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { RecipeService } from '~/services/recipe.service';
import { SettingsService } from '~/store/settings.service';

import { InputNumberComponent } from '../input-number/input-number.component';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
  selector: 'lab-modules',
  standalone: true,
  imports: [
    FormsModule,
    FilterOptionsPipe,
    IconSmClassPipe,
    InputNumberComponent,
    TooltipComponent,
  ],
  templateUrl: './modules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesComponent {
  recipeSvc = inject(RecipeService);
  settingsSvc = inject(SettingsService);

  entity = input.required<Machine | Beacon>();
  modules = input.required<ModuleSettings[]>();
  recipeId = input<string>();

  setValue = output<ModuleSettings[]>();

  data = this.settingsSvc.dataset;

  exclude = computed(() =>
    this.modules()
      .map((m) => m.id)
      .filter(notNullish),
  );
  sum = computed(() =>
    this.modules()
      .map((m) => m.count)
      .filter(notNullish)
      .reduce((s, c) => s.add(c), rational.zero),
  );
  options = computed(() => {
    return this.recipeSvc.moduleOptions(
      this.entity(),
      this.data(),
      this.recipeId(),
    );
  });
  maximum = computed(() => {
    const values = this.modules();
    const slots = coalesce(this.entity().modules, rational.zero);
    if (slots === true) return values.map(() => null);
    let sum = this.sum();
    const empty = values.find((e) => e.id === ItemId.Module);
    if (empty) sum = sum.sub(coalesce(empty.count, rational.zero));
    const remain = slots.sub(sum);
    return values.map((e) => coalesce(e.count, rational.zero).add(remain));
  });

  rational = rational;
  ItemId = ItemId;

  setCount(i: number, count: Rational): void {
    const modules = this.modules().map((m, j) =>
      i === j ? spread(m, { count }) : m,
    );
    this.updateEmpty(modules);
    this.setValue.emit(modules);
  }

  // setId(i: number, event: DropdownChangeEvent): void {
  //   event.originalEvent.stopPropagation();
  //   const id = event.value as string;
  //   const modules = this.modules().map((m, j) =>
  //     i === j ? spread(m, { id }) : m,
  //   );
  //   this.setValue.emit(modules);
  // }

  removeEntry(i: number): void {
    const modules = this.modules().filter((_, j) => i !== j);
    this.updateEmpty(modules);
    this.setValue.emit(modules);
  }

  updateEmpty(modules: ModuleSettings[]): void {
    const slots = this.entity().modules;
    if (slots === true || slots == null) return;
    const sum = modules
      .map((m) => m.count)
      .filter(notNullish)
      .reduce((s, c) => s.add(c), rational.zero);
    if (sum.lt(slots)) {
      const toAdd = slots.sub(sum);
      const empty = modules.find((e) => e.id === ItemId.Module);
      if (empty) {
        empty.count = coalesce(empty.count, rational.zero).add(toAdd);
      } else {
        modules.push({ id: ItemId.Module, count: toAdd });
      }
    } else if (sum.gt(slots)) {
      const toSubtract = sum.sub(slots);
      const empty = modules.find((e) => e.id === ItemId.Module);
      if (empty) {
        empty.count = coalesce(empty.count, rational.zero).sub(toSubtract);
        if (empty.count.isZero()) modules.splice(modules.indexOf(empty), 1);
      }
    }
  }
}

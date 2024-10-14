import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { AppSharedModule } from '~/app-shared.module';
import { coalesce } from '~/helpers';
import {
  Category,
  Game,
  Item,
  ItemId,
  ItemSettings,
  MachineSettings,
} from '~/models';
import { Items, Machines } from '~/store';
import { DataSharedModule } from '../../data-shared.module';
import { DetailComponent } from '../../models';

@Component({
  standalone: true,
  imports: [AppSharedModule, DataSharedModule],
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemComponent extends DetailComponent {
  itemsStateRaw = this.store.selectSignal(Items.itemsState);
  itemsState = this.store.selectSignal(Items.getItemsState);
  machinesStateRaw = this.store.selectSignal(Machines.machinesState);
  machinesState = this.store.selectSignal(Machines.getMachinesState);

  obj = computed<Item | undefined>(() => this.data().itemEntities[this.id()]);
  breadcrumb = computed<MenuItem[]>(() => [
    this.parent(),
    { label: this.obj()?.name },
  ]);
  category = computed<Category | undefined>(() => {
    const id = this.id();
    const data = this.data();
    return data.categoryEntities[coalesce(data.itemEntities[id]?.category, '')];
  });
  recipes = computed(() => {
    const id = this.id();
    const data = this.data();
    const producedBy: string[] = [];
    const consumedBy: string[] = [];
    const producible: string[] = [];
    const unlocked: string[] = [];

    for (const r of data.recipeIds) {
      const recipe = data.recipeEntities[r];
      if (recipe.out[id]) producedBy.push(r);
      if (recipe.in[id]) consumedBy.push(r);
      if (recipe.producers.includes(id)) producible.push(r);
      if (
        (typeof recipe.unlockedBy === 'string' && recipe.unlockedBy === id) ||
        (typeof recipe.unlockedBy !== 'string' &&
          recipe.unlockedBy?.some((u) => u === id))
      )
        unlocked.push(r);
    }

    return { producedBy, consumedBy, producible, unlocked };
  });
  itemSettings = computed<ItemSettings | undefined>(
    () => this.itemsState()[this.id()],
  );
  machineSettings = computed<MachineSettings | undefined>(
    () => this.machinesState().entities[this.id()],
  );

  Game = Game;
  ItemId = ItemId;

  /** Action dispatch methods */
  setItemExcluded(id: string, value: boolean): void {
    this.store.dispatch(new Items.SetExcludedAction({ id, value }));
  }

  setItemChecked(id: string, value: boolean): void {
    this.store.dispatch(new Items.SetCheckedAction({ id, value }));
  }

  resetItem(value: string): void {
    this.store.dispatch(new Items.ResetItemAction(value));
  }

  resetMachine(value: string): void {
    this.store.dispatch(new Machines.ResetMachineAction(value));
  }
}

import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { CollectionTableComponent } from '~/components/collection-table/collection-table.component';
import { Category } from '~/models/data/category';
import { MenuItem } from '~/models/menu-item';
import { IconClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';

import { DetailComponent } from '../../models/detail.component';

@Component({
  selector: 'lab-category',
  standalone: true,
  imports: [CollectionTableComponent, IconClassPipe, TranslatePipe],
  templateUrl: './category.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent extends DetailComponent {
  obj = computed<Category | undefined>(
    () => this.data().categoryEntities[this.id()],
  );
  breadcrumb = computed<MenuItem[]>(() => [
    this.parent() ?? {},
    { label: this.obj()?.name },
  ]);
  itemIds = computed(() => {
    const data = this.data();
    const id = this.id();
    return data.itemIds.filter((i) => data.itemEntities[i].category === id);
  });
  recipeIds = computed(() => {
    const data = this.data();
    const id = this.id();
    return data.recipeIds.filter((r) => data.recipeEntities[r].category === id);
  });
}

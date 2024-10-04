import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CollectionItem } from '~/models/collection-item';
import { Category } from '~/models/data/category';
import { Item } from '~/models/data/item';
import { RecipeJson } from '~/models/data/recipe';
import { IdType } from '~/models/enum/id-type';
import { Entities } from '~/models/utils';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { SettingsService } from '~/store/settings.service';

type Entity = Category | Item | RecipeJson;

@Component({
  selector: 'lab-collection-table',
  standalone: true,
  imports: [FormsModule, RouterLink, IconSmClassPipe, TranslatePipe],
  templateUrl: './collection-table.component.html',
  styleUrls: ['./collection-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionTableComponent {
  settingsSvc = inject(SettingsService);

  ids = input.required<string[]>();
  type = input.required<IdType>();
  useRelativePath = input(false);

  options = this.settingsSvc.options;
  data = this.settingsSvc.dataset;

  route = computed(() => {
    const type = this.type();
    const useRelativePath = this.useRelativePath();

    if (useRelativePath) return '';

    switch (type) {
      case 'category':
        return '/data/categories/';
      case 'item':
        return '/data/items/';
      case 'recipe':
        return '/data/recipes/';
    }
  });

  value = computed((): CollectionItem[] => {
    const ids = this.ids();
    const type = this.type();
    const data = this.data();

    let entities: Entities<Entity>;
    switch (type) {
      case 'category':
        entities = data.categoryEntities;
        break;
      case 'item':
        entities = data.itemEntities;
        break;
      case 'recipe':
        entities = data.recipeEntities;
    }

    return ids
      .filter((i) => entities[i])
      .map((i) => {
        const entity = entities[i];
        const obj: CollectionItem = {
          id: entity.id,
          name: entity.name,
        };

        if (type !== 'category') {
          obj.category =
            data.categoryEntities[(entity as Item | RecipeJson).category];
        }

        return obj;
      });
  });
}

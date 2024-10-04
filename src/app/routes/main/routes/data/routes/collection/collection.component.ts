import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { CollectionTableComponent } from '~/components/collection-table/collection-table.component';
import { Dataset } from '~/models/dataset';
import { IdType } from '~/models/enum/id-type';
import { MenuItem } from '~/models/menu-item';
import { TranslateService } from '~/services/translate.service';
import { RecipesService } from '~/store/recipes.service';
import { SettingsService } from '~/store/settings.service';

@Component({
  selector: 'lab-collection',
  standalone: true,
  imports: [CollectionTableComponent],
  templateUrl: './collection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionComponent {
  route = inject(ActivatedRoute);
  recipesSvc = inject(RecipesService);
  settingsSvc = inject(SettingsService);
  translateSvc = inject(TranslateService);

  home = this.settingsSvc.modMenuItem;
  data = this.recipesSvc.adjustedDataset;

  label = input.required<string>();
  type = input.required<IdType>();
  key = input.required<keyof Dataset>();

  breadcrumb = toSignal(
    toObservable(this.label).pipe(
      switchMap((label) => this.translateSvc.get(label)),
      map((label): MenuItem[] => [{ label }]),
    ),
  );
  ids = computed<string[]>(() => this.data()[this.key()] as string[]);
}

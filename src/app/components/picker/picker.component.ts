import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Output,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FilterService, SelectItem } from 'primeng/api';

import { Category, Entities } from '~/models';
import { ContentService } from '~/services';
import { LabState, Recipes } from '~/store';
import { DialogComponent } from '../modal';

@Component({
  selector: 'lab-picker',
  templateUrl: './picker.component.html',
  styleUrls: ['./picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerComponent extends DialogComponent {
  filterSvc = inject(FilterService);
  store = inject(Store<LabState>);
  contentSvc = inject(ContentService);

  filterInput = viewChild.required<ElementRef<HTMLInputElement>>('filterInput');

  header = input('');
  @Output() selectId = new EventEmitter<string>();
  @Output() selectIds = new EventEmitter<string[]>();

  data = this.store.selectSignal(Recipes.getAdjustedDataset);

  search = '';
  allSelected = false;

  type: 'item' | 'recipe' = 'item';
  isMultiselect = false;
  selection: string | string[] | undefined;
  default: string | string[] | undefined;
  categoryEntities: Entities<Category> = {};
  categoryIds: string[] = [];
  categoryRows: Entities<string[][]> = {};
  // Preserve state prior to any filtering
  allSelectItems: SelectItem[] = [];
  allCategoryIds: string[] = [];
  allCategoryRows: Entities<string[][]> = {};
  activeIndex = 0;

  clickOpen(
    type: 'item' | 'recipe',
    allIds: string[],
    selection?: string | string[],
  ): void {
    const data = this.data();
    this.type = type;
    const allIdsSet = new Set(allIds);
    if (Array.isArray(selection)) {
      this.isMultiselect = true;
      this.selection = [...selection];
    } else {
      this.isMultiselect = false;
      this.selection = selection;
    }
    this.search = '';
    this.categoryEntities = data.categoryEntities;
    if (type === 'item') {
      this.categoryRows = {};
      data.categoryIds.forEach((c) => {
        if (data.categoryItemRows[c]) {
          this.categoryRows[c] = [];
          data.categoryItemRows[c].forEach((r) => {
            const row = r.filter((i) => allIdsSet.has(i));
            if (row.length) this.categoryRows[c].push(row);
          });
        }
      });

      this.allSelectItems = allIds.map(
        (i): SelectItem => ({
          label: data.itemEntities[i].name,
          value: i,
          title: data.itemEntities[i].category,
        }),
      );

      if (Array.isArray(selection)) {
        this.allSelected = selection.length === 0;
      } else if (selection != null) {
        const index = data.categoryIds.indexOf(
          data.itemEntities[selection].category,
        );
        this.activeIndex = index;
      }
    } else {
      this.categoryRows = {};
      data.categoryIds.forEach((c) => {
        if (data.categoryRecipeRows[c]) {
          this.categoryRows[c] = [];
          data.categoryRecipeRows[c].forEach((r) => {
            const row = r.filter((i) => allIdsSet.has(i));
            if (row.length) this.categoryRows[c].push(row);
          });
        }
      });

      this.allSelectItems = allIds.map(
        (i): SelectItem => ({
          label: data.recipeEntities[i].name,
          value: i,
          title: data.recipeEntities[i].category,
        }),
      );

      if (Array.isArray(selection)) {
        this.allSelected = selection.length === 0;
        this.default =
          data.defaults != null ? [...data.defaults.excludedRecipeIds] : [];
      } else if (selection) {
        const index = data.categoryIds.indexOf(
          data.recipeEntities[selection].category,
        );
        this.activeIndex = index;
      }
    }
    this.categoryIds = data.categoryIds.filter(
      (c) => this.categoryRows[c]?.length,
    );
    this.allCategoryIds = this.categoryIds;
    this.allCategoryRows = this.categoryRows;
    this.show();

    if (!this.contentSvc.isMobile()) {
      setTimeout(() => {
        this.filterInput().nativeElement.focus();
      });
    }
  }

  selectAll(value: boolean): void {
    if (value) {
      this.selection = [];
    } else {
      this.selection = this.allSelectItems.map((i) => i.value);
    }
  }

  reset(): void {
    this.selection = this.default;
  }

  clickId(id: string): void {
    if (Array.isArray(this.selection)) {
      const index = this.selection.indexOf(id);
      if (index === -1) {
        this.selection.push(id);
      } else {
        this.selection.splice(index, 1);
      }
      this.allSelected = this.selection.length === 0;
    } else {
      this.selectId.emit(id);
      this.visible = false;
    }
  }

  save(): void {
    if (Array.isArray(this.selection)) {
      this.selectIds.emit(this.selection);
    }
  }

  inputSearch(): void {
    if (!this.search) {
      this.categoryIds = this.allCategoryIds;
      this.categoryRows = this.allCategoryRows;
      return;
    }

    // Filter for matching item ids
    const filteredItems: SelectItem[] = this.filterSvc.filter(
      this.allSelectItems,
      ['label'],
      this.search,
      'contains',
    );

    // Filter for matching category ids
    // (Cache category on the SelectItem `title` field)
    this.categoryIds = this.allCategoryIds.filter((c) =>
      filteredItems.some((i) => i.title === c),
    );

    // Filter category rows
    this.categoryRows = {};
    const ids = filteredItems.map((i) => i.value);
    for (const c of this.categoryIds) {
      // Filter each category row
      this.categoryRows[c] = [];
      for (const r of this.allCategoryRows[c]) {
        this.categoryRows[c].push(r.filter((i) => ids.indexOf(i) !== -1));
      }
      // Filter out empty category rows
      this.categoryRows[c] = this.categoryRows[c].filter((r) => r.length > 0);
    }

    setTimeout(() => {
      // this.ref.markForCheck();
    });
  }
}

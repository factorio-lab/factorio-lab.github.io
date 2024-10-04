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
import { FormsModule } from '@angular/forms';

import { coalesce } from '~/helpers';
import { Category } from '~/models/data/category';
import { Option } from '~/models/option';
import { Entities } from '~/models/utils';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import { SettingsService } from '~/store/settings.service';

import { DialogComponent } from '../modal';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Component({
  selector: 'lab-picker',
  standalone: true,
  imports: [FormsModule, IconSmClassPipe, TooltipComponent, TranslatePipe],
  templateUrl: './picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerComponent extends DialogComponent {
  contentSvc = inject(ContentService);
  settingsSvc = inject(SettingsService);

  filterInput = viewChild.required<ElementRef<HTMLInputElement>>('filterInput');

  header = input('');
  @Output() selectId = new EventEmitter<string>();
  @Output() selectIds = new EventEmitter<Set<string>>();

  data = this.settingsSvc.dataset;

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
  allSelectItems: Option[] = [];
  allCategoryIds: string[] = [];
  allCategoryRows: Entities<string[][]> = {};
  activeIndex = 0;

  clickOpen(
    type: 'item' | 'recipe',
    allIds: string[],
    selection?: string | string[] | Set<string>,
  ): void {
    const data = this.data();
    this.type = type;
    const allIdsSet = new Set(allIds);
    if (selection instanceof Set) selection = Array.from(selection);
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
        (i): Option => ({
          label: data.itemEntities[i].name,
          value: i,
          category: data.itemEntities[i].category,
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
        (i): Option => ({
          label: data.recipeEntities[i].name,
          value: i,
          category: data.recipeEntities[i].category,
        }),
      );

      if (Array.isArray(selection)) {
        this.allSelected = selection.length === 0;
        this.default = [...coalesce(data.defaults?.excludedRecipeIds, [])];
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
      this.selectIds.emit(new Set(this.selection));
    }
  }

  inputSearch(): void {
    if (!this.search) {
      this.categoryIds = this.allCategoryIds;
      this.categoryRows = this.allCategoryRows;
      return;
    }

    // Filter for matching item ids
    // TODO: Implement filter service
    const filteredItems = this.allSelectItems;
    // const filteredItems = this.filterSvc.filter(
    //   this.allSelectItems,
    //   ['label'],
    //   this.search,
    //   'contains',
    // ) as SelectItem<string>[];

    // Filter for matching category ids
    // (Cache category on the SelectItem `title` field)
    this.categoryIds = this.allCategoryIds.filter((c) =>
      filteredItems.some((i) => i.category === c),
    );

    // Filter category rows
    this.categoryRows = {};
    const ids = filteredItems.map((i) => i.value);
    for (const c of this.categoryIds) {
      // Filter each category row
      this.categoryRows[c] = [];
      for (const r of this.allCategoryRows[c])
        this.categoryRows[c].push(r.filter((i) => ids.includes(i)));

      // Filter out empty category rows
      this.categoryRows[c] = this.categoryRows[c].filter((r) => r.length > 0);
    }
  }
}

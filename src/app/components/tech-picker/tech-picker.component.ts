import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { first } from 'rxjs';

import { Game } from '~/models/enum/game';
import { Optional } from '~/models/utils';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import { TranslateService } from '~/services/translate.service';
import { PreferencesService } from '~/store/preferences.service';
import { SettingsService } from '~/store/settings.service';

import { DialogComponent } from '../modal';
import { TooltipComponent } from '../tooltip/tooltip.component';

export type UnlockStatus = 'available' | 'locked' | 'researched';

@Component({
  selector: 'lab-tech-picker',
  standalone: true,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    IconSmClassPipe,
    TooltipComponent,
    TranslatePipe,
  ],
  templateUrl: './tech-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechPickerComponent extends DialogComponent {
  contentSvc = inject(ContentService);
  preferencesSvc = inject(PreferencesService);
  settingsSvc = inject(SettingsService);
  translateSvc = inject(TranslateService);

  filterInput = viewChild.required<ElementRef<HTMLInputElement>>('filterInput');

  @Output() selectIds = new EventEmitter<Optional<Set<string>>>();

  data = this.settingsSvc.dataset;
  showTechLabels = this.preferencesSvc.showTechLabels;

  filter = signal('');
  selection = signal<string[]>([]);

  allSelected = computed(
    () => this.selection().length === this.data().technologyIds.length,
  );
  status = computed(() => {
    const data = this.data();
    const filter = this.filter();
    let selection = this.selection();
    const set = new Set(selection);
    const available: string[] = [];
    const locked: string[] = [];

    let technologyIds = data.technologyIds;
    if (filter) {
      const technologies = technologyIds.map((i) => data.itemEntities[i]);
      // TODO: Implement filter service
      const filtered = technologies;
      // const filtered = this.filterSvc.filter(
      //   technologies,
      //   ['name'],
      //   filter,
      //   'contains',
      // ) as Item[];
      technologyIds = filtered.map((t) => t.id);

      selection = selection.filter((i) => technologyIds.includes(i));
    }

    const researched = selection;
    for (const id of technologyIds) {
      if (!set.has(id)) {
        const tech = data.technologyEntities[id];

        if (
          tech.prerequisites == null ||
          tech.prerequisites.every((p) => set.has(p))
        ) {
          available.push(id);
        } else {
          locked.push(id);
        }
      }
    }

    return { available, locked, researched };
  });

  importVisible = false;
  importValue = '';

  Game = Game;

  clickOpen(selection: Set<string>): void {
    this.selection.set(Array.from(selection));
    this.show();

    if (!this.contentSvc.isMobile()) {
      setTimeout(() => {
        this.filterInput().nativeElement.focus();
      });
    }
  }

  selectAll(value: boolean): void {
    this.selection.set(value ? [...this.data().technologyIds] : []);
  }

  openImport(input: HTMLTextAreaElement): void {
    this.importVisible = true;
    this.importValue = '';
    setTimeout(() => {
      input.focus();
    });
  }

  copyScriptToClipboard(): void {
    const script = `/c local list = {}
for _, tech in pairs(game.player.force.technologies) do
    if tech.researched then
        list[#list + 1] = tech.name
    end
end
game.write_file("techs.txt", table.concat(list, ","))
`;
    void window.navigator.clipboard.writeText(script);
    this.translateSvc
      .get('techPicker.exportScriptCopied')
      .pipe(first())
      .subscribe((detail) => {
        this.contentSvc.toast({
          severity: 'success',
          detail,
          contentStyleClass: 'detail-only',
        });
      });
  }

  importTechs(): void {
    const selection = this.importValue
      .split(',')
      .map((v) => v.trim())
      .map((id) => {
        if (!id) return '';

        const alt = `${id}-technology`;
        if (this.data().technologyIds.includes(alt)) {
          return alt;
        } else if (this.data().technologyIds.includes(id)) {
          return id;
        }

        return '';
      })
      .filter((v) => !!v);

    const set = new Set(selection);
    this.addPrerequisites(set);

    this.selection.set(Array.from(set));
    this.importValue = '';
    this.importVisible = false;
  }

  clickId(id: string): void {
    const set = new Set(this.selection());
    if (set.has(id)) {
      set.delete(id);

      // Filter out any technologies whose prerequisites are no longer met
      let removeIds: Set<string>;
      do {
        removeIds = new Set<string>();

        for (const id of set) {
          const tech = this.data().technologyEntities[id];
          if (tech.prerequisites?.some((p) => !set.has(p))) removeIds.add(id);
        }

        removeIds.forEach((i) => set.delete(i));
      } while (removeIds.size);
    } else {
      set.add(id);

      this.addPrerequisites(set);
    }

    this.selection.set(Array.from(set));
  }

  // Add any technologies whose prerequisites were not previously met
  addPrerequisites(set: Set<string>): void {
    let addIds: Set<string>;
    do {
      addIds = new Set<string>();

      for (const id of set) {
        const tech = this.data().technologyEntities[id];
        tech.prerequisites
          ?.filter((p) => !set.has(p))
          .forEach((p) => addIds.add(p));
      }

      addIds.forEach((i) => set.add(i));
    } while (addIds.size);
  }

  save(): void {
    const selection = this.selection();
    const data = this.data();
    if (selection.length === data.technologyIds.length)
      this.selectIds.emit(undefined);

    this.selectIds.emit(new Set(selection));
  }
}

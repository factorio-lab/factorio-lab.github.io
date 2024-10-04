import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MenuItem } from '~/models/menu-item';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { SettingsService } from '~/store/settings.service';

@Component({
  selector: 'lab-data',
  standalone: true,
  imports: [KeyValuePipe, TranslatePipe],
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataComponent {
  settingsSvc = inject(SettingsService);

  home = this.settingsSvc.modMenuItem;
  data = this.settingsSvc.dataset;

  collections: MenuItem[] = [
    {
      label: 'data.categories',
      routerLink: 'categories',
      id: 'categoryIds',
    },
    {
      label: 'data.items',
      routerLink: 'items',
      id: 'itemIds',
    },
    {
      label: 'data.beacons',
      routerLink: 'beacons',
      id: 'beaconIds',
    },
    {
      label: 'data.belts',
      routerLink: 'belts',
      id: 'beltIds',
    },
    {
      label: 'data.cargoWagons',
      routerLink: 'cargo-wagons',
      id: 'cargoWagonIds',
    },
    {
      label: 'data.fluidWagons',
      routerLink: 'fluid-wagons',
      id: 'fluidWagonIds',
    },
    {
      label: 'data.fuels',
      routerLink: 'fuels',
      id: 'fuelIds',
    },
    {
      label: 'data.machines',
      routerLink: 'machines',
      id: 'machineIds',
    },
    {
      label: 'data.modules',
      routerLink: 'modules',
      id: 'moduleIds',
    },
    {
      label: 'data.pipes',
      routerLink: 'pipes',
      id: 'pipeIds',
    },
    {
      label: 'data.technologies',
      routerLink: 'technologies',
      id: 'technologyIds',
    },
    {
      label: 'data.recipes',
      routerLink: 'recipes',
      id: 'recipeIds',
    },
  ];
}

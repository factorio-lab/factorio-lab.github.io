import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PickerComponent } from '~/components';
import {
  Game,
  gameInfo,
  gameOptions,
  Objective,
  ObjectiveType,
  ObjectiveUnit,
  rational,
} from '~/models';
import { IconSmClassPipe, TranslatePipe } from '~/pipes';
import { ContentService, RouterService } from '~/services';
import { Objectives, Preferences, Recipes, Settings } from '~/store';
import { BrowserUtility } from '~/utilities';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    DropdownModule,
    ProgressSpinnerModule,
    IconSmClassPipe,
    PickerComponent,
    TranslatePipe,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  router = inject(Router);
  contentSvc = inject(ContentService);
  store = inject(Store);
  routerSvc = inject(RouterService);
  route = inject(ActivatedRoute);

  itemIds = this.store.selectSignal(Recipes.selectAvailableItems);
  settings = this.store.selectSignal(Settings.selectSettings);
  modOptions = this.store.selectSignal(Settings.selectModOptions);
  data = this.store.selectSignal(Settings.selectDataset);
  mod = this.store.selectSignal(Settings.selectMod);
  recipeIds = this.store.selectSignal(Settings.selectAvailableRecipes);
  savedStates = this.store.selectSignal(Settings.selectSavedStates);
  preferences = this.store.selectSignal(Preferences.preferencesState);

  gameInfo = gameInfo;
  gameOptions = gameOptions;

  Game = Game;
  BrowserUtility = BrowserUtility;

  selectItem(targetId: string): void {
    this.createObjective({
      id: '0',
      targetId,
      value: rational.one,
      unit: ObjectiveUnit.Items,
      type: ObjectiveType.Output,
    });
    this.router.navigate(['list'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  selectRecipe(targetId: string): void {
    this.createObjective({
      id: '0',
      targetId,
      value: rational.one,
      unit: ObjectiveUnit.Machines,
      type: ObjectiveType.Output,
    });
    this.router.navigate(['list'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  setState(query: string): void {
    if (!query) return;
    this.router.navigate(['list'], {
      queryParams: this.routerSvc.toParams(query),
      relativeTo: this.route,
    });
  }

  setGame(game: Game): void {
    this.setMod(gameInfo[game].modId);
  }

  /** Action Dispatch Methods */
  setMod(modId: string): void {
    this.store.dispatch(Settings.setMod({ modId }));
  }

  createObjective(objective: Objective): void {
    this.store.dispatch(Objectives.create({ objective }));
  }

  setBypassLanding(bypassLanding: boolean): void {
    this.store.dispatch(Preferences.setBypassLanding({ bypassLanding }));
  }
}

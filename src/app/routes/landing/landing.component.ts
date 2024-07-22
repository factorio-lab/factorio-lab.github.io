import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { AppSharedModule } from '~/app-shared.module';
import {
  Game,
  gameInfo,
  gameOptions,
  ObjectiveBase,
  ObjectiveUnit,
} from '~/models';
import { ContentService, RouterService } from '~/services';
import { LabState, Objectives, Preferences, Recipes, Settings } from '~/store';
import { BrowserUtility } from '~/utilities';

@Component({
  standalone: true,
  imports: [AppSharedModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  router = inject(Router);
  contentSvc = inject(ContentService);
  store = inject(Store<LabState>);
  routerSvc = inject(RouterService);

  itemIds = this.store.selectSignal(Recipes.getAvailableItems);
  settings = this.store.selectSignal(Settings.getSettings);
  modOptions = this.store.selectSignal(Settings.getModOptions);
  data = this.store.selectSignal(Settings.getDataset);
  mod = this.store.selectSignal(Settings.getMod);
  recipeIds = this.store.selectSignal(Settings.getAvailableRecipes);
  savedStates = this.store.selectSignal(Settings.getSavedStates);
  preferences = this.store.selectSignal(Preferences.preferencesState);

  gameInfo = gameInfo;
  gameOptions = gameOptions;

  Game = Game;
  BrowserUtility = BrowserUtility;

  async selectItem(value: string): Promise<void> {
    await this.router.navigate(['list']);
    this.addItemObjective(value);
  }

  async selectRecipe(value: string): Promise<void> {
    await this.router.navigate(['list']);
    this.addRecipeObjective(value);
  }

  setState(query: string): void {
    if (query) {
      const queryParams = this.routerSvc.getParams(query);
      this.router.navigate(['list'], { queryParams });
    }
  }

  setGame(game: Game): void {
    this.setMod(gameInfo[game].modId);
  }

  addItemObjective(targetId: string): void {
    this.addObjective({ targetId, unit: ObjectiveUnit.Items });
  }

  addRecipeObjective(targetId: string): void {
    this.addObjective({ targetId, unit: ObjectiveUnit.Machines });
  }

  /** Action Dispatch Methods */
  setMod(value: string): void {
    this.store.dispatch(new Settings.SetModAction(value));
  }

  addObjective(value: ObjectiveBase): void {
    this.store.dispatch(new Objectives.AddAction(value));
  }

  setBypassLanding(value: boolean): void {
    this.store.dispatch(new Preferences.SetBypassLandingAction(value));
  }
}

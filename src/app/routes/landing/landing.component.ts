import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PickerComponent } from '~/components/picker/picker.component';
import { Game, gameOptions } from '~/models/enum/game';
import { ObjectiveType } from '~/models/enum/objective-type';
import { ObjectiveUnit } from '~/models/enum/objective-unit';
import { gameInfo } from '~/models/game-info';
import { modOptions } from '~/models/options';
import { rational } from '~/models/rational';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import { RouterService } from '~/services/router.service';
import { ObjectivesService } from '~/store/objectives.service';
import { PreferencesService } from '~/store/preferences.service';
import { RecipesService } from '~/store/recipes.service';
import { SettingsService } from '~/store/settings.service';

@Component({
  selector: 'lab-landing',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    RouterLink,
    IconSmClassPipe,
    PickerComponent,
    TranslatePipe,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center justify-center h-dvh' },
})
export class LandingComponent {
  router = inject(Router);
  route = inject(ActivatedRoute);
  contentSvc = inject(ContentService);
  objectivesSvc = inject(ObjectivesService);
  preferencesSvc = inject(PreferencesService);
  recipesSvc = inject(RecipesService);
  routerSvc = inject(RouterService);
  settingsSvc = inject(SettingsService);

  modId = this.settingsSvc.modId;
  mod = this.settingsSvc.mod;
  data = this.settingsSvc.dataset;
  recipeIds = this.settingsSvc.availableRecipeIds;
  itemIds = this.recipesSvc.availableItemIds;
  states = this.settingsSvc.gameStates;
  stateOptions = this.settingsSvc.stateOptions;

  gameInfo = gameInfo;
  gameOptions = gameOptions;
  modOptions = modOptions;

  Game = Game;

  selectItem(targetId: string): void {
    this.objectivesSvc.create({
      targetId,
      value: rational.one,
      unit: ObjectiveUnit.Items,
      type: ObjectiveType.Output,
    });
    void this.router.navigate(['list'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  selectRecipe(targetId: string): void {
    this.objectivesSvc.create({
      targetId,
      value: rational.one,
      unit: ObjectiveUnit.Machines,
      type: ObjectiveType.Output,
    });
    void this.router.navigate(['list'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  setState(query: string): void {
    if (!query) return;
    void this.router.navigate(['list'], {
      queryParams: this.routerSvc.toParams(query),
      relativeTo: this.route,
    });
  }

  setGame(game: Game): void {
    this.setMod(gameInfo[game].modId);
  }

  setMod(modId: string): void {
    void this.router.navigate([modId]);
  }
}

import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputNumberComponent } from '~/components/input-number/input-number.component';
import { coalesce, updateSetIds } from '~/helpers';
import { Recipe } from '~/models/data/recipe';
import { Game } from '~/models/enum/game';
import { MenuItem } from '~/models/menu-item';
import { RecipeState } from '~/models/settings/recipe-settings';
import { IconClassPipe, IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { RoundPipe } from '~/pipes/round.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { UsagePipe } from '~/pipes/usage.pipe';

import { DetailComponent } from '../../models/detail.component';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    IconClassPipe,
    IconSmClassPipe,
    InputNumberComponent,
    RoundPipe,
    TranslatePipe,
    UsagePipe,
  ],
  templateUrl: './recipe.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeComponent extends DetailComponent {
  recipesStateRaw = this.recipesSvc.state;
  recipesState = this.recipesSvc.settings;
  settings = this.settingsSvc.settings;

  obj = computed<Recipe | undefined>(
    () => this.data().recipeEntities[this.id()],
  );
  breadcrumb = computed((): MenuItem[] => [
    this.parent() ?? {},
    { label: this.obj()?.name },
  ]);
  info = computed(() => {
    const id = this.id();
    const data = this.data();
    const recipe = data.recipeEntities[id];
    return {
      category: data.categoryEntities[coalesce(recipe?.category, '')],
      ingredientIds: Object.keys(recipe?.in ?? {}),
      catalystIds: Object.keys(recipe?.catalyst ?? {}),
      productIds: Object.keys(recipe?.out ?? {}),
    };
  });
  recipeSettings = computed<RecipeState | undefined>(
    () => this.recipesState()[this.id()],
  );
  recipeR = computed<Recipe | undefined>(
    () => this.data().adjustedRecipe[this.id()],
  );

  Game = Game;

  changeExcluded(excluded: boolean): void {
    const value = updateSetIds(
      this.id(),
      excluded,
      this.settings().excludedRecipeIds,
    );
    this.settingsSvc.updateField(
      'excludedRecipeIds',
      value,
      this.settings().defaultExcludedRecipeIds,
    );
  }

  changeChecked(value: boolean): void {
    const checkedRecipeIds = updateSetIds(
      this.id(),
      value,
      this.settings().checkedRecipeIds,
    );
    this.settingsSvc.apply({ checkedRecipeIds });
  }
}

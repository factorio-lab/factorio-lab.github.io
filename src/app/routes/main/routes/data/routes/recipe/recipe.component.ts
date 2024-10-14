import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { AppSharedModule } from '~/app-shared.module';
import { coalesce } from '~/helpers';
import { Game, Rational, Recipe, RecipeSettings } from '~/models';
import { Recipes } from '~/store';
import { DetailComponent } from '../../models';

@Component({
  standalone: true,
  imports: [AppSharedModule],
  templateUrl: './recipe.component.html',
  styleUrls: ['./recipe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeComponent extends DetailComponent {
  recipesStateRaw = this.store.selectSignal(Recipes.recipesState);
  recipesState = this.store.selectSignal(Recipes.getRecipesState);

  obj = computed<Recipe | undefined>(
    () => this.data().recipeEntities[this.id()],
  );
  breadcrumb = computed<MenuItem[]>(() => [
    this.parent(),
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
  recipeSettings = computed<RecipeSettings | undefined>(
    () => this.recipesState()[this.id()],
  );
  recipeR = computed<Recipe | undefined>(
    () => this.data().adjustedRecipe[this.id()],
  );

  Game = Game;

  toggleRecipe(): void {
    const recipeSettings = this.recipeSettings();
    if (recipeSettings == null) return;

    const id = this.id();
    const value = !recipeSettings.excluded;
    const def = coalesce(this.data().defaults?.excludedRecipeIds, []).some(
      (i) => i === id,
    );
    this.setRecipeExcluded(id, value, def);
  }

  /** Action dispatch methods */
  setRecipeExcluded(id: string, value: boolean, def: boolean): void {
    this.store.dispatch(new Recipes.SetExcludedAction({ id, value, def }));
  }

  setRecipeChecked(id: string, value: boolean): void {
    this.store.dispatch(new Recipes.SetCheckedAction({ id, value }));
  }

  setRecipeCost(id: string, value: Rational): void {
    this.store.dispatch(new Recipes.SetCostAction({ id, value }));
  }

  resetRecipe(value: string): void {
    this.store.dispatch(new Recipes.ResetRecipeAction(value));
  }
  asArray(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
  }
}

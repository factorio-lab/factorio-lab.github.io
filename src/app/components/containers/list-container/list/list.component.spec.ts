import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { StoreModule } from '@ngrx/store';

import * as Mocks from 'src/mocks';
import { IconComponent, SelectComponent } from '~/components';
import { Step, ItemId } from '~/models';
import { RouterService } from '~/services/router.service';
import { reducers, metaReducers } from '~/store';
import { DatasetState } from '~/store/dataset';
import { ItemsState } from '~/store/items';
import { RecipesState } from '~/store/recipes';
import { RecipeUtility } from '~/utilities';
import { TestUtility } from '~/utilities/test';
import { ListComponent } from './list.component';

@Component({
  selector: 'lab-test-list',
  template: `
    <lab-list
      [data]="data"
      [itemSettings]="itemSettings"
      [recipeSettings]="recipeSettings"
      [recipeRaw]="recipeRaw"
      [steps]="steps"
      [itemPrecision]="itemPrecision"
      [beltPrecision]="beltPrecision"
      [factoryPrecision]="factoryPrecision"
      (ignoreItem)="ignoreItem($event)"
      (setBelt)="setBelt($event)"
      (setFactory)="setFactory($event)"
      (setModules)="setModules($event)"
      (setBeaconModule)="setBeaconModule($event)"
      (setBeaconCount)="setBeaconCount($event)"
      (resetItem)="resetItem($event)"
      (resetRecipe)="resetRecipe($event)"
      (resetIgnore)="resetIgnore()"
      (resetBelt)="resetBelt()"
      (resetFactory)="resetFactory()"
      (resetModules)="resetModules()"
      (resetBeacons)="resetBeacons()"
    >
    </lab-list>
  `,
})
class TestListComponent {
  @ViewChild(ListComponent) child: ListComponent;
  data: DatasetState = Mocks.Data;
  itemSettings: ItemsState = Mocks.ItemSettingsInitial;
  recipeSettings: RecipesState = Mocks.RecipeSettingsInitial;
  recipeRaw: RecipesState = Mocks.RecipeSettingsEntities;
  steps: Step[] = Mocks.Steps;
  itemPrecision = null;
  beltPrecision = 0;
  factoryPrecision = 1;
  ignoreItem(data) {}
  setBelt(data) {}
  setFactory(data) {}
  setModules(data) {}
  setBeaconModule(data) {}
  setBeaconCount(data) {}
  resetItem(data) {}
  resetRecipe(data) {}
  resetIgnore() {}
  resetBelt() {}
  resetFactory() {}
  resetModules() {}
  resetBeacons() {}
}

describe('ListComponent', () => {
  let component: TestListComponent;
  let fixture: ComponentFixture<TestListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        IconComponent,
        SelectComponent,
        ListComponent,
        TestListComponent,
      ],
      imports: [
        RouterTestingModule,
        StoreModule.forRoot(reducers, { metaReducers }),
      ],
      providers: [RouterService],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TestListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set a specific factory module', () => {
    spyOn(component, 'setModules');
    TestUtility.clickSelector(fixture, '.list-edit-factory-module', 1);
    fixture.detectChanges();
    TestUtility.clickSelector(fixture, 'lab-select lab-icon', 1);
    fixture.detectChanges();
    expect(component.setModules).toHaveBeenCalledWith([
      Mocks.Step1.itemId,
      [
        ItemId.SpeedModule3,
        ItemId.SpeedModule,
        ItemId.SpeedModule3,
        ItemId.SpeedModule3,
      ],
    ]);
  });

  it('should set all factory modules', () => {
    spyOn(component, 'setModules');
    TestUtility.clickSelector(fixture, '.list-edit-factory-module', 0);
    fixture.detectChanges();
    TestUtility.clickSelector(fixture, 'lab-select lab-icon', 1);
    fixture.detectChanges();
    expect(component.setModules).toHaveBeenCalledWith([
      Mocks.Step1.itemId,
      [
        ItemId.SpeedModule,
        ItemId.SpeedModule,
        ItemId.SpeedModule,
        ItemId.SpeedModule,
      ],
    ]);
  });

  it('should set beacon count', () => {
    spyOn(component, 'setBeaconCount');
    TestUtility.selectSelector(fixture, 'input', '24');
    fixture.detectChanges();
    expect(component.setBeaconCount).toHaveBeenCalledWith([
      Mocks.Step1.itemId,
      24,
    ]);
  });

  it('should not set beacon count on invalid event', () => {
    spyOn(component, 'setBeaconCount');
    const event = { target: {} };
    component.child.beaconCountChange(Mocks.Step1.itemId as any, event);
    expect(component.setBeaconCount).not.toHaveBeenCalled();
  });

  it('should not set beacon count if unchanged', () => {
    spyOn(component, 'setBeaconCount');
    TestUtility.selectSelector(fixture, 'input', '16');
    fixture.detectChanges();
    expect(component.setBeaconCount).not.toHaveBeenCalled();
  });

  it('should reset a step', () => {
    spyOn(component, 'resetItem');
    spyOn(component, 'resetRecipe');
    TestUtility.clickSelector(fixture, '.list-step-reset', 0);
    fixture.detectChanges();
    expect(component.resetItem).toHaveBeenCalled();
    expect(component.resetRecipe).toHaveBeenCalled();
  });

  describe('findStep', () => {
    it('should find the step with the passed item id', () => {
      const result = component.child.findStep(Mocks.Steps[0].itemId);
      expect(result).toEqual(Mocks.Steps[0]);
    });
  });

  describe('prodAllowed', () => {
    it('should look up whether prod is allowed for a step', () => {
      spyOn(RecipeUtility, 'moduleAllowed').and.callThrough();
      const result = component.child.prodAllowed(Mocks.Steps[0]);
      expect(RecipeUtility.moduleAllowed).toHaveBeenCalled();
      expect(result).toEqual(false);
    });
  });
});

import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';

import { DispatchTest, ItemId, RecipeId, TestModule } from 'src/tests';
import { Game, ObjectiveUnit } from '~/models';
import { LabState, Objectives, Preferences, Settings } from '~/store';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let mockStore: MockStore<LabState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestModule, LandingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    mockStore = TestBed.inject(MockStore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // describe('selectItem', () => {
  //   it('should add an item objective and navigate to the list', fakeAsync(() => {
  //     spyOn(component, 'addItemObjective');
  //     spyOn(component.router, 'navigate').and.returnValue(
  //       Promise.resolve(true),
  //     );
  //     component.selectItem(ItemId.IronPlate);
  //     tick();
  //     expect(component.addItemObjective).toHaveBeenCalledWith(ItemId.IronPlate);
  //     expect(component.router.navigate).toHaveBeenCalledWith(['list']);
  //   }));
  // });

  // describe('selectRecipe', () => {
  //   it('should add a recipe objective and navigate to the list', fakeAsync(() => {
  //     spyOn(component, 'addRecipeObjective');
  //     spyOn(component.router, 'navigate').and.returnValue(
  //       Promise.resolve(true),
  //     );
  //     component.selectRecipe(RecipeId.IronPlate);
  //     tick();
  //     expect(component.addRecipeObjective).toHaveBeenCalledWith(
  //       ItemId.IronPlate,
  //     );
  //     expect(component.router.navigate).toHaveBeenCalledWith(['list']);
  //   }));
  // });

  // describe('setState', () => {
  //   it('should call the router to navigate', () => {
  //     spyOn(component.router, 'navigate');
  //     component.setState('z=zip');
  //     expect(component.router.navigate).toHaveBeenCalledWith(['list'], {
  //       queryParams: { z: 'zip' },
  //     });
  //   });
  // });

  describe('setGame', () => {
    it('should map a game to its default mod id', () => {
      spyOn(component, 'setMod');
      component.setGame(Game.Factorio);
      expect(component.setMod).toHaveBeenCalledWith('1.1');
    });
  });

  describe('addItemObjective', () => {
    it('should use ObjectiveUnit.Items', () => {
      spyOn(component, 'addObjective');
      component.addItemObjective(ItemId.AdvancedCircuit);
      expect(component.addObjective).toHaveBeenCalledWith({
        targetId: ItemId.AdvancedCircuit,
        unit: ObjectiveUnit.Items,
      });
    });
  });

  describe('addRecipeObjective', () => {
    it('should use ObjectiveUnit.Machines', () => {
      spyOn(component, 'addObjective');
      component.addRecipeObjective(RecipeId.AdvancedCircuit);
      expect(component.addObjective).toHaveBeenCalledWith({
        targetId: RecipeId.AdvancedCircuit,
        unit: ObjectiveUnit.Machines,
      });
    });
  });

  it('should dispatch actions', () => {
    const dispatch = new DispatchTest(mockStore, component);
    dispatch.props('setMod', Settings.setMod);
    dispatch.props('addObjective', Objectives.add);
    dispatch.props('setBypassLanding', Preferences.setBypassLanding);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemId, Mocks, RecipeId, TestModule } from 'src/tests';
import { AppSharedModule } from '~/app-shared.module';
import { rational } from '~/models';
import { ModulesOverlayComponent } from './modules-overlay.component';

describe('ModulesOverlayComponent', () => {
  let component: ModulesOverlayComponent;
  let fixture: ComponentFixture<ModulesOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModulesOverlayComponent],
      imports: [AppSharedModule, TestModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ModulesOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('show', () => {
    it('should show the overlay', () => {
      const event = {} as any;
      spyOn(component as any, '_show');
      component.show(
        event,
        Mocks.ModuleSettings,
        Mocks.Dataset.machineEntities[ItemId.AssemblingMachine3],
        RecipeId.AdvancedCircuit,
      );
      expect(component.machine()).toEqual(
        Mocks.Dataset.machineEntities[ItemId.AssemblingMachine3],
      );
      expect(component.modules()).toEqual(Mocks.ModuleSettings);
      expect(component.modules()).not.toBe(Mocks.ModuleSettings);
      expect(component.recipeId()).toEqual(RecipeId.AdvancedCircuit);
      expect(component['_show']).toHaveBeenCalledWith(event);
    });
  });

  describe('save', () => {
    it('should emit a list filtered for nonzero module entries', () => {
      spyOn(component.setValue, 'emit');
      component.modules.set([
        { id: ItemId.ProductivityModule, count: rational(0n) },
      ]);
      component.save();
      expect(component.setValue.emit).toHaveBeenCalledWith([]);
    });
  });
});

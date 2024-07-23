import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemId, Mocks, TestModule, TestUtility } from 'src/tests';
import { ModuleSettings, rational } from '~/models';
import { ModulesComponent } from './modules.component';

describe('ModulesComponent', () => {
  let component: ModulesComponent;
  let fixture: ComponentFixture<ModulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModulesComponent],
      imports: [TestModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ModulesComponent);
    component = fixture.componentInstance;
    TestUtility.setInputs(fixture, {
      entity: Mocks.Dataset.machineEntities[ItemId.AssemblingMachine3],
      modules: Mocks.ModuleSettings,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('maximum', () => {
    it('should return null for machines with unlimited modules', () => {
      fixture.componentRef.setInput('entity', {
        ...Mocks.Dataset.machineEntities[ItemId.AssemblingMachine3],
        ...{ modules: true },
      });
      fixture.detectChanges();
      expect(component.maximum()).toEqual([null, null]);
    });
  });

  describe('setCount', () => {
    it('should update module count at an index and emit the new collection', () => {
      spyOn(component, 'updateEmpty');
      spyOn(component.setValue, 'emit');
      component.setCount(0, rational(2n));
      expect(component.updateEmpty).toHaveBeenCalled();
      expect(component.setValue.emit).toHaveBeenCalled();
    });
  });

  describe('setCount', () => {
    it('should update module id at an index and emit the new collection', () => {
      const originalEvent = { stopPropagation: (): void => {} };
      const value = ItemId.ProductivityModule;
      spyOn(originalEvent, 'stopPropagation');
      spyOn(component.setValue, 'emit');
      component.setId(0, { originalEvent, value } as any);
      expect(originalEvent.stopPropagation).toHaveBeenCalled();
      expect(component.setValue.emit).toHaveBeenCalled();
    });
  });

  describe('removeEntry', () => {
    it('should remove the entry at an index and emit the new collection', () => {
      spyOn(component, 'updateEmpty');
      spyOn(component.setValue, 'emit');
      component.removeEntry(0);
      expect(component.updateEmpty).toHaveBeenCalled();
      expect(component.setValue.emit).toHaveBeenCalled();
    });
  });

  describe('updateEmpty', () => {
    it('should immediately return if modules are disallowed or unlimited', () => {
      const modules = Mocks.ModuleSettings.map((m) => ({ ...m }));
      spyOn(component, 'entity').and.returnValues(
        { modules: true },
        { modules: undefined },
      );
      component.updateEmpty(modules);
      component.updateEmpty(modules);
      expect(modules).toEqual(Mocks.ModuleSettings);
    });

    it('should increase the count of empty module slots', () => {
      const modules: ModuleSettings[] = [
        { id: ItemId.Module, count: rational(0n) },
      ];
      component.updateEmpty(modules);
      expect(modules[0].count).toEqual(rational(4n));
    });

    it('should add an entry for empty module slots', () => {
      const modules: ModuleSettings[] = [];
      component.updateEmpty(modules);
      expect(modules[0].count).toEqual(rational(4n));
    });

    it('should decrease the count of empty module slots', () => {
      const modules: ModuleSettings[] = [
        { id: ItemId.Module, count: rational(8n) },
      ];
      component.updateEmpty(modules);
      expect(modules[0].count).toEqual(rational(4n));
    });

    it('should remove the entry for empty module slots', () => {
      const modules: ModuleSettings[] = [
        { id: ItemId.SpeedModule, count: rational(4n) },
        { id: ItemId.Module, count: rational(8n) },
      ];
      component.updateEmpty(modules);
      expect(modules).toEqual([
        { id: ItemId.SpeedModule, count: rational(4n) },
      ]);
    });
  });
});

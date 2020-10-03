import { Component, ViewChild, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestUtility } from 'src/tests';
import { IconComponent } from '../icon/icon.component';
import { MultiselectComponent } from './multiselect.component';

@Component({
  selector: 'lab-test-multiselect',
  template: `
    <lab-multiselect
      [header]="header"
      [enabledIds]="enabledIds"
      [options]="options"
      [parent]="element.nativeElement"
      (cancel)="cancel()"
      (commit)="commit($event)"
    >
    </lab-multiselect>
  `,
})
class TestMultiselectComponent {
  @ViewChild(MultiselectComponent) child: MultiselectComponent;
  header = 'Header';
  enabledIds = ['1'];
  options = [
    { id: '1', name: 'name1' },
    { id: '2', name: 'name2' },
  ];
  cancel() {}
  commit(data) {}

  constructor(public element: ElementRef) {}
}

describe('MultiselectComponent', () => {
  let component: TestMultiselectComponent;
  let fixture: ComponentFixture<TestMultiselectComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [
        IconComponent,
        MultiselectComponent,
        TestMultiselectComponent,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestMultiselectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set top based on parent', () => {
    component.child.parent = { getBoundingClientRect: () => ({ y: 0 }) } as any;
    expect(component.child.top).toEqual(1);
    component.child.parent = null;
    expect(component.child.top).toEqual(1);
  });

  it('should set left based on parent', () => {
    component.child.parent = { getBoundingClientRect: () => ({ x: 0 }) } as any;
    expect(component.child.left).toEqual(-8);
    component.child.parent = null;
    expect(component.child.left).toEqual(1);
  });

  it('should set opening to false on first click event', () => {
    spyOn(component, 'cancel');
    document.body.click();
    expect(component.cancel).not.toHaveBeenCalled();
    expect(component.child.opening).toEqual(false);
  });

  it('should commit when clicked away with edits', () => {
    spyOn(component, 'commit');
    const value = ['A'];
    component.child.opening = false;
    component.child.edited = true;
    component.child.editValue = value;
    document.body.click();
    expect(component.commit).toHaveBeenCalledWith(value);
  });

  it('should cancel when clicked away with no edits', () => {
    spyOn(component, 'cancel');
    component.child.opening = false;
    document.body.click();
    expect(component.cancel).toHaveBeenCalled();
  });

  it('should not cancel when clicked on', () => {
    spyOn(component, 'cancel');
    component.child.opening = false;
    TestUtility.clickSelector(fixture, '.header');
    expect(component.cancel).not.toHaveBeenCalled();
  });

  it('should enable an item', () => {
    component.child.opening = false;
    TestUtility.clickSelector(fixture, '.clickable', 1);
    expect(component.child.edited).toBeTrue();
    expect(component.child.editValue).toEqual(['1', '2']);
  });

  it('should disable an item', () => {
    component.child.opening = false;
    TestUtility.clickSelector(fixture, '.clickable', 0);
    expect(component.child.edited).toBeTrue();
    expect(component.child.editValue).toEqual([]);
  });
});

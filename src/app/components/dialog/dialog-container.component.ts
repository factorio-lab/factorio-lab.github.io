import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'lab-dialog-container',
  template: '',
})
export class DialogContainerComponent {
  @Input() header: string;

  open = false;

  @HostBinding('class.relative') relative = true;

  constructor() {}

  cancel(): void {
    this.open = false;
  }
}

import {
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';

@Component({ template: '' })
export abstract class ModalComponent {
  cancel = signal(false);

  onHide(): void {
    if (this.cancel()) return;
    this.save();
  }

  abstract save(): void;
}

@Component({ template: '' })
export abstract class DialogComponent extends ModalComponent {
  ref = inject(ChangeDetectorRef);

  visible = false;

  hide(cancel?: true): void {
    if (cancel === true) this.cancel.set(cancel);
    this.visible = false;
  }

  show(): void {
    this.cancel.set(false);
    this.visible = true;
    this.ref.markForCheck();
  }
}

@Component({ template: '' })
export abstract class OverlayComponent extends ModalComponent {
  // overlayPanel = viewChild.required(OverlayPanel);

  hide(cancel?: true): void {
    if (cancel === true) this.cancel.set(cancel);
    // this.overlayPanel().hide();
  }

  protected _show(event: Event): void {
    this.cancel.set(false);
    // this.overlayPanel().toggle(event);
  }
}

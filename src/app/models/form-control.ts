import { Component, input, output } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { Optional } from './utils';

@Component({ template: '', standalone: true })
export class FormControlComponent<T> implements ControlValueAccessor {
  inputId = input.required<string>();
  label = input.required<string>();

  onChange = output<T>();

  value: Optional<T>;
  disabled = false;
  touched = false;
  onChangeFn: Optional<(value: T) => void>;
  onTouchedFn: Optional<() => void>;

  setValue(value: Optional<T>): void {
    this.markAsTouched();
    if (value == null) return;
    this.writeValue(value);
    this.onChangeFn?.(value);
    this.onChange.emit(value);
    console.log(value);
  }

  markAsTouched(): void {
    if (this.touched) return;
    this.touched = true;
    this.onTouchedFn?.();
  }

  writeValue(value: T): void {
    this.value = value;
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState?(disabled: boolean): void {
    this.disabled = disabled;
  }
}

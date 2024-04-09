import { Directive, input } from '@angular/core';
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from '@angular/forms';

import { Rational, rational } from '~/models';

@Directive({
  selector: '[labValidateNumber][ngModel]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: ValidateNumberDirective,
      multi: true,
    },
  ],
})
export class ValidateNumberDirective implements Validator {
  minimum = input<Rational | null>(rational(0n));
  maximum = input<Rational | null>(null);

  validate(
    control: AbstractControl<string | null | undefined>,
  ): ValidationErrors | null {
    if (control.value == null) return null;

    try {
      const value = rational(control.value);
      const min = this.minimum();
      const max = this.maximum();
      if ((min == null || value.gte(min)) && (max == null || value.lte(max)))
        return null;
    } catch {
      // ignore error
    }

    return {
      validateNumber: {
        valid: false,
      },
    };
  }
}

import { Pipe, PipeTransform } from '@angular/core';

import { Option } from '~/models/option';

@Pipe({ name: 'filterOptions', standalone: true })
export class FilterOptionsPipe implements PipeTransform {
  transform(
    value: Option[] | null | undefined,
    exclude: string[] | null | undefined,
    self?: string | null,
  ): Option[] {
    if (value == null) return [];
    if (!exclude?.length) return value;

    const excludeSet = new Set(exclude);
    return value.filter((o) => !excludeSet.has(o.value) || o.value === self);
  }
}

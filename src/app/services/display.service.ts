import { Injectable } from '@angular/core';

import { Rational, Recipe } from '~/models';

@Injectable({ providedIn: 'root' })
export class DisplayService {
  icon(id: string, num?: string | number): string {
    return `<i class="me-2 lab-icon-sm padded ${id}"><span>${
      num ?? ''
    }</span></i>`;
  }

  table(rows: [string, string][]): string {
    let html = `<table class="w-100">`;
    rows.forEach(
      (r) =>
        (html += `<tr><td class="text-nowrap">${r[0]}</td><td class="text-nowrap">${r[1]}</td></tr>`)
    );
    html += `</table>`;
    return html;
  }

  round(value: Rational): string {
    return Number(value.toNumber().toFixed(2)).toString();
  }

  power(value: Rational | string | number): string {
    if (typeof value === 'string') {
      value = Rational.fromString(value);
    } else if (typeof value === 'number') {
      value = Rational.fromNumber(value);
    }
    if (value.abs().lt(Rational.thousand)) {
      return `${this.round(value)} kW`;
    } else {
      return `${this.round(value.div(Rational.thousand))} MW`;
    }
  }

  toBonusPercent(value: Rational): string {
    const rational = this.round(value.mul(Rational.hundred));
    if (value.gt(Rational.zero)) {
      return `+${rational}%`;
    } else if (value.lt(Rational.zero)) {
      return `${rational}%`;
    } else {
      return '';
    }
  }

  recipeProcess(recipe: Recipe): string {
    const timeHtml = this.icon('time', recipe.time);
    const inHtml = Object.keys(recipe.in)
      .map((i) => this.icon(i, recipe.in[i]))
      .join('');
    const outHtml = Object.keys(recipe.out)
      .map((i) => this.icon(i, recipe.out[i]))
      .join('');
    return `${timeHtml}${inHtml}<i class="m-1 me-2 fa-solid fa-arrow-right"></i>${outHtml}`;
  }
}

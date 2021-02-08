import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router, Event, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { initial } from 'lodash';
import { deflate, inflate } from 'pako';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  Product,
  RecipeSettings,
  Step,
  RateType,
  ItemSettings,
  Entities,
  FactorySettings,
  Rational,
  ModHash,
} from '~/models';
import { State } from '~/store';
import { LoadAction } from '~/store/app.actions';
import { FactoriesState } from '~/store/factories';
import { ItemsState } from '~/store/items';
import * as Products from '~/store/products';
import { RecipesState } from '~/store/recipes';
import { SettingsState, initialSettingsState } from '~/store/settings';

export const NULL = '?'; // Encoded, previously 'n'
export const EMPTY = '='; // Encoded, previously 'e'
export const LISTSEP = '_'; // Unreserved, previously ','
export const ARRAYSEP = '~'; // Unreserved, previously '+'
export const FIELDSEP = '*'; // Reserved, unescaped by encoding
export const TRUE = '1';
export const FALSE = '0';
export const BASE64ABC =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.'; // Unreserved
export const MAX = BASE64ABC.length;
export const INVERT = BASE64ABC.split('').reduce(
  (e: Entities<number>, c, i) => {
    e[c] = i;
    return e;
  },
  {}
);

export function getId(n: number): string {
  if (n / MAX >= 1) {
    return getId(Math.floor(n / MAX)) + getId(n % MAX);
  } else {
    return BASE64ABC[n];
  }
}

export function getN(id: string): number {
  if (id.length > 0) {
    const n = INVERT[id[0]];
    if (id.length > 1) {
      id = id.substr(1);
      return n * Math.pow(MAX, id.length) + getN(id);
    } else {
      return n;
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class RouterService {
  unzipping: boolean;
  zip: string;
  zipPartial: [string, string] = ['', ''];
  base64codes: Uint8Array;
  // Intended to denote hashing algorithm version
  zipVersion = 0;
  cache: Entities<ModHash> = {};

  constructor(
    private router: Router,
    private store: Store<State>,
    private http: HttpClient
  ) {
    const l = 256;
    this.base64codes = new Uint8Array(l);
    for (let i = 0; i < l; i++) {
      this.base64codes[i] = 255; // invalid character
    }
    for (let i = 0; i < BASE64ABC.length; i++) {
      this.base64codes[BASE64ABC.charCodeAt(i)] = i;
    }
    this.base64codes['_'.charCodeAt(0)] = 0;
    this.router.events.subscribe((e) => this.updateState(e));
  }

  updateUrl(
    products: Products.ProductsState,
    items: ItemsState,
    recipes: RecipesState,
    factories: FactoriesState,
    settings: SettingsState
  ): void {
    if (!this.unzipping) {
      this.zipState(products, items, recipes, factories, settings).subscribe(
        (zState) => {
          this.zip = this.getHash(zState);
          this.router.navigateByUrl(
            `${this.router.url.split('#')[0].split('?')[0]}?${this.zip}`
          );
        }
      );
    }
  }

  zipState(
    products: Products.ProductsState,
    items: ItemsState,
    recipes: RecipesState,
    factories: FactoriesState,
    settings: SettingsState
  ): Observable<[string, string]> {
    return this.requestHash(
      settings.baseId || initialSettingsState.baseId
    ).pipe(
      map((hash) => {
        // Products
        const p = products.ids.map((i) => products.entities[i]);
        const zState: [string, string] = [
          this.zipProducts(p),
          this.zip0Products(p, hash),
        ];
        let zipPartial: [string, string] = ['', ''];
        // Preset
        const zPreset = this.zipDiffNumber(
          settings.preset,
          initialSettingsState.preset
        );
        if (zPreset.length) {
          zipPartial[0] += '&b=' + zPreset;
          zipPartial[1] += '&b' + zPreset;
        }
        // Items
        zipPartial[0] += this.zipItems(items);
        zipPartial[1] += this.zipItems(items);
        const zRecipes = this.zipRecipes(recipes);
        if (zRecipes.length) {
          zipPartial[0] += `&r=${zRecipes}`;
          zipPartial[1] += `&r${zRecipes}`;
        }
        const zFactories = this.zipFactories(factories);
        if (zFactories.length) {
          zipPartial[0] += `&f=${zFactories}`;
          zipPartial[1] += `&f${zFactories}`;
        }
        const zSettings = this.zipSettings(settings);
        if (zSettings.length) {
          zipPartial[0] += `&s=${zSettings}`;
          zipPartial[1] += `&s${zSettings}`;
        }
        this.zipPartial = zipPartial;
        return zState;
      })
    );
  }

  stepHref(baseId: string, step: Step): Observable<string> {
    if (!step.items) {
      return null;
    }
    const products: Product[] = [
      {
        id: '0',
        itemId: step.itemId,
        rate: step.items.toString(),
        rateType: RateType.Items,
      },
    ];
    return this.requestHash(baseId).pipe(
      map((hash) => {
        const zProducts: [string, string] = [
          this.zipProducts(products),
          this.zip0Products(products, hash),
        ];
        return '?' + this.getHash(zProducts);
      })
    );
  }

  getHash(zProducts: [string, string]): string {
    const unzipped = zProducts[0] + this.zipPartial[0];
    const zipped = `z=${this.bytesToBase64(
      deflate(zProducts[1] + this.zipPartial[1])
    )}`;
    return unzipped.length < zipped.length ? unzipped : zipped;
  }

  updateState(e: Event): void {
    try {
      if (e instanceof NavigationEnd) {
        const fragments = e.urlAfterRedirects.split('#');
        let query = fragments[0].split('?');
        if (
          query.length < 2 &&
          fragments.length > 1 &&
          fragments[1].length > 1 &&
          fragments[1][1] === '='
        ) {
          // Try to recognize and handle old hash style navigation
          query = fragments;
        }
        if (query.length > 1) {
          let zip = query[1];
          if (this.zip !== zip) {
            if (zip.startsWith('z=')) {
              // Upgrade old query-unsafe zipped characters
              const z = zip
                .substr(2)
                .replace(/\+/g, '-')
                .replace(/\//g, '.')
                .replace(/=/g, '_');
              zip = inflate(this.base64ToBytes(z), { to: 'string' });
            }
            // Upgrade old query-unsafe delimiters
            zip = zip.replace(/,/g, LISTSEP).replace(/\+/g, ARRAYSEP);
            const params = zip.split('&');
            const state: State = {} as any;
            for (const p of params) {
              const s = p.split('=');
              if (s[1]) {
                const k = s[0];
                const v = decodeURIComponent(s[1]);
                if (k === 'p') {
                  state.productsState = this.unzipProducts(v.split(LISTSEP));
                } else if (k === 'b') {
                  state.settingsState = {
                    ...state.settingsState,
                    ...{ preset: this.parseNumber(v) },
                  };
                } else if (k === 'i') {
                  state.itemsState = this.unzipItems(v.split(LISTSEP));
                } else if (k === 'r') {
                  state.recipesState = this.unzipRecipes(v.split(LISTSEP));
                } else if (k === 'f') {
                  state.factoriesState = this.unzipFactories(v.split(LISTSEP));
                } else if (k === 's') {
                  state.settingsState = {
                    ...state.settingsState,
                    ...this.unzipSettings(v),
                  };
                }
              }
            }
            this.zip = zip;
            this.unzipping = true;
            this.store.dispatch(new LoadAction(state));
            this.unzipping = false;
          }
        }
      }
    } catch (e) {
      console.warn('Router: Failed to parse url');
      console.error(e);
    }
  }

  zipProducts(products: Product[]): string {
    return (
      'p=' +
      encodeURIComponent(
        products
          .map((product) => {
            const i = product.itemId;
            const r = Rational.fromString(product.rate).toString();

            return [
              i,
              r,
              this.zipDiffNumber(product.rateType, RateType.Items),
              this.zipTruthyString(product.viaId),
            ]
              .join(FIELDSEP)
              .replace(/\**$/, '');
          })
          .join(LISTSEP)
      )
    );
  }

  zip0Products(products: Product[], hash: ModHash): string {
    return (
      'v' +
      getId(0) +
      'p' +
      products
        .map((product) => {
          const i = getId(hash.items.indexOf(product.itemId));
          const r = Rational.fromString(product.rate).toString();
          const vHash =
            product.rateType === RateType.Factories ? hash.recipes : hash.items;

          return [
            i,
            r,
            this.zipDiffNumber(product.rateType, RateType.Items),
            this.zipTruthyString(
              product.viaId && getId(vHash.indexOf(product.viaId))
            ),
          ]
            .join(FIELDSEP)
            .replace(/\**$/, '');
        })
        .join(LISTSEP)
    );
  }

  unzipProducts(zProducts: string[]): Products.ProductsState {
    const ids: string[] = [];
    const entities: Entities<Product> = {};
    let index = 0;
    for (const product of zProducts) {
      const p = product.split(FIELDSEP);
      const id = index.toString();
      const u: Product = {
        id,
        itemId: p[0],
        rate: p[1],
        rateType: p.length > 2 ? Number(p[2]) : RateType.Items,
      };
      let i = 3;
      let v = p[i++];
      if (v?.length) {
        u.viaId = this.parseString(v);
      }
      ids.push(id);
      entities[id] = u;
      index++;
    }
    return { ids, index, entities };
  }

  zipItems(state: ItemsState): string {
    const v = encodeURIComponent(
      Object.keys(state)
        .map((id) => {
          const settings = state[id];
          return [
            id,
            this.zipTruthyBool(settings.ignore),
            this.zipTruthyString(settings.belt),
            this.zipTruthyString(settings.wagon),
          ]
            .join(FIELDSEP)
            .replace(/\**$/, '');
        })
        .join(LISTSEP)
    );
    return v ? '&i=' + v : '';
  }

  unzipItems(zItems: string[]): ItemsState {
    const items: ItemsState = {};
    for (const recipe of zItems) {
      const r = recipe.split(FIELDSEP);
      const u: ItemSettings = {};
      let i = 1;
      let v = r[i++];
      if (v?.length) {
        u.ignore = this.parseBool(v);
      }
      v = r[i++];
      if (v?.length) {
        u.belt = this.parseString(v);
      }
      v = r[i++];
      if (v?.length) {
        u.wagon = this.parseString(v);
      }
      items[r[0]] = u;
    }
    return items;
  }

  zipRecipes(state: RecipesState): string {
    const v = encodeURIComponent(
      Object.keys(state)
        .map((id) => {
          const settings = state[id];
          return [
            id,
            this.zipTruthyString(settings.factory),
            this.zipTruthyArray(settings.factoryModules),
            this.zipTruthyNumber(settings.beaconCount),
            this.zipTruthyArray(settings.beaconModules),
            this.zipTruthyString(settings.beacon),
          ]
            .join(FIELDSEP)
            .replace(/\**$/, '');
        })
        .join(LISTSEP)
    );
    return v ? '&r=' + v : '';
  }

  unzipRecipes(zRecipes: string[]): RecipesState {
    const recipes: RecipesState = {};
    for (const recipe of zRecipes) {
      const r = recipe.split(FIELDSEP);
      const u: RecipeSettings = {};
      let i = 1;
      let v = r[i++];
      if (v?.length) {
        u.factory = this.parseString(v);
      }
      v = r[i++];
      if (v?.length) {
        u.factoryModules = this.parseArray(v);
      }
      v = r[i++];
      if (v?.length) {
        u.beaconCount = this.parseNumber(v);
      }
      v = r[i++];
      if (v?.length) {
        u.beaconModules = this.parseArray(v);
      }
      v = r[i++];
      if (v?.length) {
        u.beacon = this.parseString(v);
      }
      recipes[r[0]] = u;
    }
    return recipes;
  }

  zipFactories(state: FactoriesState): string {
    const ids = state.ids ? ['', ...state.ids] : Object.keys(state.entities);
    const v = encodeURIComponent(
      ids
        .map((id) => {
          const othEnt = state.entities[id] || {};
          if (id === '') {
            id = state.ids == null ? '' : TRUE;
          }
          return [
            id,
            this.zipTruthyArray(othEnt.moduleRank),
            this.zipTruthyNumber(othEnt.beaconCount),
            this.zipTruthyString(othEnt.beaconModule),
            this.zipTruthyString(othEnt.beacon),
          ]
            .join(FIELDSEP)
            .replace(/\**$/, '');
        })
        .join(LISTSEP)
    );
    return v ? '&f=' + v : '';
  }

  unzipFactories(zFactories: string[]): FactoriesState {
    const factories: FactoriesState = {
      ids: null,
      entities: {},
    };
    let loadIds = false;
    for (let z = 0; z < zFactories.length; z++) {
      const factory = zFactories[z];
      const f = factory.split(FIELDSEP);
      const u: FactorySettings = {};
      let i = 1;
      let v = f[i++];
      if (v?.length) {
        u.moduleRank = this.parseArray(v);
      }
      v = f[i++];
      if (v?.length) {
        u.beaconCount = this.parseNumber(v);
      }
      v = f[i++];
      if (v?.length) {
        u.beaconModule = this.parseString(v);
      }
      v = f[i++];
      if (v?.length) {
        u.beacon = this.parseString(v);
      }
      let id = f[0];
      if (z === 0) {
        if (id === TRUE) {
          loadIds = true;
          factories.ids = [];
        }
        id = '';
      } else if (loadIds) {
        factories.ids.push(id);
      }
      factories.entities[id] = u;
    }
    return factories;
  }

  zipSettings(state: SettingsState): string {
    const init = initialSettingsState;
    const v = encodeURIComponent(
      [
        this.zipDiffString(state.baseId, init.baseId),
        this.zipDiffArray(state.disabledRecipes, init.disabledRecipes),
        this.zipDiffBool(state.expensive, init.expensive),
        this.zipDiffString(state.belt, init.belt),
        this.zipDiffString(state.fuel, init.fuel),
        this.zipDiffNumber(state.flowRate, init.flowRate),
        this.zipDiffNumber(state.displayRate, init.displayRate),
        this.zipDiffNumber(state.miningBonus, init.miningBonus),
        this.zipDiffNumber(state.researchSpeed, init.researchSpeed),
        this.zipDiffNumber(state.inserterTarget, init.inserterTarget),
        this.zipDiffNumber(state.inserterCapacity, init.inserterCapacity),
        this.zipDiffString(state.cargoWagon, init.cargoWagon),
        this.zipDiffString(state.fluidWagon, init.fluidWagon),
      ]
        .join(FIELDSEP)
        .replace(/\**$/, '')
    );
    return v ? '&s=' + v : '';
  }

  unzipSettings(zSettings: string): SettingsState {
    const s = zSettings.split(FIELDSEP);
    const settings: SettingsState = {} as any;
    let i = 0;
    let v = s[i++];
    if (v.length) {
      settings.baseId = v;
    }
    v = s[i++];
    if (v?.length) {
      settings.disabledRecipes = this.parseArray(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.expensive = this.parseBool(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.belt = this.parseString(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.fuel = this.parseString(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.flowRate = this.parseNumber(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.displayRate = this.parseNumber(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.miningBonus = this.parseNumber(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.researchSpeed = this.parseNumber(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.inserterTarget = this.parseNumber(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.inserterCapacity = this.parseNumber(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.cargoWagon = this.parseString(v);
    }
    v = s[i++];
    if (v?.length) {
      settings.fluidWagon = this.parseString(v);
    }
    return settings;
  }

  zipTruthyString(value: string): string {
    return value == null ? '' : value;
  }

  zipTruthyNumber(value: number): string {
    return value == null ? '' : value.toString();
  }

  zipTruthyBool(value: boolean): string {
    return value == null ? '' : value ? TRUE : FALSE;
  }

  zipTruthyArray(value: string[]): string {
    return value == null ? '' : value.length ? value.join(ARRAYSEP) : EMPTY;
  }

  zipDiffString(value: string, init: string): string {
    return value === init ? '' : value == null ? NULL : value;
  }

  zipDiffNumber(value: number, init: number): string {
    return value === init ? '' : value == null ? NULL : value.toString();
  }

  zipDiffBool(value: boolean, init: boolean): string {
    return value === init ? '' : value == null ? NULL : value ? TRUE : FALSE;
  }

  zipDiffArray(value: string[], init: string[]): string {
    const zVal = value
      ? value.length
        ? [...value].sort().join(ARRAYSEP)
        : EMPTY
      : NULL;
    const zInit = init
      ? init.length
        ? [...init].sort().join(ARRAYSEP)
        : EMPTY
      : NULL;
    return zVal === zInit ? '' : zVal;
  }

  zipDiffRank(value: string[], init: string[]): string {
    const zVal = value
      ? value.length
        ? [...value].join(ARRAYSEP)
        : EMPTY
      : NULL;
    const zInit = init
      ? init.length
        ? [...init].join(ARRAYSEP)
        : EMPTY
      : NULL;
    return zVal === zInit ? '' : zVal;
  }

  parseString(value: string): string {
    // Replace old null values
    value = value.replace(/^n$/, NULL);
    return value === NULL ? null : value;
  }

  parseBool(value: string): boolean {
    // Replace old null values
    value = value.replace(/^n$/, NULL);
    return value === NULL ? null : value === TRUE;
  }

  parseNumber(value: string): number {
    // Replace old null values
    value = value.replace(/^n$/, NULL);
    return value === NULL ? null : Number(value);
  }

  parseArray(value: string): string[] {
    // Replace old null/empty values
    value = value.replace(/^n$/, NULL).replace(/^e$/, EMPTY);
    return value === NULL ? null : value === EMPTY ? [] : value.split(ARRAYSEP);
  }

  getBase64Code(charCode: number): number {
    if (charCode >= this.base64codes.length) {
      throw new Error('Unable to parse base64 string.');
    }
    const code = this.base64codes[charCode];
    if (code === 255) {
      throw new Error('Unable to parse base64 string.');
    }
    return code;
  }

  bytesToBase64(bytes: Uint8Array): string {
    let result = '';
    let i: number;
    const l = bytes.length;
    for (i = 2; i < l; i += 3) {
      result += BASE64ABC[bytes[i - 2] >> 2];
      result += BASE64ABC[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
      result += BASE64ABC[((bytes[i - 1] & 0x0f) << 2) | (bytes[i] >> 6)];
      result += BASE64ABC[bytes[i] & 0x3f];
    }
    if (i === l + 1) {
      // 1 octet yet to write
      result += BASE64ABC[bytes[i - 2] >> 2];
      result += BASE64ABC[(bytes[i - 2] & 0x03) << 4];
      result += '__';
    }
    if (i === l) {
      // 2 octets yet to write
      result += BASE64ABC[bytes[i - 2] >> 2];
      result += BASE64ABC[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
      result += BASE64ABC[(bytes[i - 1] & 0x0f) << 2];
      result += '_';
    }
    return result;
  }

  base64ToBytes(str: string): Uint8Array {
    if (str.length % 4 !== 0) {
      throw new Error('Unable to parse base64 string.');
    }
    const index = str.indexOf('_');
    if (index !== -1 && index < str.length - 2) {
      throw new Error('Unable to parse base64 string.');
    }
    const missingOctets = str.endsWith('__') ? 2 : str.endsWith('_') ? 1 : 0;
    const n = str.length;
    const result = new Uint8Array(3 * (n / 4));
    let buffer: number;
    for (let i = 0, j = 0; i < n; i += 4, j += 3) {
      buffer =
        (this.getBase64Code(str.charCodeAt(i)) << 18) |
        (this.getBase64Code(str.charCodeAt(i + 1)) << 12) |
        (this.getBase64Code(str.charCodeAt(i + 2)) << 6) |
        this.getBase64Code(str.charCodeAt(i + 3));
      result[j] = buffer >> 16;
      result[j + 1] = (buffer >> 8) & 0xff;
      result[j + 2] = buffer & 0xff;
    }
    return result.subarray(0, result.length - missingOctets);
  }

  requestHash(id: string): Observable<ModHash> {
    return this.cache[id]
      ? of(this.cache[id])
      : this.http.get(`data/${id}/hash.json`).pipe(
          map((response) => response as ModHash),
          tap((data) => (this.cache[id] = data))
        );
  }
}

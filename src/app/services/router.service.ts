import { Injectable } from '@angular/core';
import { Event, NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import { deflate, inflate } from 'pako';
import { BehaviorSubject, debounceTime, Observable, Subject } from 'rxjs';
import { filter, first, map, switchMap, tap } from 'rxjs/operators';

import { data } from 'src/data';
import {
  BeaconSettings,
  DisplayRate,
  Entities,
  FactorySettings,
  ItemSettings,
  ModHash,
  Producer,
  Product,
  RateType,
  Rational,
  RecipeSettings,
  Step,
} from '~/models';
import {
  App,
  Datasets,
  Factories,
  Items,
  LabState,
  Producers,
  Products,
  Recipes,
  Settings,
} from '~/store';
import { BrowserUtility } from '~/utilities';
import { DataService } from './data.service';

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
export const MIN_ZIP = 75;

export enum Section {
  Version = 'v',
  Mod = 'b',
  Products = 'p',
  Producers = 'q',
  Items = 'i',
  Recipes = 'r',
  Factories = 'f',
  Beacons = 'e',
  Settings = 's',
  Zip = 'z',
}

export enum ZipVersion {
  Version0 = '0', // Bare
  Version1 = '1', // Bare
  Version2 = '2', // Hash
  Version3 = '3', // Hash
  Version4 = '4', // Bare
  Version5 = '5', // Hash
  Version6 = '6', // Bare
  Version7 = '7', // Hash
}

export enum MigrationWarning {
  ExpensiveDeprecation = 'Deprecated: The expensive setting has been removed. Please use or request an expensive data set instead.',
}

export interface Zip {
  bare: string;
  hash: string;
}

export interface ZipData {
  objectives: Zip;
  config: Zip;
  producerBeaconMap: Entities<number[]>;
  recipeBeaconMap: Entities<number[]>;
}

@Injectable({
  providedIn: 'root',
})
export class RouterService {
  zip: string | undefined;
  zipConfig$ = new BehaviorSubject<Zip>(this.empty);
  base64codes: Uint8Array;
  // Intended to denote hashing algorithm version
  bareVersion = ZipVersion.Version6;
  hashVersion = ZipVersion.Version7;
  zipTail: Zip = {
    bare: `&${Section.Version}=${this.bareVersion}`,
    hash: `&${Section.Version}${this.hashVersion}`,
  };
  first = true;
  ready$ = new Subject<void>();

  get empty(): Zip {
    return { bare: '', hash: '' };
  }

  constructor(
    private router: Router,
    private gaSvc: GoogleAnalyticsService,
    private store: Store<LabState>,
    private dataSvc: DataService
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
  }

  initialize(): void {
    this.router.events.subscribe((e) => this.updateState(e));

    this.ready$
      .pipe(
        first(),
        tap(() => this.dataSvc.initialize()),
        switchMap(() => this.store.select(Products.getZipState)),
        debounceTime(0),
        tap((s) =>
          this.updateUrl(
            s.products,
            s.producers,
            s.items,
            s.recipes,
            s.factories,
            s.settings
          )
        )
      )
      .subscribe();
  }

  updateUrl(
    products: Products.ProductsState,
    producers: Producers.ProducersState,
    items: Items.ItemsState,
    recipes: Recipes.RecipesState,
    factories: Factories.FactoriesState,
    settings: Settings.SettingsState
  ): void {
    this.zipState(
      products,
      producers,
      items,
      recipes,
      factories,
      settings
    ).subscribe((zData) => {
      this.zip = this.getHash(zData);
      const hash = this.router.url.split('#');
      const url = `${hash[0].split('?')[0]}?${this.zip}${
        (hash[1] && `#${hash[1]}`) || ''
      }`;
      this.router.navigateByUrl(url);
      // Don't cache landing or wizard
      if (!url.startsWith('/?') && !url.startsWith('/wizard')) {
        BrowserUtility.routerState = url;
      }
    });
  }

  zipState(
    products: Products.ProductsState,
    producers: Producers.ProducersState,
    items: Items.ItemsState,
    recipes: Recipes.RecipesState,
    factories: Factories.FactoriesState,
    settings: Settings.SettingsState
  ): Observable<ZipData> {
    return this.store.select(Datasets.getHashRecord).pipe(
      map((hashEntities) => hashEntities[settings.modId]),
      filter((hash): hash is ModHash => hash != null),
      first(),
      map((hash) => {
        // Setup object lists
        const p = products.ids.map((i) => products.entities[i]);
        const q = producers.ids.map((i) => producers.entities[i]);

        // Beacons
        const zData = this.zipBeacons(q, recipes, hash);

        // Products
        this.zipProducts(zData, p, hash);
        // Producers
        this.zipProducers(zData, q, hash);

        // Mod (Hashed only, for hash lookup)
        const zMod = this.zipDiffString(
          settings.modId,
          Settings.initialSettingsState.modId
        );
        if (zMod.length) {
          zData.config.hash += `&${Section.Mod}${this.getId(
            data.hash.indexOf(zMod)
          )}`;
        }

        // Settings
        this.zipItems(zData, items, hash);
        this.zipRecipes(zData, recipes, hash);
        this.zipFactories(zData, factories, hash);
        this.zipSettings(zData, settings, hash);
        this.zipConfig$.next(zData.config);
        return zData;
      })
    );
  }

  stepHref(step: Step, config: Zip, hash: ModHash | undefined): string | null {
    if (step.items == null || step.itemId == null || hash == null) {
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
    const zData: ZipData = {
      objectives: this.empty,
      config: config,
      recipeBeaconMap: {},
      producerBeaconMap: {},
    };
    this.zipProducts(zData, products, hash);
    return '?' + this.getHash(zData);
  }

  getHash(zData: ZipData): string {
    const bare = zData.objectives.bare + zData.config.bare + this.zipTail.bare;
    const hash = zData.objectives.hash + zData.config.hash + this.zipTail.hash;
    const zip = `z=${this.bytesToBase64(deflate(hash))}&${Section.Version}=${
      this.hashVersion
    }`;
    return bare.length < Math.max(zip.length, MIN_ZIP) ? bare : zip;
  }

  getParams(zip: string): Entities {
    const sections = zip.split('&');
    const substr = sections[0][1] === '=' ? 2 : 1;
    const params = sections.reduce((e: Entities, v) => {
      e[v[0]] = v.substring(substr);
      return e;
    }, {});
    return params;
  }

  updateState(e: Event): void {
    try {
      if (e instanceof NavigationEnd) {
        const [prehash, ...posthash] = e.urlAfterRedirects.split('#');
        const hash = posthash.join('#'); // Preserve # after first instance
        const [_, ...postquery] = prehash.split('?');
        let query = postquery.join('?'); // Preserve ? after first instance
        if (!query.length && hash.length > 1 && hash[1] === '=') {
          // Try to recognize and handle old hash style navigation
          query = hash;
        }

        if (query && this.zip !== query) {
          let zip = query;
          const zipSection = new URLSearchParams(zip).get(Section.Zip);
          if (zipSection != null) {
            // Upgrade V0 query-unsafe zipped characters
            const z = zipSection
              .replace(/\+/g, '-')
              .replace(/\//g, '.')
              .replace(/=/g, '_');
            zip = this.inflateSafe(z);
          }
          // Upgrade V0 query-unsafe delimiters
          zip = zip.replace(/,/g, LISTSEP).replace(/\+/g, ARRAYSEP);
          // Upgrade V0 null/empty values
          zip = zip
            .replace(/\*n\*/g, `*${NULL}*`)
            .replace(/\*e\*/g, `*${EMPTY}*`);
          let params = this.getParams(zip);
          let warnings: string[] = [];
          [params, warnings] = this.migrate(params);
          this.displayWarnings(warnings);
          const v = params[Section.Version] as ZipVersion;
          const state: App.PartialState = {};
          if (v == this.bareVersion) {
            Object.keys(params).forEach((k) => {
              params[k] = decodeURIComponent(params[k]);
            });
            const beaconSettings = this.unzipBeacons(params);
            if (params[Section.Products]) {
              state.productsState = this.unzipProducts(params);
            }
            if (params[Section.Producers]) {
              state.producersState = this.unzipProducers(
                params,
                beaconSettings
              );
            }
            if (params[Section.Items]) {
              state.itemsState = this.unzipItems(params);
            }
            if (params[Section.Recipes]) {
              state.recipesState = this.unzipRecipes(params, beaconSettings);
            }
            if (params[Section.Factories]) {
              state.factoriesState = this.unzipFactories(params);
            }
            if (params[Section.Settings]) {
              state.settingsState = this.unzipSettings(params);
            }
            this.dispatch(zip, state);
          } else {
            const modId = this.parseNString(params[Section.Mod], data.hash);
            this.dataSvc
              .requestData(modId || Settings.initialSettingsState.modId)
              .subscribe(([_, hash]) => {
                const beaconSettings = this.unzipBeacons(params, hash);
                if (params[Section.Products]) {
                  state.productsState = this.unzipProducts(params, hash);
                }
                if (params[Section.Producers]) {
                  state.producersState = this.unzipProducers(
                    params,
                    beaconSettings,
                    hash
                  );
                }
                if (params[Section.Items]) {
                  state.itemsState = this.unzipItems(params, hash);
                }
                if (params[Section.Recipes]) {
                  state.recipesState = this.unzipRecipes(
                    params,
                    beaconSettings,
                    hash
                  );
                }
                if (params[Section.Factories]) {
                  state.factoriesState = this.unzipFactories(params, hash);
                }
                if (params[Section.Settings]) {
                  state.settingsState = this.unzipSettings(params, hash);
                }
                if (modId != null) {
                  state.settingsState = {
                    ...state.settingsState,
                    ...{ modId },
                  };
                }
                this.dispatch(zip, state);
              });
          }
        } else {
          // No app state to dispatch, ready to load
          this.ready$.next();
        }
      }
    } catch (err) {
      console.error(err);
      throw new Error('RouterService failed to parse url');
    }
  }

  dispatch(zip: string, state: App.PartialState): void {
    this.zip = zip;
    this.store.dispatch(new App.LoadAction(state));
    this.ready$.next();
  }

  /** Migrates older zip params to latest bare/hash formats */
  migrate(params: Entities): [Entities<string>, string[]] {
    const warnings: string[] = [];
    const v = (params[Section.Version] as ZipVersion) ?? ZipVersion.Version0;
    this.gaSvc.event('unzip_version', v);
    switch (v) {
      case ZipVersion.Version0:
        return this.migrateV0(params, warnings);
      case ZipVersion.Version1:
        return this.migrateV1(params, warnings);
      case ZipVersion.Version2:
        return this.migrateV2(params, warnings);
      case ZipVersion.Version3:
        return this.migrateV3(params, warnings);
      case ZipVersion.Version4:
        return this.migrateV4(params, warnings);
      case ZipVersion.Version5:
        return this.migrateV5(params, warnings);
      default:
        return [params, warnings];
    }
  }

  /** Migrates V0 bare zip to latest bare format */
  migrateV0(
    params: Entities,
    warnings: string[]
  ): [Entities<string>, string[]] {
    if (params[Section.Settings]) {
      // Reorganize settings
      const zip = params[Section.Settings];
      const s = zip.split(FIELDSEP);
      // Convert modId to V1
      let modId = this.parseString(s[0]);
      modId = modId && data.hash[data.v0.indexOf(modId)];
      modId = modId ?? NULL;
      // Convert displayRate to V1
      const displayRateV0 =
        this.parseNumber(s[6]) ?? Settings.initialSettingsState.displayRate;
      const displayRateV1 = this.zipDiffDisplayRate(
        displayRateV0,
        Settings.initialSettingsState.displayRate
      );
      params[Section.Settings] = this.zipFields([
        modId,
        displayRateV1,
        params[Section.Mod], // Legacy preset
        s[1], // disabledRecipeIds
        s[3], // beltId
        s[4], // fuelId
        s[5], // flowRate
        s[7], // miningBonus
        s[8], // researchSpeed
        s[10], // inserterCapacity
        s[9], // inserterTarget
        s[2], // expensive
        s[11], // cargoWagonId
        s[12], // fluidWagonId
      ]);
    } else if (params[Section.Mod]) {
      params[Section.Settings] = this.zipFields([
        NULL,
        NULL,
        params[Section.Mod], // Legacy preset
      ]);
    }

    params[Section.Version] = ZipVersion.Version1;
    return this.migrateV1(params, warnings);
  }

  /** Migrates V1 bare zip to latest bare format */
  migrateV1(
    params: Entities,
    warnings: string[]
  ): [Entities<string>, string[]] {
    if (params[Section.Settings]) {
      const zip = params[Section.Settings];
      const s = zip.split(FIELDSEP);
      const index = 11; // Index of expensive field
      if (s.length > index) {
        // Remove expensive field
        const val = s.splice(index, 1);
        const expensive = this.parseBool(val[0]);
        if (expensive) {
          warnings.push(MigrationWarning.ExpensiveDeprecation);
        }
      }

      params[Section.Settings] = this.zipFields(s);
    }

    params[Section.Version] = ZipVersion.Version4;
    return this.migrateV4(params, warnings);
  }

  /** Migrates V2 hash zip to latest hash format */
  migrateV2(
    params: Entities<string>,
    warnings: string[]
  ): [Entities<string>, string[]] {
    if (params[Section.Recipes]) {
      // Convert recipe settings
      const zip = params[Section.Recipes];
      const list = zip.split(LISTSEP);
      const migrated = [];
      const index = 3; // Index of beaconCount field
      for (const recipe of list) {
        const s = recipe.split(FIELDSEP);
        if (s.length > index) {
          // Convert beaconCount from number to string format
          const asString = this.parseNNumber(s[index])?.toString();
          s[index] = this.zipTruthyString(asString);
        }

        migrated.push(this.zipFields(s));
      }

      params[Section.Recipes] = migrated.join(LISTSEP);
    }

    if (params[Section.Factories]) {
      // Convert factory settings
      const zip = params[Section.Factories];
      const list = zip.split(LISTSEP);
      const migrated: string[] = [];
      const index = 2; // Index of beaconCount field
      for (const factory of list) {
        const s = factory.split(FIELDSEP);
        if (s.length > index) {
          // Convert beaconCount from number to string format
          const asString = this.parseNNumber(s[index])?.toString();
          s[index] = this.zipTruthyString(asString);
        }

        migrated.push(this.zipFields(s));
      }

      params[Section.Factories] = migrated.join(LISTSEP);
    }

    params[Section.Version] = ZipVersion.Version3;
    return this.migrateV3(params, warnings);
  }

  /** Migrates V3 hash zip to latest hash format */
  migrateV3(
    params: Entities<string>,
    warnings: string[]
  ): [Entities<string>, string[]] {
    if (params[Section.Settings]) {
      const zip = params[Section.Settings];
      const s = zip.split(FIELDSEP);
      const index = 10; // Index of expensive field
      if (s.length > index) {
        // Remove expensive field
        const val = s.splice(index, 1);
        const expensive = this.parseBool(val[0]);
        if (expensive) {
          warnings.push(MigrationWarning.ExpensiveDeprecation);
        }
      }

      params[Section.Settings] = this.zipFields(s);
    }

    params[Section.Version] = ZipVersion.Version5;
    return this.migrateV5(params, warnings);
  }

  private migrateInlineBeaconsSection(
    params: Entities,
    section: Section,
    countIndex: number,
    beacons: string[]
  ): void {
    if (params[section]) {
      const zip = params[section];
      const list = zip.split(LISTSEP);
      const migrated: string[] = [];

      for (const s of list.map((z) => z.split(FIELDSEP))) {
        const moduleIdsIndex = countIndex + 1;
        const idIndex = moduleIdsIndex + 1;
        const totalIndex = idIndex + 3; // Only ever applied to recipes

        if (s.length > countIndex) {
          let id: string | undefined;
          let moduleIds: string | undefined;
          let total: string | undefined;

          // Move backwards from the last index, removing found properties
          if (s.length > totalIndex) {
            // Remove total field
            total = s.splice(totalIndex, 1)[0];
          }

          if (s.length > idIndex) {
            // Remove beaconId field
            id = s.splice(idIndex, 1)[0];
          }

          if (s.length > moduleIdsIndex) {
            // Remove modules field
            moduleIds = s.splice(moduleIdsIndex, 1)[0];
          }

          // Get beaconCount field
          const count = s[countIndex];

          // Replace beaconCount field with beacons field
          s[countIndex] = this.zipTruthyArray([beacons.length]);

          // Add beacon settings
          beacons.push(
            this.zipFields([
              count,
              this.zipTruthyString(moduleIds),
              this.zipTruthyString(id),
              this.zipTruthyString(total),
            ])
          );
        }

        migrated.push(this.zipFields(s));
      }

      params[section] = migrated.join(LISTSEP);
    }
  }

  private migrateInlineBeacons(
    params: Entities,
    warnings: string[],
    version: ZipVersion
  ): [Entities<string>, string[]] {
    const list: string[] = [];

    this.migrateInlineBeaconsSection(params, Section.Producers, 4, list);
    this.migrateInlineBeaconsSection(params, Section.Recipes, 3, list);

    if (list.length) {
      // Add beacon settings
      params[Section.Beacons] = list.join(LISTSEP);
    }

    params[Section.Version] = version;
    return [params, warnings];
  }

  /** Migrates V4 bare zip to latest bare format */
  migrateV4(
    params: Entities,
    warnings: string[]
  ): [Entities<string>, string[]] {
    return this.migrateInlineBeacons(params, warnings, ZipVersion.Version6);
  }

  /** Migrates V5 hash zip to latest hash format */
  migrateV5(
    params: Entities<string>,
    warnings: string[]
  ): [Entities<string>, string[]] {
    return this.migrateInlineBeacons(params, warnings, ZipVersion.Version7);
  }

  displayWarnings(warnings: string[]): void {
    if (warnings.length) {
      window.alert(warnings.join('\r\n'));
    }
  }

  zipBeacons(
    producers: Producer[],
    recipes: Recipes.RecipesState,
    hash: ModHash
  ): ZipData {
    const list: Zip[] = [];
    const beaconsIdMap: Entities<number> = {};
    const producerBeaconMap: Entities<number[]> = {};
    const recipeBeaconMap: Entities<number[]> = {};

    for (const producer of producers) {
      if (producer.beacons != null) {
        producerBeaconMap[producer.id] = this.zipBeaconArray(
          producer.beacons,
          beaconsIdMap,
          list,
          hash
        );
      }
    }

    for (const recipeId of Object.keys(recipes)) {
      const recipe = recipes[recipeId];
      if (recipe.beacons != null) {
        recipeBeaconMap[recipeId] = this.zipBeaconArray(
          recipe.beacons,
          beaconsIdMap,
          list,
          hash
        );
      }
    }

    const z = this.zipList(list);
    const config: Zip = z.bare.length
      ? {
          bare: `&${Section.Beacons}=${z.bare}`,
          hash: `&${Section.Beacons}${z.hash}`,
        }
      : this.empty;

    return {
      objectives: this.empty,
      config,
      producerBeaconMap,
      recipeBeaconMap,
    };
  }

  zipBeaconArray(
    beacons: BeaconSettings[],
    beaconsIdMap: Entities<number>,
    list: Zip[],
    hash: ModHash
  ): number[] {
    return beacons.map((obj) => {
      const zip: Zip = {
        bare: this.zipFields([
          this.zipTruthyString(obj.count),
          this.zipTruthyArray(obj.moduleIds),
          this.zipTruthyString(obj.id),
          this.zipTruthyString(obj.total),
        ]),
        hash: this.zipFields([
          this.zipTruthyString(obj.count),
          this.zipTruthyNArray(obj.moduleIds, hash.modules),
          this.zipTruthyNString(obj.id, hash.beacons),
          this.zipTruthyString(obj.total),
        ]),
      };

      if (beaconsIdMap[zip.bare] == null) {
        beaconsIdMap[zip.bare] = list.length;
        list.push(zip);
      }

      return beaconsIdMap[zip.bare];
    });
  }

  unzipBeacons(params: Entities, hash?: ModHash): BeaconSettings[] {
    if (!params[Section.Beacons]) return [];

    const list = params[Section.Beacons].split(LISTSEP);

    return list.map((beacon) => {
      const s = beacon.split(FIELDSEP);
      let i = 0;
      let obj: BeaconSettings;

      if (hash) {
        obj = {
          count: this.parseString(s[i++]),
          moduleIds: this.parseNArray(s[i++], hash.modules),
          id: this.parseNString(s[i++], hash.beacons),
          total: this.parseString(s[i++]),
        };
      } else {
        obj = {
          count: this.parseString(s[i++]),
          moduleIds: this.parseArray(s[i++]),
          id: this.parseString(s[i++]),
          total: this.parseString(s[i++]),
        };
      }

      this.deleteEmptyKeys(obj);
      return obj;
    });
  }

  zipProducts(data: ZipData, products: Product[], hash: ModHash): void {
    const z = this.zipList(
      products.map((obj) => {
        const r = Rational.fromString(obj.rate).toString();
        const t = this.zipDiffNumber(obj.rateType, RateType.Items);

        return {
          bare: this.zipFields([
            obj.itemId,
            r,
            t,
            this.zipTruthyString(obj.viaId),
          ]),
          hash: this.zipFields([
            this.zipTruthyNString(obj.itemId, hash.items),
            r,
            t,
            this.zipTruthyNString(
              obj.viaId,
              obj.rateType === RateType.Factories ? hash.recipes : hash.items
            ),
          ]),
        };
      })
    );

    if (z.bare.length) {
      data.objectives.bare += `${Section.Products}=${z.bare}`;
      data.objectives.hash += `${Section.Products}${z.hash}`;
    }
  }

  unzipProducts(params: Entities, hash?: ModHash): Products.ProductsState {
    const list = params[Section.Products].split(LISTSEP);
    const ids: string[] = [];
    const entities: Entities<Product> = {};
    let index = 1;
    for (const product of list) {
      const s = product.split(FIELDSEP);
      let i = 0;
      const id = index.toString();
      let obj: Product;

      if (hash) {
        obj = {
          id,
          itemId: this.parseNString(s[i++], hash.items) ?? '',
          rate: s[i++],
          rateType: Number(s[i++]) | RateType.Items,
        };
        obj.viaId = this.parseNString(
          s[i++],
          obj.rateType === RateType.Factories ? hash.recipes : hash.items
        );
      } else {
        obj = {
          id,
          itemId: s[i++],
          rate: s[i++],
          rateType: Number(s[i++]) | RateType.Items,
          viaId: this.parseString(s[i++]),
        };
      }

      this.deleteEmptyKeys(obj);
      ids.push(id);
      entities[id] = obj;
      index++;
    }
    return { ids, index, entities };
  }

  zipProducers(data: ZipData, producers: Producer[], hash: ModHash): void {
    const z = this.zipList(
      producers.map((obj) => {
        const r = Rational.fromString(obj.count).toString();

        return {
          bare: this.zipFields([
            obj.recipeId,
            r,
            this.zipTruthyString(obj.factoryId),
            this.zipTruthyArray(obj.factoryModuleIds),
            this.zipTruthyArray(data.producerBeaconMap[obj.id]),
            this.zipTruthyNumber(obj.overclock),
            this.zipTruthyBool(obj.checked),
          ]),
          hash: this.zipFields([
            this.zipTruthyNString(obj.recipeId, hash.recipes),
            r,
            this.zipTruthyNString(obj.factoryId, hash.factories),
            this.zipTruthyNArray(obj.factoryModuleIds, hash.modules),
            this.zipTruthyArray(data.producerBeaconMap[obj.id]),
            this.zipTruthyNumber(obj.overclock),
            this.zipTruthyBool(obj.checked),
          ]),
        };
      })
    );

    if (z.bare.length) {
      data.objectives.bare += `&${Section.Producers}=${z.bare}`;
      data.objectives.hash += `&${Section.Producers}${z.hash}`;
    }
  }

  unzipProducers(
    params: Entities,
    beaconSettings: BeaconSettings[],
    hash?: ModHash
  ): Producers.ProducersState {
    const list = params[Section.Producers].split(LISTSEP);
    const ids: string[] = [];
    const entities: Entities<Producer> = {};
    let index = 1;
    for (const producer of list) {
      const s = producer.split(FIELDSEP);
      let i = 0;
      const id = index.toString();
      let obj: Producer;

      if (hash) {
        obj = {
          id,
          recipeId: this.parseNString(s[i++], hash.recipes) ?? '',
          count: s[i++],
          factoryId: this.parseNString(s[i++], hash.factories),
          factoryModuleIds: this.parseNArray(s[i++], hash.modules),
          beacons: this.parseArray(s[i++])?.map(
            (i) => beaconSettings[Number(i)] ?? {}
          ),
          overclock: this.parseNumber(s[i++]),
          checked: this.parseBool(s[i++]),
        };
      } else {
        obj = {
          id,
          recipeId: s[i++],
          count: s[i++],
          factoryId: this.parseString(s[i++]),
          factoryModuleIds: this.parseArray(s[i++]),
          beacons: this.parseArray(s[i++])?.map(
            (i) => beaconSettings[Number(i)] ?? {}
          ),
          overclock: this.parseNumber(s[i++]),
          checked: this.parseBool(s[i++]),
        };
      }

      this.deleteEmptyKeys(obj);
      ids.push(id);
      entities[id] = obj;
      index++;
    }
    return { ids, index, entities };
  }

  zipItems(data: ZipData, state: Items.ItemsState, hash: ModHash): void {
    const z = this.zipList(
      Object.keys(state).map((i) => {
        const obj = state[i];
        const g = this.zipTruthyBool(obj.ignore);

        return {
          bare: this.zipFields([
            i,
            g,
            this.zipTruthyString(obj.beltId),
            this.zipTruthyString(obj.wagonId),
            this.zipTruthyString(obj.recipeId),
            this.zipTruthyBool(obj.checked),
          ]),
          hash: this.zipFields([
            this.zipTruthyNString(i, hash.items),
            g,
            this.zipTruthyNString(obj.beltId, hash.belts),
            this.zipTruthyNString(obj.wagonId, hash.wagons),
            this.zipTruthyNString(obj.recipeId, hash.recipes),
            this.zipTruthyBool(obj.checked),
          ]),
        };
      })
    );

    if (z.bare.length) {
      data.config.bare += `&${Section.Items}=${z.bare}`;
      data.config.hash += `&${Section.Items}${z.hash}`;
    }
  }

  unzipItems(params: Entities, hash?: ModHash): Items.ItemsState {
    const list = params[Section.Items].split(LISTSEP);
    const entities: Items.ItemsState = {};
    for (const item of list) {
      const s = item.split(FIELDSEP);
      let i = 0;
      let id: string;
      let obj: ItemSettings;

      if (hash) {
        id = this.parseNString(s[i++], hash.items) ?? '';
        obj = {
          ignore: this.parseBool(s[i++]),
          beltId: this.parseNString(s[i++], hash.belts),
          wagonId: this.parseNString(s[i++], hash.wagons),
          recipeId: this.parseNString(s[i++], hash.recipes),
          checked: this.parseBool(s[i++]),
        };
      } else {
        id = s[i++];
        obj = {
          ignore: this.parseBool(s[i++]),
          beltId: this.parseString(s[i++]),
          wagonId: this.parseString(s[i++]),
          recipeId: this.parseString(s[i++]),
          checked: this.parseBool(s[i++]),
        };
      }

      this.deleteEmptyKeys(obj);
      entities[id] = obj;
    }
    return entities;
  }

  zipRecipes(data: ZipData, state: Recipes.RecipesState, hash: ModHash): void {
    const z = this.zipList(
      Object.keys(state).map((i) => {
        const obj = state[i];

        return {
          bare: this.zipFields([
            i,
            this.zipTruthyString(obj.factoryId),
            this.zipTruthyArray(obj.factoryModuleIds),
            this.zipTruthyArray(data.recipeBeaconMap[i]),
            this.zipTruthyNumber(obj.overclock),
            this.zipTruthyString(obj.cost),
            this.zipTruthyBool(obj.checked),
          ]),
          hash: this.zipFields([
            this.zipTruthyNString(i, hash.recipes),
            this.zipTruthyNString(obj.factoryId, hash.factories),
            this.zipTruthyNArray(obj.factoryModuleIds, hash.modules),
            this.zipTruthyArray(data.recipeBeaconMap[i]),
            this.zipTruthyNumber(obj.overclock),
            this.zipTruthyString(obj.cost),
            this.zipTruthyBool(obj.checked),
          ]),
        };
      })
    );

    if (z.bare.length) {
      data.config.bare += `&${Section.Recipes}=${z.bare}`;
      data.config.hash += `&${Section.Recipes}${z.hash}`;
    }
  }

  unzipRecipes(
    params: Entities,
    beaconSettings: BeaconSettings[],
    hash?: ModHash
  ): Recipes.RecipesState {
    const list = params[Section.Recipes].split(LISTSEP);
    const entities: Recipes.RecipesState = {};
    for (const recipe of list) {
      const s = recipe.split(FIELDSEP);
      let i = 0;
      let id: string;
      let obj: RecipeSettings;

      if (hash) {
        id = this.parseNString(s[i++], hash.recipes) ?? '';
        obj = {
          factoryId: this.parseNString(s[i++], hash.factories),
          factoryModuleIds: this.parseNArray(s[i++], hash.modules),
          beacons: this.parseArray(s[i++])?.map(
            (i) => beaconSettings[Number(i)] ?? {}
          ),
          overclock: this.parseNumber(s[i++]),
          cost: this.parseString(s[i++]),
          checked: this.parseBool(s[i++]),
        };
      } else {
        id = s[i++];
        obj = {
          factoryId: this.parseString(s[i++]),
          factoryModuleIds: this.parseArray(s[i++]),
          beacons: this.parseArray(s[i++])?.map(
            (i) => beaconSettings[Number(i)] ?? {}
          ),
          overclock: this.parseNumber(s[i++]),
          cost: this.parseString(s[i++]),
          checked: this.parseBool(s[i++]),
        };
      }

      this.deleteEmptyKeys(obj);
      entities[id] = obj;
    }
    return entities;
  }

  zipFactories(
    data: ZipData,
    state: Factories.FactoriesState,
    hash: ModHash
  ): void {
    const ids = state.ids ? ['', ...state.ids] : Object.keys(state.entities);
    const z = this.zipList(
      ids.map((i) => {
        const obj = state.entities[i] || {};
        let h = true;
        if (i === '') {
          i = state.ids == null ? '' : TRUE;
          h = false;
        }
        return {
          bare: this.zipFields([
            i,
            this.zipTruthyArray(obj.moduleRankIds),
            this.zipTruthyString(obj.beaconCount),
            this.zipTruthyArray(obj.beaconModuleRankIds),
            this.zipTruthyString(obj.beaconId),
            this.zipTruthyNumber(obj.overclock),
          ]),
          hash: this.zipFields([
            h ? this.zipTruthyNString(i, hash.factories) : i,
            this.zipTruthyNArray(obj.moduleRankIds, hash.modules),
            this.zipTruthyString(obj.beaconCount),
            this.zipTruthyNArray(obj.beaconModuleRankIds, hash.modules),
            this.zipTruthyNString(obj.beaconId, hash.beacons),
            this.zipTruthyNumber(obj.overclock),
          ]),
        };
      })
    );

    if (z.bare.length) {
      data.config.bare += `&${Section.Factories}=${z.bare}`;
      data.config.hash += `&${Section.Factories}${z.hash}`;
    }
  }

  unzipFactories(params: Entities, hash?: ModHash): Factories.FactoriesState {
    const list = params[Section.Factories].split(LISTSEP);
    let ids: string[] | undefined;
    const entities: Entities<FactorySettings> = {};
    let loadIds = false;
    for (let z = 0; z < list.length; z++) {
      const factory = list[z];
      const s = factory.split(FIELDSEP);
      let i = 0;
      let id: string | undefined;
      let obj: Partial<FactorySettings>;

      if (hash) {
        id = s[i++];
        obj = {
          moduleRankIds: this.parseNArray(s[i++], hash.modules),
          beaconCount: this.parseString(s[i++]),
          beaconModuleRankIds: this.parseNArray(s[i++], hash.modules),
          beaconId: this.parseNString(s[i++], hash.beacons),
          overclock: this.parseNumber(s[i++]),
        };
        if (z === 0 && id === TRUE) {
          loadIds = true;
          ids = [];
          id = '';
        } else {
          if (id) {
            id = this.parseNString(id, hash.factories);
          }
          if (loadIds && ids != null) {
            ids.push(id ?? '');
          }
        }
      } else {
        id = s[i++];
        obj = {
          moduleRankIds: this.parseArray(s[i++]),
          beaconCount: this.parseString(s[i++]),
          beaconModuleRankIds: this.parseArray(s[i++]),
          beaconId: this.parseString(s[i++]),
          overclock: this.parseNumber(s[i++]),
        };
        if (z === 0 && id === TRUE) {
          loadIds = true;
          ids = [];
          id = '';
        } else if (loadIds && ids != null) {
          ids.push(id);
        }
      }

      this.deleteEmptyKeys(obj);
      if (Object.keys(obj).length) {
        entities[id ?? ''] = obj;
      }
    }
    return { ids, entities };
  }

  zipSettings(
    data: ZipData,
    state: Settings.SettingsState,
    hash: ModHash
  ): void {
    const init = Settings.initialSettingsState;
    const z: Zip = {
      bare: this.zipFields([
        this.zipDiffString(state.modId, init.modId),
        this.zipDiffDisplayRate(state.displayRate, init.displayRate),
        this.zipDiffNumber(state.preset, init.preset),
        this.zipDiffArray(state.disabledRecipeIds, init.disabledRecipeIds),
        this.zipDiffString(state.beltId, init.beltId),
        this.zipDiffString(state.fuelId, init.fuelId),
        this.zipDiffNumber(state.flowRate, init.flowRate),
        this.zipDiffNumber(state.miningBonus, init.miningBonus),
        this.zipDiffNumber(state.researchSpeed, init.researchSpeed),
        this.zipDiffNumber(state.inserterCapacity, init.inserterCapacity),
        this.zipDiffNumber(state.inserterTarget, init.inserterTarget),
        this.zipDiffString(state.cargoWagonId, init.cargoWagonId),
        this.zipDiffString(state.fluidWagonId, init.fluidWagonId),
        this.zipDiffString(state.pipeId, init.pipeId),
        this.zipDiffString(state.costFactor, init.costFactor),
        this.zipDiffString(state.costFactory, init.costFactory),
        this.zipDiffString(state.costInput, init.costInput),
        this.zipDiffString(state.costIgnored, init.costIgnored),
        this.zipDiffString(state.beaconReceivers, init.beaconReceivers),
        this.zipDiffString(state.proliferatorSprayId, init.proliferatorSprayId),
      ]),
      hash: this.zipFields([
        this.zipDiffDisplayRate(state.displayRate, init.displayRate),
        this.zipDiffNumber(state.preset, init.preset),
        this.zipDiffNArray(
          state.disabledRecipeIds,
          init.disabledRecipeIds,
          hash.recipes
        ),
        this.zipDiffNString(state.beltId, init.beltId, hash.belts),
        this.zipDiffNString(state.fuelId, init.fuelId, hash.fuels),
        this.zipDiffNNumber(state.flowRate, init.flowRate),
        this.zipDiffNNumber(state.miningBonus, init.miningBonus),
        this.zipDiffNNumber(state.researchSpeed, init.researchSpeed),
        this.zipDiffNumber(state.inserterCapacity, init.inserterCapacity),
        this.zipDiffNumber(state.inserterTarget, init.inserterTarget),
        this.zipDiffNString(state.cargoWagonId, init.cargoWagonId, hash.wagons),
        this.zipDiffNString(state.fluidWagonId, init.fluidWagonId, hash.wagons),
        this.zipDiffNString(state.pipeId, init.pipeId, hash.belts),
        this.zipDiffString(state.costFactor, init.costFactor),
        this.zipDiffString(state.costFactory, init.costFactory),
        this.zipDiffString(state.costInput, init.costInput),
        this.zipDiffString(state.costIgnored, init.costIgnored),
        this.zipDiffString(state.beaconReceivers, init.beaconReceivers),
        this.zipDiffNString(
          state.proliferatorSprayId,
          init.proliferatorSprayId,
          hash.modules
        ),
      ]),
    };

    if (z.bare.length) {
      data.config.bare += `&${Section.Settings}=${encodeURIComponent(z.bare)}`;
      data.config.hash += `&${Section.Settings}${z.hash}`;
    }
  }

  unzipSettings(
    params: Entities,
    hash?: ModHash
  ): Partial<Settings.SettingsState> {
    const zip = params[Section.Settings];
    const s = zip.split(FIELDSEP);
    let i = 0;
    let obj: Partial<Settings.SettingsState>;

    if (hash) {
      obj = {
        displayRate: this.parseDisplayRate(s[i++]),
        preset: this.parseNumber(s[i++]),
        disabledRecipeIds: this.parseNArray(s[i++], hash.recipes),
        beltId: this.parseNString(s[i++], hash.belts),
        fuelId: this.parseNString(s[i++], hash.fuels),
        flowRate: this.parseNNumber(s[i++]),
        miningBonus: this.parseNNumber(s[i++]),
        researchSpeed: this.parseNNumber(s[i++]),
        inserterCapacity: this.parseNumber(s[i++]),
        inserterTarget: this.parseNumber(s[i++]),
        cargoWagonId: this.parseNString(s[i++], hash.wagons),
        fluidWagonId: this.parseNString(s[i++], hash.wagons),
        pipeId: this.parseNString(s[i++], hash.belts),
        costFactor: this.parseString(s[i++]),
        costFactory: this.parseString(s[i++]),
        costInput: this.parseString(s[i++]),
        costIgnored: this.parseString(s[i++]),
        beaconReceivers: this.parseString(s[i++]),
        proliferatorSprayId: this.parseNString(s[i++], hash.modules),
      };
    } else {
      obj = {
        modId: this.parseString(s[i++]),
        displayRate: this.parseDisplayRate(s[i++]),
        preset: this.parseNumber(s[i++]),
        disabledRecipeIds: this.parseArray(s[i++]),
        beltId: this.parseString(s[i++]),
        fuelId: this.parseString(s[i++]),
        flowRate: this.parseNumber(s[i++]),
        miningBonus: this.parseNumber(s[i++]),
        researchSpeed: this.parseNumber(s[i++]),
        inserterCapacity: this.parseNumber(s[i++]),
        inserterTarget: this.parseNumber(s[i++]),
        cargoWagonId: this.parseString(s[i++]),
        fluidWagonId: this.parseString(s[i++]),
        pipeId: this.parseString(s[i++]),
        costFactor: this.parseString(s[i++]),
        costFactory: this.parseString(s[i++]),
        costInput: this.parseString(s[i++]),
        costIgnored: this.parseString(s[i++]),
        beaconReceivers: this.parseString(s[i++]),
        proliferatorSprayId: this.parseString(s[i++]),
      };
    }

    this.deleteEmptyKeys(obj);
    return obj;
  }

  zipList(list: Zip[]): Zip {
    return {
      bare: encodeURIComponent(list.map((i) => i.bare).join(LISTSEP)),
      hash: list.map((i) => i.hash).join(LISTSEP),
    };
  }

  zipFields(fields: string[]): string {
    return fields.join(FIELDSEP).replace(/\**$/, '');
  }

  zipTruthyString(value: string | undefined): string {
    return value == null ? '' : value;
  }

  zipTruthyNumber(value: number | undefined): string {
    return value == null ? '' : value.toString();
  }

  zipTruthyBool(value: boolean | undefined): string {
    return value == null ? '' : value ? TRUE : FALSE;
  }

  zipTruthyArray(value: string[] | number[] | undefined): string {
    return value == null ? '' : value.length ? value.join(ARRAYSEP) : EMPTY;
  }

  zipTruthyNString(value: string | undefined, hash: string[]): string {
    return value == null ? '' : this.getId(hash.indexOf(value));
  }

  zipTruthyNArray(value: string[] | undefined, hash: string[]): string {
    return value == null
      ? ''
      : value.length
      ? value.map((v) => this.getId(hash.indexOf(v))).join(ARRAYSEP)
      : EMPTY;
  }

  zipDiffString(
    value: string | null | undefined,
    init: string | null | undefined
  ): string {
    return value === init ? '' : value == null ? NULL : value;
  }

  zipDiffNumber(value: number | undefined, init: number | undefined): string {
    return value === init ? '' : value == null ? NULL : value.toString();
  }

  zipDiffDisplayRate(
    value: DisplayRate | undefined,
    init: DisplayRate | undefined
  ): string {
    if (value === init) {
      return '';
    }
    switch (value) {
      case DisplayRate.PerSecond:
        return '0';
      case DisplayRate.PerMinute:
        return '1';
      case DisplayRate.PerHour:
        return '2';
      default:
        return NULL;
    }
  }

  zipDiffBool(value: boolean | undefined, init: boolean | undefined): string {
    return value === init ? '' : value == null ? NULL : value ? TRUE : FALSE;
  }

  zipDiffArray(
    value: string[] | undefined,
    init: string[] | undefined
  ): string {
    const zVal =
      value != null
        ? value.length > 0
          ? [...value].sort().join(ARRAYSEP)
          : EMPTY
        : NULL;
    const zInit =
      init != null
        ? init.length > 0
          ? [...init].sort().join(ARRAYSEP)
          : EMPTY
        : NULL;
    return zVal === zInit ? '' : zVal;
  }

  zipDiffRank(value: string[] | undefined, init: string[] | undefined): string {
    const zVal = value ? (value.length ? value.join(ARRAYSEP) : EMPTY) : NULL;
    const zInit = init ? (init.length ? init.join(ARRAYSEP) : EMPTY) : NULL;
    return zVal === zInit ? '' : zVal;
  }

  zipDiffNString(
    value: string | undefined,
    init: string | undefined,
    hash: string[]
  ): string {
    return value === init
      ? ''
      : value == null
      ? NULL
      : this.getId(hash.indexOf(value));
  }

  zipDiffNNumber(value: number | undefined, init: number | undefined): string {
    return value === init ? '' : value == null ? NULL : this.getId(value);
  }

  zipDiffNArray(
    value: string[] | undefined,
    init: string[] | undefined,
    hash: string[]
  ): string {
    const zVal =
      value != null
        ? value.length > 0
          ? value
              .map((v) => this.getId(hash.indexOf(v)))
              .sort()
              .join(ARRAYSEP)
          : EMPTY
        : NULL;
    const zInit =
      init != null
        ? init.length > 0
          ? init
              .map((v) => this.getId(hash.indexOf(v)))
              .sort()
              .join(ARRAYSEP)
          : EMPTY
        : NULL;
    return zVal === zInit ? '' : zVal;
  }

  zipDiffNRank(
    value: string[] | undefined,
    init: string[] | undefined,
    hash: string[]
  ): string {
    const zVal = value
      ? value.length
        ? value.map((v) => this.getId(hash.indexOf(v))).join(ARRAYSEP)
        : EMPTY
      : NULL;
    const zInit = init
      ? init.length
        ? init.map((v) => this.getId(hash.indexOf(v))).join(ARRAYSEP)
        : EMPTY
      : NULL;
    return zVal === zInit ? '' : zVal;
  }

  parseString(value: string | undefined): string | undefined {
    if (!value?.length || value === NULL) {
      return undefined;
    }
    return value;
  }

  parseBool(value: string | undefined): boolean | undefined {
    if (!value?.length || value === NULL) {
      return undefined;
    }
    return value === TRUE;
  }

  parseNumber(value: string | undefined): number | undefined {
    if (!value?.length || value === NULL) {
      return undefined;
    }
    return Number(value);
  }

  parseDisplayRate(value: string | undefined): DisplayRate | undefined {
    if (!value?.length || value === NULL) {
      return undefined;
    }
    switch (value) {
      case '0':
        return DisplayRate.PerSecond;
      case '1':
        return DisplayRate.PerMinute;
      case '2':
        return DisplayRate.PerHour;
      default:
        return undefined;
    }
  }

  parseArray(value: string | undefined): string[] | undefined {
    if (!value?.length || value === NULL) {
      return undefined;
    }
    return value === EMPTY ? [] : value.split(ARRAYSEP);
  }

  parseNString(value: string | undefined, hash: string[]): string | undefined {
    const v = this.parseString(value);
    if (v == null) {
      return v;
    }
    return hash[this.getN(v)];
  }

  parseNNumber(value: string | undefined): number | undefined {
    if (!value?.length || value === NULL) {
      return undefined;
    }
    return this.getN(value);
  }

  parseNArray(value: string | undefined, hash: string[]): string[] | undefined {
    const v = this.parseArray(value);
    if (v == null) {
      return v;
    }
    return v.map((a) => hash[this.getN(a)]);
  }

  getId(n: number): string {
    if (n / MAX >= 1) {
      return this.getId(Math.floor(n / MAX)) + this.getId(n % MAX);
    } else {
      return BASE64ABC[n];
    }
  }

  getN(id: string): number {
    const n = INVERT[id[0]];
    if (id.length > 1) {
      id = id.substring(1);
      return n * Math.pow(MAX, id.length) + this.getN(id);
    } else {
      return n;
    }
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

  inflateSafe(str: string): string {
    try {
      return this.inflate(str);
    } catch {
      console.warn(
        'Router failed to parse url, checking for missing trailing characters...'
      );
    }
    try {
      return this.inflateMend(str, '-');
    } catch {
      // ignore error
    }
    try {
      return this.inflateMend(str, '.');
    } catch {
      // ignore error
    }
    return this.inflateMend(str, '_');
  }

  inflateMend(str: string, char: string): string {
    const z = this.inflate(str + char);
    if (!z) throw new Error('Failed to parse, generated empty string');
    console.warn(`Router mended url by appending '${char}'`);
    return z;
  }

  inflate(str: string): string {
    return inflate(this.base64ToBytes(str), { to: 'string' });
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

  deleteEmptyKeys<T extends object>(obj: T): void {
    (Object.keys(obj) as (keyof T)[])
      .filter((k) => obj[k] === undefined)
      .forEach((k) => delete obj[k]);
  }
}

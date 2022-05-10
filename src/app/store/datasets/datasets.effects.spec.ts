import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore } from '@ngrx/store/testing';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, of, ReplaySubject } from 'rxjs';

import { Mocks, TestModule } from 'src/tests';
import { ModData, ModHash, ModI18n } from '~/models';
import { LabState } from '../';
import * as App from '../app.actions';
import * as Products from '../products';
import * as Settings from '../settings';
import * as Actions from './datasets.actions';
import { DatasetsEffects } from './datasets.effects';

describe('DatasetsEffects', () => {
  let effects: DatasetsEffects;
  let actions: ReplaySubject<any>;
  let http: HttpTestingController;
  let mockStore: MockStore<LabState>;
  let translateSvc: TranslateService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TestModule],
      providers: [provideMockActions(() => actions), DatasetsEffects],
    });

    effects = TestBed.inject(DatasetsEffects);
    http = TestBed.inject(HttpTestingController);
    mockStore = TestBed.inject(MockStore);
    translateSvc = TestBed.inject(TranslateService);
  });

  describe('constructor', () => {
    it('should watch for language changes', () => {
      spyOn(effects, 'requestData').and.returnValue(EMPTY);
      translateSvc.use('test');
      expect(effects.requestData).toHaveBeenCalledWith('1.1');
    });
  });

  describe('appLoad$', () => {
    it('should load the default base mod', () => {
      spyOn(effects, 'requestData').and.returnValue(
        of([Mocks.BaseData, Mocks.I18n, Mocks.Hash])
      );
      actions = new ReplaySubject(1);
      actions.next(new App.LoadAction({}));
      const result: Action[] = [];
      effects.appLoad$.subscribe((r) => result.push(r));
      expect(result).toEqual([
        new Products.ResetAction(Mocks.Base.items[0].id),
      ]);
    });

    it('should load from state', () => {
      spyOn(effects, 'requestData').and.returnValue(
        of([Mocks.BaseData, Mocks.I18n, Mocks.Hash])
      );
      actions = new ReplaySubject(1);
      actions.next(
        new App.LoadAction({
          settingsState: { baseId: Mocks.Base.id },
          productsState: Products.initialProductsState,
        })
      );
      const result: Action[] = [];
      effects.appLoad$.subscribe((r) => result.push(r));
      expect(result).toEqual([]);
    });
  });

  describe('appReset$', () => {
    it('should reset and load mod for new mod', () => {
      spyOn(effects, 'requestData').and.returnValue(
        of([Mocks.BaseData, Mocks.I18n, Mocks.Hash])
      );
      actions = new ReplaySubject(1);
      actions.next(new App.ResetAction());
      const result: Action[] = [];
      effects.appReset$.subscribe((r) => result.push(r));
      expect(result).toEqual([
        new Products.ResetAction(Mocks.Base.items[0].id),
      ]);
    });
  });

  describe('setBaseId$', () => {
    it('should reset and load mod for new mod', () => {
      spyOn(effects, 'requestData').and.returnValue(
        of([Mocks.BaseData, Mocks.I18n, Mocks.Hash])
      );
      actions = new ReplaySubject(1);
      actions.next(new Settings.SetBaseAction(Mocks.Base.id));
      const result: Action[] = [];
      effects.setBaseId$.subscribe((r) => result.push(r));
      expect(result).toEqual([
        new Products.ResetAction(Mocks.Base.items[0].id),
      ]);
    });
  });

  describe('requestData', () => {
    it('should set up http requests for data', () => {
      spyOn(mockStore, 'dispatch');
      spyOn(effects, 'loadModsForBase');
      http.expectOne(`data/${Mocks.Base.id}/data.json`).flush(Mocks.BaseData);
      http.expectOne(`data/${Mocks.Base.id}/hash.json`).flush(Mocks.Hash);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        new Actions.LoadModDataAction({
          id: Mocks.Base.id,
          value: Mocks.BaseData,
        })
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        new Actions.LoadModHashAction({ id: Mocks.Base.id, value: Mocks.Hash })
      );
      expect(effects.loadModsForBase).toHaveBeenCalledWith(
        Mocks.BaseData.defaults!.modIds
      );
    });

    it('should get values from cache', () => {
      translateSvc.use('zh');
      effects.cacheData['id'] = Mocks.BaseData;
      effects.cacheI18n['id-zh'] = Mocks.I18n;
      effects.cacheHash['id'] = Mocks.Hash;
      let data: [ModData, ModI18n | null, ModHash | null] | undefined;
      effects.requestData('id').subscribe((d) => (data = d));
      expect(data).toEqual([Mocks.BaseData, Mocks.I18n, Mocks.Hash]);
    });

    it('should handle null defaults and skip hash', () => {
      spyOn(effects, 'loadModsForBase');
      let data: [ModData, ModI18n | null, ModHash | null] | undefined;
      effects.requestData('id', true).subscribe((d) => (data = d));
      const baseData = { ...Mocks.BaseData, ...{ defaults: undefined } };
      http.expectOne('data/id/data.json').flush(baseData);
      expect(effects.loadModsForBase).toHaveBeenCalledWith([]);
      expect(data).toEqual([baseData, null, null]);
    });

    it('should handle missing translations', () => {
      spyOn(console, 'warn');
      translateSvc.use('err');
      effects.cacheData['id'] = Mocks.BaseData;
      effects.cacheHash['id'] = Mocks.Hash;
      let data: [ModData, ModI18n | null, ModHash | null] | undefined;
      effects.requestData('id').subscribe((d) => (data = d));
      http.expectOne('data/id/i18n/err.json').error(new ProgressEvent('error'));
      expect(data).toEqual([Mocks.BaseData, null, Mocks.Hash]);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should load translation data', () => {
      translateSvc.use('zh');
      effects.cacheData['id'] = Mocks.BaseData;
      effects.cacheHash['id'] = Mocks.Hash;
      let data: [ModData, ModI18n | null, ModHash | null] | undefined;
      effects.requestData('id').subscribe((d) => (data = d));
      http.expectOne('data/id/i18n/zh.json').flush(Mocks.I18n);
      expect(data).toEqual([Mocks.BaseData, Mocks.I18n, Mocks.Hash]);
    });
  });

  describe('loadModsForBase', () => {
    it('should load a list of mods', () => {
      spyOn(effects, 'requestData').and.returnValue(
        of([Mocks.BaseData, Mocks.I18n, Mocks.Hash])
      );
      effects.loadModsForBase([Mocks.Mod1.id]);
      expect(effects.requestData).toHaveBeenCalledTimes(1);
    });
  });

  describe('load', () => {
    it('should load stored mod', () => {
      spyOn(effects, 'requestData').and.returnValue(
        of([Mocks.BaseData, Mocks.I18n, Mocks.Hash])
      );
      spyOn(mockStore, 'dispatch');
      effects.load(
        '',
        { settingsState: { baseId: Mocks.Base.id } as any },
        Settings.initialSettingsState
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        new Products.ResetAction(Mocks.Base.items[0].id)
      );
    });
  });
});

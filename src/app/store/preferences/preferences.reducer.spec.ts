import { Column, Language, PowerUnit, SimplexType, Theme } from '~/models';
import * as App from '../app.actions';
import * as Actions from './preferences.actions';
import {
  initialPreferencesState,
  preferencesReducer,
} from './preferences.reducer';

describe('Preferences Reducer', () => {
  const id = 'id';
  const value = 'value';

  describe('RESET', () => {
    it('should return the initial state', () => {
      const result = preferencesReducer(undefined, new App.ResetAction());
      expect(result).toEqual(initialPreferencesState);
    });
  });

  describe('SAVE_STATE', () => {
    it('should save the specified state', () => {
      const result = preferencesReducer(
        undefined,
        new Actions.SaveStateAction({ id, value })
      );
      expect(result.states).toEqual({ [id]: value });
    });
  });

  describe('REMOVE_STATE', () => {
    it('should remove the specified state', () => {
      const result = preferencesReducer(
        { states: { [id]: value } } as any,
        new Actions.RemoveStateAction(id)
      );
      expect(result.states).toEqual({});
    });
  });

  describe('SET_COLUMNS', () => {
    it('should set the columns state', () => {
      const columns = { [Column.Power]: { show: true } } as any;
      const result = preferencesReducer(
        undefined,
        new Actions.SetColumnsAction(columns)
      );
      expect(result.columns).toEqual(columns);
    });

    it('should reset power unit if power column is hidden', () => {
      const result = preferencesReducer(
        { powerUnit: PowerUnit.MW } as any,
        new Actions.SetColumnsAction({ [Column.Power]: {} } as any)
      );
      expect(result.powerUnit).toEqual(PowerUnit.Auto);
    });
  });

  describe('SET_SIMPLEX_TYPE', () => {
    it('should set the simplex type', () => {
      const result = preferencesReducer(
        undefined,
        new Actions.SetSimplexTypeAction(SimplexType.JsBigIntRational)
      );
      expect(result.simplexType).toEqual(SimplexType.JsBigIntRational);
    });
  });

  describe('SET_LANGUAGE', () => {
    it('should set the language', () => {
      const result = preferencesReducer(
        undefined,
        new Actions.SetLanguageAction(Language.Chinese)
      );
      expect(result.language).toEqual(Language.Chinese);
    });
  });

  describe('SET_POWER_UNIT', () => {
    it('should set the power unit', () => {
      const result = preferencesReducer(
        undefined,
        new Actions.SetPowerUnitAction(PowerUnit.MW)
      );
      expect(result.powerUnit).toEqual(PowerUnit.MW);
    });
  });

  describe('SET_THEME', () => {
    it('should set the power unit', () => {
      const result = preferencesReducer(
        undefined,
        new Actions.SetThemeAction(Theme.Dark)
      );
      expect(result.theme).toEqual(Theme.Dark);
    });
  });

  it('should return the default state', () => {
    expect(preferencesReducer(undefined, { type: 'Test' } as any)).toEqual(
      initialPreferencesState
    );
  });
});

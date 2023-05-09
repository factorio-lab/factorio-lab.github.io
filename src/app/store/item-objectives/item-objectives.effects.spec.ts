import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';

import { DisplayRate } from '~/models';
import * as Settings from '../settings';
import * as Actions from './item-objectives.actions';
import { ItemObjectivesEffects } from './item-objectives.effects';

describe('ItemObjectivesEffects', () => {
  let effects: ItemObjectivesEffects;
  let actions: ReplaySubject<any>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions), ItemObjectivesEffects],
    });

    effects = TestBed.inject(ItemObjectivesEffects);
  });

  describe('adjustDisplayRate$', () => {
    it('should dispatch an action to adjust objective rates', () => {
      actions = new ReplaySubject(1);
      actions.next(
        new Settings.SetDisplayRateAction({
          value: DisplayRate.PerSecond,
          prev: DisplayRate.PerMinute,
        })
      );
      const results: Action[] = [];
      effects.adjustDisplayRate$.subscribe((a) => results.push(a));
      expect(results).toEqual([new Actions.AdjustDisplayRateAction('1/60')]);
    });
  });
});

import { TestBed } from '@angular/core/testing';

import { rational } from '~/models';
import { TrackService } from './track.service';

describe('TrackService', () => {
  let service: TrackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackById', () => {
    it('should return an object id', () => {
      expect(service.trackById(0, { id: 'id' })).toEqual('id');
    });
  });

  describe('trackByKey', () => {
    it('should return an object key', () => {
      expect(service.trackByKey(0, { key: 'key', value: 'value' })).toEqual(
        'key',
      );
    });
  });

  describe('trackByIndex', () => {
    it('should return a string by index only', () => {
      expect(service.trackByIndex(0, { key: 'key', value: 'value' })).toEqual(
        '0',
      );
    });
  });

  describe('sortByValue', () => {
    it('should return a diff', () => {
      expect(
        service.sortByValue(
          { key: 'a', value: rational(1n) },
          { key: 'b', value: rational(2n) },
        ),
      ).toEqual(1);
    });
  });
});

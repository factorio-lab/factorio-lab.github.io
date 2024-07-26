import { ItemId, Mocks } from 'src/tests';
import { Entities } from '~/models';
import { StoreUtility } from './store.utility';

describe('StoreUtility', () => {
  describe('rankEquals', () => {
    it('should check lengths', () => {
      expect(StoreUtility.rankEquals(['a'], ['a', 'b'])).toBeFalse();
    });

    it('should honor order', () => {
      expect(StoreUtility.rankEquals(['a', 'b'], ['b', 'a'])).toBeFalse();
    });

    it('should check equal ranks', () => {
      expect(StoreUtility.rankEquals(['a', 'b'], ['a', 'b'])).toBeTrue();
    });

    it('should handle null comparison value', () => {
      expect(StoreUtility.rankEquals(['a'], undefined)).toBeFalse();
    });
  });

  describe('arrayEquals', () => {
    it('should check lengths', () => {
      expect(StoreUtility.arrayEquals(['a'], ['a', 'b'])).toBeFalse();
    });

    it('should ignore order', () => {
      expect(StoreUtility.arrayEquals(['a', 'b'], ['b', 'a'])).toBeTrue();
    });

    it('should check equal arrays', () => {
      expect(StoreUtility.arrayEquals(['a', 'b'], ['a', 'b'])).toBeTrue();
    });

    it('should handle null comparison value', () => {
      expect(StoreUtility.arrayEquals(['a'], undefined)).toBeFalse();
    });
  });

  describe('payloadEquals', () => {
    it('should validate array payload equality', () => {
      expect(
        StoreUtility.payloadEquals({
          id: 'id',
          value: ['a', 'b'],
          def: ['a', 'b'],
        }),
      ).toBeTrue();
      expect(
        StoreUtility.payloadEquals({
          id: 'id',
          value: ['a', 'b'],
          def: ['a', 'c'],
        }),
      ).toBeFalse();
    });

    it('should validate value payload equality', () => {
      expect(
        StoreUtility.payloadEquals({
          id: 'id',
          value: 'a',
          def: 'a',
        }),
      ).toBeTrue();
      expect(
        StoreUtility.payloadEquals({
          id: 'id',
          value: 'a',
          def: 'b',
        }),
      ).toBeFalse();
    });

    it('should validate rank payload equality', () => {
      expect(
        StoreUtility.payloadEquals(
          {
            id: 'id',
            value: ['a', 'b'],
            def: ['a', 'b'],
          },
          true,
        ),
      ).toBeTrue();
      expect(
        StoreUtility.payloadEquals(
          {
            id: 'id',
            value: ['a', 'b'],
            def: ['b', 'a'],
          },
          true,
        ),
      ).toBeFalse();
    });
  });

  describe('resetFields', () => {
    it('should reset multiple fields', () => {
      const result = StoreUtility.resetFields(
        {
          [Mocks.Item1.id]: {
            excluded: true,
            belt: ItemId.TransportBelt,
            machine: ItemId.AssemblingMachine1,
          },
        },
        ['excluded', 'belt'],
      );
      expect(result[Mocks.Item1.id]).toEqual({
        machine: ItemId.AssemblingMachine1,
      } as any);
    });
  });

  describe('resetField', () => {
    it('should reset changes to a field', () => {
      const result = StoreUtility.resetField(
        { [Mocks.Item1.id]: { excluded: true, belt: ItemId.TransportBelt } },
        'excluded',
      );
      expect(result[Mocks.Item1.id]).toEqual({
        belt: ItemId.TransportBelt,
      } as any);
    });

    it('should delete an entity if no modifications remain', () => {
      const result = StoreUtility.resetField(
        { [Mocks.Item1.id]: { excluded: true } },
        'excluded',
      );
      expect(result[Mocks.Item1.id]).toBeUndefined();
    });

    it('should reset a field for a specific id', () => {
      const result = StoreUtility.resetField(
        { [Mocks.Item1.id]: { excluded: true, belt: ItemId.TransportBelt } },
        'excluded',
        Mocks.Item1.id,
      );
      expect(result[Mocks.Item1.id]).toEqual({
        belt: ItemId.TransportBelt,
      } as any);
    });
  });

  describe('compareReset', () => {
    const id = 'id';
    const field = 'test';

    it('should set field when not equal to default', () => {
      const payload = { id, value: 'a', def: 'b' };
      const result = StoreUtility.compareReset(
        { [id]: { [field]: '' } },
        field,
        payload,
      );
      expect(result[id][field]).toEqual('a');
    });

    it('should do nothing if null and equal to default', () => {
      const payload = { id, value: 'a', def: 'a' };
      const result = StoreUtility.compareReset(
        { [id]: { [field]: '' } },
        field,
        payload,
      );
      expect(result).toEqual({});
    });

    it('should delete field when equal to default', () => {
      const payload = { id, value: 'a', def: 'a' };
      const result = StoreUtility.compareReset(
        { [id]: { other: 'b', [field]: 'b' } },
        field,
        payload,
      );
      expect(result[id][field]).toBeUndefined();
    });

    it('should delete entry when equal to default and no other entries', () => {
      const payload = { id, value: 'a', def: 'a' };
      const result = StoreUtility.compareReset(
        { [id]: { [field]: 'value' } },
        field,
        payload,
      );
      expect(result).toEqual({} as any);
    });
  });

  describe('setValue', () => {
    it('should clean up object if setting to undefined', () => {
      const entities: Entities<{ value?: string }> = { id: { value: 'value' } };
      expect(
        StoreUtility.setValue(entities, 'value', {
          id: 'id',
          value: undefined,
        }),
      ).toEqual({});
    });
  });

  describe('compareValue', () => {
    it('should return null if equal to default', () => {
      expect(
        StoreUtility.compareValue({ value: 'a', def: 'a' }),
      ).toBeUndefined();
    });

    it('should return value if not equal to default', () => {
      expect(StoreUtility.compareValue({ value: 'a', def: 'b' })).toEqual('a');
    });
  });

  describe('compareValues', () => {
    it('should return null if equal to default', () => {
      expect(
        StoreUtility.compareValues({ value: ['a', 'b'], def: ['b', 'a'] }),
      ).toBeUndefined();
    });

    it('should return value if not equal to default', () => {
      expect(
        StoreUtility.compareValues({ value: ['a'], def: ['b', 'a'] }),
      ).toEqual(['a']);
    });
  });

  describe('compareRank', () => {
    it('should return null if equal to default', () => {
      expect(StoreUtility.compareRank(['a', 'b'], ['a', 'b'])).toBeUndefined();
    });

    it('should return value if not equal to default', () => {
      expect(StoreUtility.compareRank(['a', 'b'], ['b', 'a'])).toEqual([
        'a',
        'b',
      ]);
    });
  });

  describe('resetFieldIndex', () => {
    it('should reset changes to a subfield of an array field at an index', () => {
      const result = StoreUtility.resetFieldIndex(
        { [Mocks.Item1.id]: { beacons: [{ count: '1', id: ItemId.Beacon }] } },
        'beacons',
        'count',
        0,
      );
      expect(result[Mocks.Item1.id]).toEqual({
        beacons: [{ id: ItemId.Beacon }],
      } as any);
    });

    it('should delete an entity if no modifications remain', () => {
      const result = StoreUtility.resetFieldIndex(
        { [Mocks.Item1.id]: { beacons: [{ count: '1' }] } },
        'beacons',
        'count',
        0,
      );
      expect(result[Mocks.Item1.id]).toBeUndefined();
    });

    it('should reset changes to a subfield of an array field at an index for a specific id', () => {
      const result = StoreUtility.resetFieldIndex(
        {
          [Mocks.Item1.id]: { beacons: [{ count: '1', id: ItemId.Beacon }] },
          [Mocks.Item2.id]: { beacons: [{ count: '2' }] },
        },
        'beacons',
        'count',
        0,
        Mocks.Item1.id,
      );
      expect(result[Mocks.Item1.id]).toEqual({
        beacons: [{ id: ItemId.Beacon }],
      } as any);
      expect(result[Mocks.Item2.id]).toEqual({
        beacons: [{ count: '2' }],
      } as any);
    });
  });
});

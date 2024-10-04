import { filter, OperatorFunction } from 'rxjs';
import { environment } from 'src/environments';

import { APP } from '~/models/constants';
import { ItemId } from '~/models/enum/item-id';
import { Option } from '~/models/option';
import { Rational, rational } from '~/models/rational';
import {
  Entities,
  Optional,
  PickNonNullish,
  RecursivePartial,
} from '~/models/utils';

export function addValueToRecordByIds(
  record: Entities<Rational>,
  ids: string[],
  value: Rational,
): void {
  ids.forEach((id) => {
    if (!record[id]) {
      record[id] = rational.zero;
    }

    record[id] = record[id].add(value);
  });
}

/** Compare arrays. Empty arrays are considered equal to nullish arrays. */
export function areArraysEqual<T>(
  a: Optional<T[]>,
  b: Optional<T[]>,
  compareFn: (a: T, b: T) => boolean = (a, b) => a === b,
): boolean {
  if (!a?.length) return !b?.length;
  if (!b?.length) return false;
  return a.length === b.length && a.every((ae, i) => compareFn(ae, b[i]));
}

export function areEntitiesEqual<T>(
  a: Optional<Entities<T>>,
  b: Optional<Entities<T>>,
  compareFn: (a: T, b: T) => boolean = (a, b) => a === b,
): boolean {
  if (a == null) return b == null || !Object.keys(b).length;
  if (b == null) return !Object.keys(a).length;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length && aKeys.every((k) => compareFn(a[k], b[k]))
  );
}

export function asString(value: Optional<string | string[]>): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Function equivalent to `value ?? fallback`. Primarily intended to reduce test
 * branch surface area where nullable values are present.
 */
export function coalesce<T>(value: Optional<T>, fallback: T): T {
  return value ?? fallback;
}

export function cloneEntities<T>(value: Entities<T>): Entities<T>;
export function cloneEntities<T>(
  value: Optional<Entities<T>>,
): Optional<Entities<T>>;
export function cloneEntities<T>(
  value: Optional<Entities<T>>,
): Optional<Entities<T>> {
  if (value == null) return;
  return spread(value);
}

export function compareRank(
  value: string[],
  def: string[],
): Optional<string[]> {
  if (value.length === def.length && value.every((v, i) => v === def[i]))
    return undefined;

  return value;
}

export function compareSet<T>(value: Set<T>, def: Set<T>): Optional<Set<T>> {
  if (value.size !== def.size) return value;
  return Array.from(value).every((v) => def.has(v)) ? undefined : value;
}

export function contains<T>(entities: Entities<T>, value: T): boolean {
  return Object.keys(entities).some((k) => entities[k] === value);
}

/** Filters an Observable for only values which are not nullish */
export function filterNullish<T>(): OperatorFunction<T, NonNullable<T>> {
  return filter(notNullish);
}

/**
 * Filters an Observable for only values where a specific property of the object
 * is not nullish
 */
export function filterPropsNullish<T, S extends keyof T>(
  ...keys: S[]
): OperatorFunction<T, T & Required<Pick<T, S>>> {
  return filter(fnPropsNotNullish(...keys));
}

/**
 * Returns a function that validates whether specific properties of an object
 * are not nullish
 */
export function fnPropsNotNullish<T, S extends keyof T>(...keys: S[]) {
  return (value: T): value is T & PickNonNullish<T, S> =>
    keys.every((key) => value[key] != null);
}

export function getIdOptions(
  ids: string[],
  entities: Entities<{ name: string }>,
  emptyModule = false,
): Option[] {
  const list = ids.map((i): Option => ({ label: entities[i].name, value: i }));
  if (emptyModule) list.unshift({ label: 'None', value: ItemId.Module });
  return list;
}

/** Simple memoization function for single-input, single-output functions */
export function memoize<I, O>(fn: (i: I) => O): (i: I) => O {
  const cache = new Map<I, O>();
  return (i: I): O => {
    let o = cache.get(i);
    if (o != null) return o;

    o = fn(i);
    cache.set(i, o);
    return o;
  };
}

/** Returns a boolean indicating whether the passed value is not nullish */
export function notNullish<T>(value: T): value is NonNullable<T> {
  return value != null;
}

/**
 * Returns a boolean indicating whether a specific property of an object is not
 * nullish
 */
export function propsNotNullish<T, S extends keyof T>(
  value: T,
  ...keys: S[]
): value is T & Required<Pick<T, S>> {
  return fnPropsNotNullish<T, S>(...keys)(value);
}

/** Deletes any keys that are undefined */
export function prune(obj: object): void {
  const cast = obj as Record<string, unknown>;
  const keys = Object.keys(cast);
  keys.filter((k) => cast[k] === undefined).forEach((k) => delete cast[k]);
}

export function reduceEntities(
  value: Entities<string[]>,
  init: Entities<Entities<boolean>> = {},
): Entities<Entities<boolean>> {
  return Object.keys(value).reduce((e: Entities<Entities<boolean>>, x) => {
    e[x] = toBoolEntities(value[x], init[x]);
    return e;
  }, init);
}

/** Spread, but ensures type safety of the object to be applied */
export function spread<T>(obj: T, ...apply: RecursivePartial<T>[]): T {
  if (apply.length === 0) return { ...obj };
  for (const a of apply) obj = { ...obj, ...a };
  return obj;
}

export function toBoolEntities(
  value: string[],
  init: Entities<boolean> = {},
): Entities<boolean> {
  return value.reduce((e: Entities<boolean>, v) => {
    e[v] = true;
    return e;
  }, init);
}

export function toEntities<T extends { id: string }>(
  value: T[],
  init: Entities<T> = {},
  warn = false,
): Entities<T> {
  if (warn) {
    return value.reduce((e: Entities<T>, v) => {
      if (e[v.id]) console.warn(`Duplicate id: ${v.id}`);
      e[v.id] = v;
      return e;
    }, init);
  }

  return value.reduce((e: Entities<T>, v) => {
    e[v.id] = v;
    return e;
  }, init);
}

export function toRationalEntities(
  value: Entities<string | number>,
): Entities<Rational>;
export function toRationalEntities(
  value: Optional<Entities<string | number>>,
): Optional<Entities<Rational>>;
export function toRationalEntities(
  value: Optional<Entities<string | number>>,
): Optional<Entities<Rational>> {
  if (value == null) return;
  return Object.keys(value).reduce((e: Entities<Rational>, v) => {
    e[v] = rational(value[v]);
    return e;
  }, {});
}

export function updateSetIds(
  ids: string | string[],
  value: boolean,
  set: string[] | Set<string>,
): Set<string> {
  set = new Set(set);
  if (!Array.isArray(ids)) ids = [ids];
  ids.forEach((id) => {
    if (value) set.add(id);
    else set.delete(id);
  });
  return set;
}

export function versionStr(version: string): string {
  const list = [APP];
  if (version) list.push(version);
  if (environment.name) list.push(`(${environment.name})`);
  return list.join(' ');
}

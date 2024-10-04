import { spread } from '~/helpers';

import { GameInfo } from '../game-info';
import { Option } from '../option';

export type ColumnKey =
  | 'checkbox'
  | 'tree'
  | 'items'
  | 'belts'
  | 'wagons'
  | 'machines'
  | 'beacons'
  | 'power'
  | 'pollution'
  | 'link';

export interface ColumnSettings {
  show: boolean;
  precision: number | null;
}

export interface ColumnInfo {
  hideDefault?: boolean;
  hasPrecision?: boolean;
}

export type ColumnsState = Record<ColumnKey, ColumnSettings>;

export type ColumnsInfo = Record<ColumnKey, ColumnInfo>;

export const columnsInfo: ColumnsInfo = {
  checkbox: { hideDefault: true },
  tree: {},
  items: { hasPrecision: true },
  belts: { hasPrecision: true },
  wagons: { hasPrecision: true },
  machines: { hasPrecision: true },
  beacons: {},
  power: { hasPrecision: true },
  pollution: { hasPrecision: true },
  link: {},
};

const allColumns = Object.keys(columnsInfo) as ColumnKey[];

/** Default precision for columns with precision */
const DEFAULT_PRECISION: number | null = 1;

/** Initial value to use for columns configuration */
export const initialColumnsState: ColumnsState = allColumns.reduce(
  (e: Partial<ColumnsState>, c) => {
    const inf = columnsInfo[c];
    e[c] = {
      show: !inf.hideDefault,
      precision: inf.hasPrecision ? DEFAULT_PRECISION : null,
    };
    return e;
  },
  {},
) as ColumnsState;

/** Get column options for passed game */
export function columnOptions(gameInfo: GameInfo): Option<ColumnKey>[] {
  return allColumns
    .filter((c) => !gameInfo.hideColumns.includes(c))
    .map(
      (id): Option<ColumnKey> => ({
        label: `options.column.${id}`,
        value: id,
        disabled: id === 'items' || id === 'machines',
      }),
    );
}

export function gameColumnsState(
  columnsState: ColumnsState,
  gameInfo: GameInfo,
): ColumnsState {
  gameInfo.hideColumns.forEach((c) => {
    columnsState = spread(columnsState, {
      [c]: spread(columnsState[c], { show: false }),
    });
  });

  return columnsState;
}

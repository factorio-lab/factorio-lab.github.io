import { Option } from '../option';

export enum MaximizeType {
  Weight = 0,
  Ratio = 1,
}

export const maximizeTypeOptions: Option<MaximizeType>[] = [
  { value: MaximizeType.Weight, label: 'options.maximizeType.weight' },
  { value: MaximizeType.Ratio, label: 'options.maximizeType.ratio' },
];

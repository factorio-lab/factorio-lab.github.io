import { Option } from '../option';
import { DisplayRateInfo } from './display-rate';
import { Game } from './game';

export enum ObjectiveUnit {
  Items = 0,
  Belts = 1,
  Wagons = 2,
  Machines = 3,
}

export function objectiveUnitOptions(
  dispRateInfo: DisplayRateInfo,
  game: Game,
): Option<ObjectiveUnit>[] {
  const result: Option<ObjectiveUnit>[] = [
    { value: ObjectiveUnit.Items, label: dispRateInfo.itemsLabel },
    { value: ObjectiveUnit.Belts, label: 'options.objectiveUnit.belts' },
    { value: ObjectiveUnit.Wagons, label: dispRateInfo.wagonsLabel },
    { value: ObjectiveUnit.Machines, label: 'options.objectiveUnit.machines' },
  ];

  if (game === Game.DysonSphereProgram || game === Game.CaptainOfIndustry) {
    return result.filter((i) => i.value !== ObjectiveUnit.Wagons);
  }

  return result;
}

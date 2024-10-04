import { Option } from '../option';
import { Rational, rational } from '../rational';

export const researchBonusValue = {
  speed0: rational.zero,
  speed1: rational(20n),
  speed2: rational(50n),
  speed3: rational(90n),
  speed4: rational(140n),
  speed5: rational(190n),
  speed6: rational(250n),
};

export const researchBonusOptions: Option<Rational>[] = [
  { label: 'options.researchBonus.speed0', value: researchBonusValue.speed0 },
  { label: 'options.researchBonus.speed1', value: researchBonusValue.speed1 },
  { label: 'options.researchBonus.speed2', value: researchBonusValue.speed2 },
  { label: 'options.researchBonus.speed3', value: researchBonusValue.speed3 },
  { label: 'options.researchBonus.speed4', value: researchBonusValue.speed4 },
  { label: 'options.researchBonus.speed5', value: researchBonusValue.speed5 },
  { label: 'options.researchBonus.speed6', value: researchBonusValue.speed6 },
];

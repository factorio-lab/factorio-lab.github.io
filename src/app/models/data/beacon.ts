import { EnergyType } from '../enum';
import { Rational } from '../rational';
import { ModuleEffect } from './module';

export interface Beacon {
  effectivity: number | string;
  modules: number;
  range: number;
  /** Beacons must use electric or void energy source */
  type: EnergyType.Electric | EnergyType.Void;
  /** Energy consumption in kW */
  usage: number;
  disallowedEffects?: ModuleEffect[];
}

export class BeaconRational {
  effectivity: Rational;
  modules: number;
  range: number;
  /** Beacons must use electric or void energy source */
  type: EnergyType.Electric | EnergyType.Void;
  /** Energy consumption in kW */
  usage: Rational;
  disallowedEffects?: ModuleEffect[];

  constructor(obj: Beacon) {
    this.effectivity = Rational.from(obj.effectivity);
    this.modules = obj.modules;
    this.range = obj.range;
    this.type = obj.type;
    this.usage = Rational.fromNumber(obj.usage);

    if (obj.disallowedEffects) {
      this.disallowedEffects = obj.disallowedEffects;
    }
  }
}

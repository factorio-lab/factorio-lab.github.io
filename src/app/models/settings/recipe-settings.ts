import { Rational } from '../rational';

export enum RecipeSettingsField {
  Factory = 'factory',
  FactoryModules = 'factoryModules',
  Beacon = 'beacon',
  BeaconModules = 'beaconModules',
  BeaconCount = 'beaconCount',
  Overclock = 'overclock',
}

export interface RecipeSettings {
  factory?: string;
  factoryModules?: string[];
  beaconCount?: string;
  beacon?: string;
  beaconModules?: string[];
  overclock?: number;
}

export class RationalRecipeSettings {
  factory?: string;
  factoryModules?: string[];
  beaconCount?: Rational;
  beacon?: string;
  beaconModules?: string[];
  overclock?: Rational;

  constructor(data: RecipeSettings) {
    if (data.factory != null) {
      this.factory = data.factory;
    }
    if (data.factoryModules != null) {
      this.factoryModules = data.factoryModules;
    }
    if (data.beaconCount != null) {
      this.beaconCount = Rational.fromString(data.beaconCount);
    }
    if (data.beacon != null) {
      this.beacon = data.beacon;
    }
    if (data.beaconModules != null) {
      this.beaconModules = data.beaconModules;
    }
    if (data.overclock != null) {
      this.overclock = Rational.fromNumber(data.overclock);
    }
  }
}

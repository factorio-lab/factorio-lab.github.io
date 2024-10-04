import { Option } from '../option';
import { Rational } from '../rational';
import { BeaconSettings } from './beacon-settings';
import { ModuleSettings } from './module-settings';

export interface MachineState {
  fuelId?: string;
  modules?: ModuleSettings[];
  beacons?: BeaconSettings[];
  overclock?: Rational;
}

export interface MachineSettings extends MachineState {
  defaultFuelId?: string;
  fuelOptions?: Option[];
  moduleOptions?: Option[];
  defaultOverclock?: Rational;
}

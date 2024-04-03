import { Entities, toRationalEntities } from '../entities';
import { EnergyType } from '../enum';
import { Rational, rational } from '../rational';
import { ModuleEffect } from './module';
import { parseSilo, Silo, SiloJson } from './silo';

export interface MachineJson {
  /** If undefined, speed is based on belt speed */
  speed?: number | string;
  modules?: number;
  disallowedEffects?: ModuleEffect[];
  type?: EnergyType;
  /** Fuel categories, e.g. chemical or nuclear */
  fuelCategories?: string[];
  /** Indicates a specific fuel that must be used */
  fuel?: string;
  /** Energy consumption in kW */
  usage?: number | string;
  /** Drain in kW */
  drain?: number | string;
  /** Pollution in #/m */
  pollution?: number | string;
  silo?: SiloJson;
  consumption?: Entities<number | string>;
  /** Width and height in tiles (integers, unless off-grid entity like tree) */
  size?: [number, number];
}

export interface Machine {
  /** If undefined, speed is based on belt speed */
  speed?: Rational;
  modules?: Rational;
  disallowedEffects?: ModuleEffect[];
  type?: EnergyType;
  /** Fuel categories, e.g. chemical or nuclear */
  fuelCategories?: string[];
  /** Indicates a specific fuel that must be used */
  fuel?: string;
  /** Energy consumption in kW */
  usage?: Rational;
  drain?: Rational;
  pollution?: Rational;
  silo?: Silo;
  consumption?: Entities<Rational>;
  /** Width and height in tiles (integers, unless off-grid entity like tree) */
  size?: [number, number];
}

export function parseMachine(json: MachineJson): Machine;
export function parseMachine(
  json: MachineJson | undefined,
): Machine | undefined;
export function parseMachine(
  json: MachineJson | undefined,
): Machine | undefined {
  if (json == null) return;
  return {
    speed: rational(json.speed),
    modules: rational(json.modules),
    disallowedEffects: json.disallowedEffects,
    type: json.type,
    fuelCategories: json.fuelCategories,
    fuel: json.fuel,
    usage: rational(json.usage),
    drain: rational(json.drain),
    pollution: rational(json.pollution),
    silo: parseSilo(json.silo),
    consumption: toRationalEntities(json.consumption),
    size: json.size,
  };
}

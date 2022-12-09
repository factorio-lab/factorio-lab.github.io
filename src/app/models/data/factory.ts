import { Entities } from '../entities';
import { Rational } from '../rational';
import { ModuleEffect } from './module';
import { RationalSilo, Silo } from './silo';

export interface Factory {
  speed?: number;
  modules?: number;
  /** Energy type, e.g. electric or burner */
  type?: string;
  /** Fuel category, e.g. chemical or nuclear */
  category?: string;
  /** Energy consumption in kW */
  usage?: number;
  /** Drain in kW */
  drain?: number | string;
  /** Pollution in #/m */
  pollution?: number;
  mining?: boolean;
  research?: boolean;
  silo?: Silo;
  consumption?: Entities<number | string>;
  disallowEffects?: ModuleEffect[];
}

export class RationalFactory {
  speed?: Rational;
  modules?: number;
  /** Energy type, e.g. electric or burner */
  type?: string;
  /** Fuel category, e.g. chemical or nuclear */
  category?: string;
  /** Energy consumption in kW */
  usage?: Rational;
  drain?: Rational;
  pollution?: Rational;
  mining?: boolean;
  research?: boolean;
  silo?: RationalSilo;
  consumption?: Entities<Rational>;
  disallowEffects?: ModuleEffect[];

  constructor(data: Factory) {
    if (data.speed != null) {
      this.speed = Rational.fromNumber(data.speed);
    }
    if (data.modules != null) {
      this.modules = Math.round(data.modules);
    }
    if (data.type) {
      this.type = data.type;
    }
    if (data.category) {
      this.category = data.category;
    }
    if (data.usage != null) {
      this.usage = Rational.fromNumber(data.usage);
    }
    if (data.drain != null) {
      if (typeof data.drain === 'string') {
        this.drain = Rational.fromString(data.drain);
      } else {
        this.drain = Rational.fromNumber(data.drain);
      }
    }
    if (data.pollution != null) {
      this.pollution = Rational.fromNumber(data.pollution);
    }
    if (data.mining) {
      this.mining = data.mining;
    }
    if (data.research) {
      this.research = data.research;
    }
    if (data.silo) {
      this.silo = new RationalSilo(data.silo);
    }
    if (data.consumption) {
      const consumption = data.consumption;
      this.consumption = Object.keys(consumption).reduce(
        (e: Entities<Rational>, i) => {
          e[i] = Rational.fromJson(consumption[i]);
          return e;
        },
        {}
      );
    }
    if (data.disallowEffects) {
      this.disallowEffects = data.disallowEffects;
    }
  }
}

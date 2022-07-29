import { RateType } from './enum/rate-type';
import { Rational } from './rational';

export interface Product {
  id: string;
  itemId: string;
  rate: string;
  rateType: RateType;
  viaId?: string;
}

export class RationalProduct {
  id: string;
  itemId: string;
  rate: Rational;
  rateType: RateType;
  viaId?: string;

  constructor(data: Product) {
    this.id = data.id;
    this.itemId = data.itemId;
    this.rate = Rational.fromString(data.rate);
    this.rateType = data.rateType;
    if (data.viaId) {
      this.viaId = data.viaId;
    }
  }
}

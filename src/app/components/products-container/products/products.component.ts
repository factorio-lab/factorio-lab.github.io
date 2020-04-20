import { Component, EventEmitter, Output, Input } from '@angular/core';
import Fraction from 'fraction.js';

import { DatasetState } from '~/store/dataset';
import { Product, RateType, CategoryId, ItemId } from '~/models';

@Component({
  selector: 'lab-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent {
  @Input() data: DatasetState;
  @Input() products: Product[];
  @Input() editProductId: number;
  @Input() categoryId: CategoryId;

  @Output() add = new EventEmitter();
  @Output() remove = new EventEmitter<number>();
  @Output() openEditProduct = new EventEmitter<Product>();
  @Output() cancelEditProduct = new EventEmitter();
  @Output() commitEditProduct = new EventEmitter<[number, ItemId]>();
  @Output() editRate = new EventEmitter<[number, Fraction]>();
  @Output() editRateType = new EventEmitter<[number, RateType]>();
  @Output() selectTab = new EventEmitter<CategoryId>();

  rateType = RateType;

  constructor() {}

  clickEditProduct(product: Product, event: MouseEvent) {
    this.openEditProduct.emit(product);
    event.stopPropagation();
  }

  selectItem(id: number, itemId: ItemId) {
    this.commitEditProduct.emit([id, itemId]);
  }

  rateChange(id: number, event: any) {
    if (event.target.value) {
      const value = new Fraction(event.target.value);
      if (!this.products.find((p) => p.id === id).rate.equals(value)) {
        this.editRate.emit([id, new Fraction(event.target.value)]);
      }
    }
  }

  rateTypeChange(id: number, event: any) {
    const val = parseInt(event.target.value as string, 10);
    this.editRateType.emit([id, val]);
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  Step,
  DisplayRate,
  Entities,
  Rational,
  Dataset,
  DefaultIdPayload,
  MODULE_ID,
  Column,
  ColumnsAsOptions,
  toBoolEntities,
} from '~/models';
import { RouterService } from '~/services/router.service';
import { ItemsState } from '~/store/items';
import { RecipesState } from '~/store/recipes';
import { RecipeUtility } from '~/utilities';

enum ListEditType {
  Columns,
  Belt,
  Factory,
  Module,
  Beacon,
}

interface ListEdit {
  step: Step;
  type: ListEditType;
  index?: number;
}

@Component({
  selector: 'lab-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListComponent {
  @Input() data: Dataset;
  @Input() itemSettings: ItemsState;
  @Input() recipeSettings: RecipesState;
  @Input() recipeRaw: RecipesState;
  @Input() steps: Step[];
  @Input() belt: string;
  @Input() factoryRank: string[];
  @Input() moduleRank: string[];
  @Input() beaconModule: string;
  @Input() displayRate: DisplayRate;
  @Input() itemPrecision: number;
  @Input() beltPrecision: number;
  @Input() factoryPrecision: number;
  @Input() beaconCount: number;
  @Input() drillModule: boolean;
  _columns: string[];
  get columns() {
    return this._columns;
  }
  @Input() set columns(value: string[]) {
    this._columns = value;
    this.show = toBoolEntities(value);
    this.totalSpan = 2;
    if (this.columns.indexOf(Column.Belts) !== -1) {
      this.totalSpan++;
    }
    if (this.columns.indexOf(Column.Factories) !== -1) {
      this.totalSpan += 2;
    }
    if (this.columns.indexOf(Column.Modules) !== -1) {
      this.totalSpan++;
    }
    if (this.columns.indexOf(Column.Beacons) !== -1) {
      this.totalSpan++;
    }
  }
  @Input() modifiedIgnore: boolean;
  @Input() modifiedBelt: boolean;
  @Input() modifiedFactory: boolean;
  @Input() modifiedModules: boolean;
  @Input() modifiedBeacons: boolean;

  @Output() ignoreItem = new EventEmitter<string>();
  @Output() setBelt = new EventEmitter<DefaultIdPayload>();
  @Output() setFactory = new EventEmitter<DefaultIdPayload>();
  @Output() setModules = new EventEmitter<DefaultIdPayload<string[]>>();
  @Output() setBeaconModule = new EventEmitter<DefaultIdPayload>();
  @Output() setBeaconCount = new EventEmitter<DefaultIdPayload<number>>();
  @Output() hideColumn = new EventEmitter<string>();
  @Output() showColumn = new EventEmitter<string>();
  @Output() resetItem = new EventEmitter<string>();
  @Output() resetRecipe = new EventEmitter<string>();
  @Output() resetIgnore = new EventEmitter();
  @Output() resetBelt = new EventEmitter();
  @Output() resetFactory = new EventEmitter();
  @Output() resetModules = new EventEmitter();
  @Output() resetBeacons = new EventEmitter();

  edit: ListEdit;
  expanded: Entities<boolean> = {};
  show: Entities<boolean> = {};
  totalSpan = 2;

  Column = Column;
  DisplayRate = DisplayRate;
  StepEditType = ListEditType;
  Rational = Rational;
  MODULE_ID = MODULE_ID;
  ColumnsAsOptions = ColumnsAsOptions;
  ColumnsLeftOfPower = [
    Column.Belts,
    Column.Factories,
    Column.Modules,
    Column.Beacons,
  ];

  get rateLabel() {
    switch (this.displayRate) {
      case DisplayRate.PerHour:
        return '/h';
      case DisplayRate.PerMinute:
        return '/m';
      case DisplayRate.PerSecond:
        return '/s';
      default:
        return '';
    }
  }

  get totalPower() {
    let value = Rational.zero;
    for (const step of this.steps.filter((s) => s.consumption)) {
      value = value.add(step.consumption);
    }
    return this.power(value);
  }

  get totalPollution() {
    let value = Rational.zero;
    for (const step of this.steps.filter((s) => s.pollution)) {
      value = value.add(step.pollution);
    }
    return this.rate(value, this.factoryPrecision);
  }

  constructor(public router: RouterService) {}

  trackBy(step: Step) {
    return `${step.itemId}.${step.recipeId}`;
  }

  findStep(id: string) {
    return this.steps.find((s) => s.itemId === id);
  }

  rate(value: Rational, precision: number) {
    if (precision == null) {
      return value.toFraction();
    } else {
      const result = value.toPrecision(precision).toString();
      if (precision > 0) {
        const split = result.split('.');
        if (split.length > 1) {
          if (split[1].length < precision) {
            const spaces = precision - split[1].length;
            return result + ' '.repeat(spaces);
          }
        } else {
          return result + ' '.repeat(precision + 1);
        }
      }
      return result;
    }
  }

  power(value: Rational) {
    if (value.lt(Rational.thousand)) {
      return `${this.rate(value, this.factoryPrecision)} kW`;
    } else {
      return `${this.rate(
        value.div(Rational.thousand),
        this.factoryPrecision
      )} MW`;
    }
  }

  miningIgnoreModule(step: Step) {
    if (!this.drillModule && this.recipeSettings[step.recipeId]?.factory) {
      return this.data.itemR[this.recipeSettings[step.recipeId].factory].factory
        .mining;
    }
    return false;
  }

  factoryChange(step: Step, value: string) {
    const def = RecipeUtility.bestMatch(
      this.data.recipeEntities[step.recipeId].producers,
      this.factoryRank
    );
    const event = {
      id: step.recipeId,
      value,
      default: def,
    };
    this.setFactory.emit(event);
  }

  factoryModuleChange(step: Step, value: string, index: number) {
    const count = this.recipeSettings[step.recipeId].modules.length;
    const options = this.miningIgnoreModule(step)
      ? [MODULE_ID]
      : [...this.data.recipeModuleIds[step.recipeId], MODULE_ID];
    const def = RecipeUtility.defaultModules(options, this.moduleRank, count);
    if (index === 0) {
      // Copy to all
      const modules = [];
      for (let i = 0; i < count; i++) {
        modules.push(value);
      }
      this.setModules.emit({ id: step.recipeId, value: modules, default: def });
    } else {
      // Edit individual module
      const modules = [
        ...this.recipeSettings[step.recipeId].modules.slice(0, index),
        value,
        ...this.recipeSettings[step.recipeId].modules.slice(index + 1),
      ];
      this.setModules.emit({ id: step.recipeId, value: modules, default: def });
    }
  }

  beaconModuleChange(step: Step, value: string) {
    const defaultModule = this.miningIgnoreModule(step)
      ? MODULE_ID
      : this.beaconModule;
    this.setBeaconModule.emit({
      id: step.recipeId,
      value,
      default: defaultModule,
    });
  }

  beaconCountChange(step: Step, event: any) {
    if (event.target.value) {
      const value = Math.round(Number(event.target.value));
      if (
        this.recipeSettings[
          this.steps.find((s) => s.recipeId === step.recipeId).recipeId
        ].beaconCount !== value
      ) {
        this.setBeaconCount.emit({
          id: step.recipeId,
          value,
          default: this.beaconCount,
        });
      }
    }
  }

  resetStep(step: Step) {
    this.resetItem.emit(step.itemId);
    this.resetRecipe.emit(step.recipeId);
  }
}

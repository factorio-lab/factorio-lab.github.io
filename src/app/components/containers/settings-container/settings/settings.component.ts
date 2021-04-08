import { KeyValue } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import {
  DisplayRate,
  ResearchSpeed,
  Dataset,
  ModInfo,
  DefaultPayload,
  Preset,
  ItemId,
  IdPayload,
  WARNING_RESET,
  InserterTarget,
  InserterCapacity,
  DefaultIdPayload,
  IdName,
  InserterCapacityOptions,
  ResearchSpeedOptions,
  InserterTargetOptions,
  DisplayRateOptions,
  FuelType,
  presetOptions,
} from '~/models';
import { FactoriesState } from '~/store/factories';
import { ColumnsState, PreferencesState } from '~/store/preferences';
import { SettingsState, initialSettingsState } from '~/store/settings';
import { BrowserUtility } from '~/utilities';

@Component({
  selector: 'lab-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit, OnChanges {
  _data: Dataset;
  get data(): Dataset {
    return this._data;
  }
  @Input() set data(value: Dataset) {
    this._data = value;
    this.sortedFuels = [];
    if (value.fuelIds?.[FuelType.Chemical]) {
      this.sortedFuels = [...value.fuelIds[FuelType.Chemical]].sort((a, b) =>
        value.itemR[a].fuel.value.sub(value.itemR[b].fuel.value).toNumber()
      );
    }
  }
  @Input() base: ModInfo[];
  @Input() factories: FactoriesState;
  @Input() settings: SettingsState;
  @Input() preferences: PreferencesState;
  @Input() columns: ColumnsState;

  @Output() resetSettings = new EventEmitter();
  @Output() closeSettings = new EventEmitter();
  @Output() saveState = new EventEmitter<IdPayload>();
  @Output() removeState = new EventEmitter<string>();
  @Output() setPreset = new EventEmitter<Preset>();
  @Output() setBase = new EventEmitter<string>();
  @Output() setDisabledRecipes = new EventEmitter<DefaultPayload<string[]>>();
  @Output() setExpensive = new EventEmitter<boolean>();
  @Output() addFactory = new EventEmitter<DefaultPayload<string, string[]>>();
  @Output() removeFactory = new EventEmitter<
    DefaultPayload<string, string[]>
  >();
  @Output() raiseFactory = new EventEmitter<DefaultPayload<string, string[]>>();
  @Output() setFactory = new EventEmitter<DefaultIdPayload<string, string[]>>();
  @Output() setModuleRank = new EventEmitter<DefaultIdPayload<string[]>>();
  @Output() setBeaconCount = new EventEmitter<DefaultIdPayload<number>>();
  @Output() setBeacon = new EventEmitter<DefaultIdPayload>();
  @Output() setBeaconModule = new EventEmitter<DefaultIdPayload>();
  @Output() setBelt = new EventEmitter<DefaultPayload>();
  @Output() setFuel = new EventEmitter<DefaultPayload>();
  @Output() setFlowRate = new EventEmitter<number>();
  @Output() setCargoWagon = new EventEmitter<DefaultPayload>();
  @Output() setFluidWagon = new EventEmitter<DefaultPayload>();
  @Output() setMiningBonus = new EventEmitter<number>();
  @Output() setResearchSpeed = new EventEmitter<ResearchSpeed>();
  @Output() setInserterTarget = new EventEmitter<InserterTarget>();
  @Output() setInserterCapacity = new EventEmitter<InserterCapacity>();
  @Output() setDisplayRate = new EventEmitter<DisplayRate>();
  @Output() setColumns = new EventEmitter<ColumnsState>();
  @Output() setSimplex = new EventEmitter<boolean>();

  initial = initialSettingsState;
  sortedFuels: string[] = [];
  state = '';
  tempState = '';
  editState = false;
  difficultyOptions: IdName<boolean>[] = [
    {
      id: false,
      name: 'Normal',
    },
    {
      id: true,
      name: 'Expensive',
    },
  ];
  enabledOptions: IdName<boolean>[] = [
    {
      id: true,
      name: 'Enabled',
    },
    {
      id: false,
      name: 'Disabled',
    },
  ];
  ResearchSpeedOptions = ResearchSpeedOptions;
  InserterCapacityOptions = InserterCapacityOptions;
  InserterTargetOptions = InserterTargetOptions;
  DisplayRateOptions = DisplayRateOptions;

  ItemId = ItemId;

  ctrlFlowRate = new FormControl('', Validators.min(0));
  ctrlMiningProductivity = new FormControl('', Validators.min(0));
  ctrlMiningSpeed = new FormControl('', Validators.min(100));

  get search(): string {
    return BrowserUtility.search;
  }

  get presetOptions(): IdName<Preset>[] {
    return presetOptions(this.data.isDsp);
  }

  get factoryRows(): string[] {
    return ['', ...this.factories.ids];
  }

  get factoryOptions(): string[] {
    return this.data.factoryIds.filter(
      (f) => this.factories.ids.indexOf(f) === -1
    );
  }

  get savedStates(): IdName[] {
    return Object.keys(this.preferences.states).map((i) => ({
      id: i,
      name: i,
    }));
  }

  get columnsButton(): string {
    const num = Object.keys(this.columns).filter((c) => this.columns[c].show)
      .length;
    return `${num} Visible`;
  }

  constructor(private ref: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    this.state =
      Object.keys(this.preferences.states).find(
        (s) => this.preferences.states[s] === this.search
      ) || '';
    this.router.events.subscribe((e) => this.ref.detectChanges());
  }

  ngOnChanges(): void {
    this.ctrlFlowRate.setValue(this.settings.flowRate);
    this.ctrlMiningProductivity.setValue(this.settings.miningBonus);
    this.ctrlMiningSpeed.setValue(this.settings.miningBonus + 100);
  }

  /** Forces change detector to update on scroll */
  @HostListener('scroll', ['$event']) scroll(): void {
    this.ref.detectChanges();
  }

  changeBeaconCount(id: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.setBeaconCount.emit({
      id,
      value,
      default: this.factories.entities[''].beaconCount,
    });
  }

  emitNumber(
    emitter: EventEmitter<number>,
    event: Event,
    min: number,
    offset = 0
  ): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value) + offset;
    if (value >= min) {
      emitter.emit(value);
    }
  }

  setState(id: string): void {
    const fragment = this.preferences.states[id];
    if (fragment) {
      this.state = id;
      this.router.navigate([], { fragment });
    }
  }

  clickSaveState(): void {
    this.saveState.emit({ id: this.tempState, value: this.search });
    this.editState = false;
    this.state = this.tempState;
  }

  clickRemoveState(): void {
    this.removeState.emit(this.state);
    this.state = '';
  }

  toggleEditState(): void {
    this.editState = !this.editState;
    this.tempState = this.state;
  }

  clickResetSettings(): void {
    if (confirm(WARNING_RESET)) {
      localStorage.clear();
      this.resetSettings.emit();
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnInit,
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { combineLatest, first, map } from 'rxjs';

import {
  Column,
  Dataset,
  Defaults,
  DisplayRate,
  displayRateOptions,
  FactorySettings,
  FuelType,
  Game,
  gameInfo,
  gameOptions,
  InserterCapacity,
  inserterCapacityOptions,
  InserterTarget,
  inserterTargetOptions,
  ItemId,
  Language,
  languageOptions,
  PowerUnit,
  powerUnitOptions,
  Preset,
  ResearchSpeed,
  researchSpeedOptions,
  SimplexType,
  simplexTypeOptions,
  Theme,
  themeOptions,
} from '~/models';
import { ContentService, DisplayService, RouterService } from '~/services';
import { App, Factories, LabState, Preferences, Settings } from '~/store';
import { BrowserUtility } from '~/utilities';

@Component({
  selector: 'lab-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  @HostBinding('class.active') @Input() active = false;
  @HostBinding('class.hidden') @Input() hidden = false;

  vm$ = combineLatest([
    this.store.select(Factories.getFactories),
    this.store.select(Factories.getFactoryRows),
    this.store.select(Factories.getFactoryOptions),
    this.store.select(Settings.getSettings),
    this.store.select(Settings.getColumnsState),
    this.store.select(Settings.getDataset),
    this.store.select(Settings.getOptions),
    this.store.select(Settings.getModOptions),
    this.store.select(Settings.getPresetOptions),
    this.store.select(Settings.getBeltSpeedTxt),
    this.store.select(Settings.getDisplayRateInfo),
    this.store.select(Preferences.preferencesState),
    this.store.select(Preferences.getSavedStates),
    this.contentSvc.lang$,
  ]).pipe(
    map(
      ([
        factories,
        factoryRows,
        factoryOptions,
        settings,
        columns,
        data,
        options,
        modOptions,
        presetOptions,
        beltSpeedTxt,
        dispRateInfo,
        preferences,
        savedStates,
      ]) => ({
        factories,
        factoryRows,
        factoryOptions,
        settings,
        columns,
        data,
        options,
        modOptions,
        presetOptions,
        beltSpeedTxt,
        dispRateInfo,
        preferences,
        savedStates,
        factoryMenuItems: this.buildFactoryMenus(factoryRows, data),
      })
    )
  );

  state = '';
  stateCtrl = new FormControl('', Validators.required);
  editState = false;
  versionsVisible = false;

  displayRateOptions = displayRateOptions;
  gameOptions = gameOptions;
  inserterCapacityOptions = inserterCapacityOptions;
  inserterTargetOptions = inserterTargetOptions;
  languageOptions = languageOptions;
  powerUnitOptions = powerUnitOptions;
  researchSpeedOptions = researchSpeedOptions;
  simplexTypeOptions = simplexTypeOptions;
  themeOptions = themeOptions;

  Column = Column;
  FuelType = FuelType;
  Game = Game;
  ItemId = ItemId;
  SimplexType = SimplexType;

  constructor(
    public contentSvc: ContentService,
    public displaySvc: DisplayService,
    private router: Router,
    private store: Store<LabState>,
    private translateSvc: TranslateService,
    private routerSvc: RouterService
  ) {}

  ngOnInit(): void {
    this.store
      .select(Preferences.getStates)
      .pipe(first())
      .subscribe((states) => {
        this.state =
          Object.keys(states).find(
            (s) => states[s] === BrowserUtility.search
          ) ?? '';
      });
  }

  buildFactoryMenus(factoryRows: string[], data: Dataset): MenuItem[][] {
    return factoryRows.map((factoryId, index): MenuItem[] => {
      if (!factoryId) return [];
      const items: MenuItem[] = [];
      if (index > 1)
        items.push({
          label: this.translateSvc.instant('settings.moveUp'),
          icon: 'fa-solid fa-arrow-up',
          command: () =>
            this.raiseFactory(factoryId, data.defaults?.factoryRankIds),
        });
      if (index < factoryRows.length - 1)
        items.push({
          label: this.translateSvc.instant('settings.moveDown'),
          icon: 'fa-solid fa-arrow-down',
          command: () =>
            this.lowerFactory(factoryId, data.defaults?.factoryRankIds),
        });
      return items;
    });
  }

  clickResetSettings(): void {
    this.contentSvc.confirm({
      icon: 'fa-solid fa-exclamation-triangle',
      header: this.translateSvc.instant('settings.reset'),
      message: this.translateSvc.instant('settings.resetWarning'),
      acceptLabel: this.translateSvc.instant('yes'),
      rejectLabel: this.translateSvc.instant('cancel'),
      accept: () => {
        localStorage.clear();
        this.resetSettings();
      },
    });
  }

  setState(id: string, preferences: Preferences.PreferencesState): void {
    const query = preferences.states[id];
    if (query) {
      const queryParams = this.routerSvc.getParams(query);
      this.state = id;
      this.router.navigate([], { queryParams });
    }
  }

  clickSaveState(): void {
    if (this.stateCtrl.value) {
      this.saveState(this.stateCtrl.value, BrowserUtility.search);
      this.editState = false;
      this.state = this.stateCtrl.value;
    }
  }

  clickDeleteState(): void {
    this.removeState(this.state);
    this.state = '';
  }

  openEditState(): void {
    this.stateCtrl.setValue(this.state);
    this.stateCtrl.markAsPristine();
    this.editState = true;
  }

  setGame(game: Game): void {
    this.setMod(gameInfo[game].modId);
  }

  changeBeaconModuleRank(
    id: string,
    value: string[],
    def: FactorySettings | Defaults
  ): void {
    if (id === '') {
      this.setBeaconModuleRank(id, value, [(def as Defaults).beaconModuleId]);
    } else {
      this.setBeaconModuleRank(
        id,
        value,
        (def as FactorySettings).beaconModuleRankIds
      );
    }
  }

  toggleBeaconReceivers(value: boolean): void {
    this.setBeaconReceivers(value ? '1' : null);
  }

  /** Action Dispatch Methods */
  resetSettings(): void {
    this.store.dispatch(new App.ResetAction());
  }

  saveState(id: string, value: string): void {
    this.store.dispatch(new Preferences.SaveStateAction({ id, value }));
  }

  removeState(value: string): void {
    this.store.dispatch(new Preferences.RemoveStateAction(value));
  }

  setMod(value: string): void {
    this.store.dispatch(new Settings.SetModAction(value));
  }

  setDisabledRecipes(value: string[], def: string[] | undefined): void {
    this.store.dispatch(new Settings.SetDisabledRecipesAction({ value, def }));
  }

  setNetProductionOnly(value: boolean): void {
    this.store.dispatch(new Settings.SetNetProductionOnlyAction(value));
  }

  setPreset(value: Preset): void {
    this.store.dispatch(new Settings.SetPresetAction(value));
  }

  addFactory(value: string, def: string[] | undefined): void {
    this.store.dispatch(new Factories.AddAction({ value, def }));
  }

  removeFactory(value: string, def: string[] | undefined): void {
    this.store.dispatch(new Factories.RemoveAction({ value, def }));
  }

  raiseFactory(value: string, def: string[] | undefined): void {
    this.store.dispatch(new Factories.RaiseAction({ value, def }));
  }

  lowerFactory(value: string, def: string[] | undefined): void {
    this.store.dispatch(new Factories.LowerAction({ value, def }));
  }

  setFactory(id: string, value: string, def: string[] | undefined): void {
    this.store.dispatch(new Factories.SetFactoryAction({ id, value, def }));
  }

  setModuleRank(id: string, value: string[], def: string[] | undefined): void {
    this.store.dispatch(new Factories.SetModuleRankAction({ id, value, def }));
  }

  setOverclock(id: string, value: number, def: number | undefined): void {
    this.store.dispatch(new Factories.SetOverclockAction({ id, value, def }));
  }

  setBeaconCount(id: string, value: string, def: string | undefined): void {
    this.store.dispatch(new Factories.SetBeaconCountAction({ id, value, def }));
  }

  setBeacon(id: string, value: string, def: string | undefined): void {
    this.store.dispatch(new Factories.SetBeaconAction({ id, value, def }));
  }

  setBeaconModuleRank(
    id: string,
    value: string[],
    def: string[] | undefined
  ): void {
    this.store.dispatch(
      new Factories.SetBeaconModuleRankAction({ id, value, def })
    );
  }

  setBeaconReceivers(value: string | null): void {
    this.store.dispatch(new Settings.SetBeaconReceiversAction(value));
  }

  setProliferatorSpray(value: string): void {
    this.store.dispatch(new Settings.SetProliferatorSprayAction(value));
  }

  setBelt(value: string, def: string | undefined): void {
    this.store.dispatch(new Settings.SetBeltAction({ value, def }));
  }

  setPipe(value: string, def: string | undefined): void {
    this.store.dispatch(new Settings.SetPipeAction({ value, def }));
  }

  setCargoWagon(value: string, def: string | undefined): void {
    this.store.dispatch(new Settings.SetCargoWagonAction({ value, def }));
  }

  setFluidWagon(value: string, def: string | undefined): void {
    this.store.dispatch(new Settings.SetFluidWagonAction({ value, def }));
  }

  setFuel(value: string, def: string | undefined): void {
    this.store.dispatch(new Settings.SetFuelAction({ value, def }));
  }

  setFlowRate(value: number): void {
    this.store.dispatch(new Settings.SetFlowRateAction(value));
  }

  setInserterTarget(value: InserterTarget): void {
    this.store.dispatch(new Settings.SetInserterTargetAction(value));
  }

  setMiningBonus(value: number): void {
    this.store.dispatch(new Settings.SetMiningBonusAction(value));
  }

  setResearchSpeed(value: ResearchSpeed): void {
    this.store.dispatch(new Settings.SetResearchSpeedAction(value));
  }

  setInserterCapacity(value: InserterCapacity): void {
    this.store.dispatch(new Settings.SetInserterCapacityAction(value));
  }

  setDisplayRate(value: DisplayRate, prev: DisplayRate): void {
    this.store.dispatch(new Settings.SetDisplayRateAction({ value, prev }));
  }

  setPowerUnit(value: PowerUnit): void {
    this.store.dispatch(new Preferences.SetPowerUnitAction(value));
  }

  setLanguage(value: Language): void {
    this.translateSvc.use(value);
    this.store.dispatch(new Preferences.SetLanguageAction(value));
  }

  setTheme(value: Theme): void {
    this.store.dispatch(new Preferences.SetThemeAction(value));
  }

  setSimplexType(value: SimplexType): void {
    this.store.dispatch(new Preferences.SetSimplexTypeAction(value));
  }

  setBypassLanding(value: boolean): void {
    this.store.dispatch(new Preferences.SetBypassLandingAction(value));
  }
}

import { Belt } from './belt';
import { CategoryId } from './category';
import { Factory } from './factory';
import { Module } from './module';

export enum ItemId {
  None = 'None',
  ArtilleryShellRange = 'artillery-shell-range',
  ArtilleryShellShootingSpeed = 'artillery-shell-shooting-speed',
  AssemblingMachine1 = 'assembling-machine-1',
  AssemblingMachine2 = 'assembling-machine-2',
  AssemblingMachine3 = 'assembling-machine-3',
  Beacon = 'beacon',
  BurnerMiningDrill = 'burner-mining-drill',
  Coal = 'coal',
  CopperOre = 'copper-ore',
  CopperPlate = 'copper-plate',
  CrudeOil = 'crude-oil',
  EfficiencyModule = 'efficiency-module',
  EfficiencyModule2 = 'efficiency-module-2',
  EfficiencyModule3 = 'efficiency-module-3',
  ElectricFurnace = 'electric-furnace',
  ElectricMiningDrill = 'electric-mining-drill',
  EnergyWeaponsDamage = 'energy-weapons-damage',
  ExpressTransportBelt = 'express-transport-belt',
  FastTransportBelt = 'fast-transport-belt',
  FollowerRobotCount = 'follower-robot-count',
  HeavyOil = 'heavy-oil',
  IronOre = 'iron-ore',
  IronPlate = 'iron-plate',
  Lab = 'lab',
  LightOil = 'light-oil',
  Lubricant = 'lubricant',
  MiningProductivity = 'mining-productivity',
  Module = 'module',
  NuclearFuel = 'nuclear-fuel',
  PetroleumGas = 'petroleum-gas',
  PhysicalProjectileDamage = 'physical-projectile-damage',
  Pipe = 'pipe',
  ProductivityModule = 'productivity-module',
  ProductivityModule2 = 'productivity-module-2',
  ProductivityModule3 = 'productivity-module-3',
  RefinedFlammables = 'refined-flammables',
  RocketFuel = 'rocket-fuel',
  RocketPart = 'rocket-part',
  SolidFuel = 'solid-fuel',
  SpaceSciencePack = 'space-science-pack',
  SpeedModule = 'speed-module',
  SpeedModule2 = 'speed-module-2',
  SpeedModule3 = 'speed-module-3',
  Steam = 'steam',
  SteelChest = 'steel-chest',
  SteelPlate = 'steel-plate',
  SteelFurnace = 'steel-furnace',
  Stone = 'stone',
  StoneBrick = 'stone-brick',
  StoneFurnace = 'stone-furnace',
  StrongerExplosives = 'stronger-explosives',
  TransportBelt = 'transport-belt',
  Uranium235 = 'uranium-235',
  Uranium238 = 'uranium-238',
  UraniumOre = 'uranium-ore',
  Water = 'water',
  Wood = 'wood',
  WoodenChest = 'wooden-chest',
  WorkerRobotSpeed = 'worker-robot-speed',
}

export interface Item {
  id: ItemId;
  name: string;
  category: CategoryId;
  row: number;
  stack?: number;
  belt?: Belt;
  factory?: Factory;
  module?: Module;
  /** Fuel value in MJ */
  fuel?: number;
}

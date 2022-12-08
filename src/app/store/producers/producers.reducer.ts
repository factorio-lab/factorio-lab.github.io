import { Entities, Producer } from '~/models';
import { StoreUtility } from '~/utilities';
import * as App from '../app.actions';
import * as Recipes from '../recipes';
import * as Settings from '../settings';
import { ProducersAction, ProducersActionType } from './producers.actions';

export interface ProducersState {
  ids: string[];
  entities: Entities<Producer>;
  index: number;
}

export const initialProducersState: ProducersState = {
  ids: [],
  entities: {},
  index: 0,
};

export function producersReducer(
  state: ProducersState = initialProducersState,
  action:
    | ProducersAction
    | App.AppAction
    | Settings.SetModAction
    | Recipes.ResetFactoriesAction
    | Recipes.ResetBeaconsAction
): ProducersState {
  switch (action.type) {
    case App.AppActionType.LOAD:
      return action.payload.producersState
        ? action.payload.producersState
        : initialProducersState;
    case App.AppActionType.RESET:
    case Settings.SettingsActionType.SET_MOD:
      return initialProducersState;
    case ProducersActionType.ADD: {
      let count = '1';
      if (state.ids.length > 0) {
        // Use count from last producer in list
        const id = state.ids[state.ids.length - 1];
        count = state.entities[id].count;
      }
      return {
        ...state,
        ...{
          ids: [...state.ids, state.index.toString()],
          entities: {
            ...state.entities,
            ...{
              [state.index]: {
                id: state.index.toString(),
                recipeId: action.payload,
                count,
              },
            },
          },
          index: state.index + 1,
        },
      };
    }
    case ProducersActionType.CREATE: {
      // Use full producer, but enforce id: '0'
      const producer = { ...action.payload, ...{ id: '0' } };
      return {
        ...state,
        ...{
          ids: [producer.id],
          entities: { [producer.id]: producer },
          index: 1,
        },
      };
    }
    case ProducersActionType.REMOVE: {
      const newEntities = { ...state.entities };
      delete newEntities[action.payload];
      return {
        ...state,
        ...{
          ids: state.ids.filter((i) => i !== action.payload),
          entities: newEntities,
        },
      };
    }
    case ProducersActionType.SET_RECIPE: {
      const entities = StoreUtility.assignValue(
        state.entities,
        'recipeId',
        action.payload
      );
      return {
        ...state,
        ...{
          entities: StoreUtility.resetFields(
            entities,
            [
              'factoryId',
              'factoryModuleIds',
              'beaconCount',
              'beaconId',
              'beaconModuleIds',
              'overclock',
            ],
            action.payload.id
          ),
        },
      };
    }
    case ProducersActionType.SET_COUNT:
      return {
        ...state,
        ...{
          entities: StoreUtility.assignValue(
            state.entities,
            'count',
            action.payload
          ),
        },
      };
    case ProducersActionType.SET_FACTORY:
      return {
        ...state,
        ...{
          entities: StoreUtility.resetFields(
            StoreUtility.compareReset(
              state.entities,
              'factoryId',
              action.payload
            ),
            ['factoryModuleIds', 'beaconCount', 'beaconId', 'beaconModuleIds'],
            action.payload.id
          ),
        },
      };
    case ProducersActionType.SET_FACTORY_MODULES:
      return {
        ...state,
        ...{
          entities: StoreUtility.compareReset(
            state.entities,
            'factoryModuleIds',
            action.payload
          ),
        },
      };
    case ProducersActionType.SET_BEACON_COUNT:
      return {
        ...state,
        ...{
          entities: StoreUtility.compareReset(
            state.entities,
            'beaconCount',
            action.payload
          ),
        },
      };
    case ProducersActionType.SET_BEACON:
      return {
        ...state,
        ...{
          entities: StoreUtility.resetField(
            StoreUtility.compareReset(
              state.entities,
              'beaconId',
              action.payload
            ),
            'beaconModuleIds',
            action.payload.id
          ),
        },
      };
    case ProducersActionType.SET_BEACON_MODULES:
      return {
        ...state,
        ...{
          entities: StoreUtility.compareReset(
            state.entities,
            'beaconModuleIds',
            action.payload
          ),
        },
      };
    case ProducersActionType.SET_OVERCLOCK:
      return {
        ...state,
        ...{
          entities: StoreUtility.compareReset(
            state.entities,
            'overclock',
            action.payload
          ),
        },
      };
    case ProducersActionType.RESET_PRODUCER:
      return {
        ...state,
        ...{
          entities: StoreUtility.resetFields(
            state.entities,
            [
              'factoryId',
              'overclock',
              'factoryModuleIds',
              'beaconCount',
              'beaconId',
              'beaconModuleIds',
            ],
            action.payload
          ),
        },
      };
    case Recipes.RecipesActionType.RESET_FACTORIES:
      return {
        ...state,
        ...{
          entities: StoreUtility.resetFields(state.entities, [
            'factoryId',
            'overclock',
            'factoryModuleIds',
            'beaconCount',
            'beaconId',
            'beaconModuleIds',
          ]),
        },
      };
    case Recipes.RecipesActionType.RESET_BEACONS:
      return {
        ...state,
        ...{
          entities: StoreUtility.resetFields(state.entities, [
            'beaconCount',
            'beaconId',
            'beaconModuleIds',
          ]),
        },
      };

    default:
      return state;
  }
}

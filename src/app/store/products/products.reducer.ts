import { Product, RateType, Entities, ProductField } from '~/models';
import { StoreUtility } from '~/utilities';
import { AppActionType, AppAction } from '../app.actions';
import { ProductsAction, ProductsActionType } from './products.actions';

export interface ProductsState {
  ids: string[];
  entities: Entities<Product>;
  index: number;
}

export const initialProductsState: ProductsState = {
  ids: [],
  entities: {},
  index: 0,
};

export function productsReducer(
  state: ProductsState = initialProductsState,
  action: ProductsAction | AppAction
): ProductsState {
  switch (action.type) {
    case AppActionType.LOAD:
      return action.payload.productsState
        ? action.payload.productsState
        : state;
    case ProductsActionType.RESET: {
      const id = '0';
      return {
        ids: [id],
        entities: {
          [id]: {
            id,
            itemId: action.payload,
            rate: '1',
            rateType: RateType.Items,
          },
        },
        index: 1,
      };
    }
    case ProductsActionType.ADD:
      return {
        ...state,
        ...{
          ids: [...state.ids, state.index.toString()],
          entities: {
            ...state.entities,
            ...{
              [state.index]: {
                id: state.index.toString(),
                itemId: action.payload,
                rate: 1,
                rateType: RateType.Items,
              },
            },
          },
          index: state.index + 1,
        },
      };
    case ProductsActionType.REMOVE: {
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
    case ProductsActionType.SET_ITEM:
      return {
        ...state,
        ...{
          entities: StoreUtility.assignValue(
            state.entities,
            ProductField.ItemId,
            action.payload
          ),
        },
      };
    case ProductsActionType.SET_RATE:
      return {
        ...state,
        ...{
          entities: StoreUtility.assignValue(
            state.entities,
            ProductField.Rate,
            action.payload
          ),
        },
      };
    case ProductsActionType.SET_RATE_TYPE:
      return {
        ...state,
        ...{
          entities: StoreUtility.assignValue(
            state.entities,
            ProductField.RateType,
            action.payload
          ),
        },
      };
    case ProductsActionType.SET_VIA:
      return {
        ...state,
        ...{
          entities: StoreUtility.assignValue(
            state.entities,
            ProductField.ViaId,
            action.payload
          ),
        },
      };
    default:
      return state;
  }
}

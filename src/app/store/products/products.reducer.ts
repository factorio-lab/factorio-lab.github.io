import Fraction from 'fraction.js';

import { Product, RateType, NEntities, ItemId, CategoryId } from '~/models';
import { ProductsAction, ProductsActionType } from './products.actions';

export interface ProductsState {
  ids: number[];
  entities: NEntities<Product>;
  index: number;
  editProductId: number;
  categoryId: string;
}

const defaultProduct: Product = {
  id: 0,
  itemId: ItemId.WoodenChest,
  rate: new Fraction(1),
  rateType: RateType.Items,
};

export const initialProductsState: ProductsState = {
  ids: [],
  entities: {},
  index: 0,
  editProductId: null,
  categoryId: CategoryId.Logistics,
};

export function productsReducer(
  state: ProductsState = initialProductsState,
  action: ProductsAction
): ProductsState {
  switch (action.type) {
    case ProductsActionType.ADD: {
      const newOutput = { ...defaultProduct, ...{ id: state.index } };
      return {
        ...state,
        ...{
          ids: [...state.ids, state.index],
          entities: { ...state.entities, ...{ [state.index]: newOutput } },
          index: state.index + 1,
        },
      };
    }
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
    case ProductsActionType.OPEN_EDIT_PRODUCT: {
      return {
        ...state,
        ...{
          editProductId: action.payload.id,
        },
      };
    }
    case ProductsActionType.CANCEL_EDIT_PRODUCT: {
      return {
        ...state,
        ...{
          editProductId: null,
        },
      };
    }
    case ProductsActionType.COMMIT_EDIT_PRODUCT: {
      const id = action.payload[0];
      return {
        ...state,
        ...{
          editProductId: null,
          entities: {
            ...state.entities,
            ...{
              [id]: {
                ...state.entities[id],
                ...{
                  itemId: action.payload[1],
                },
              },
            },
          },
        },
      };
    }
    case ProductsActionType.EDIT_RATE: {
      const id = action.payload[0];
      return {
        ...state,
        ...{
          entities: {
            ...state.entities,
            ...{
              [id]: {
                ...state.entities[id],
                ...{
                  rate: action.payload[1],
                },
              },
            },
          },
        },
      };
    }
    case ProductsActionType.EDIT_RATE_TYPE: {
      const id = action.payload[0];
      return {
        ...state,
        ...{
          entities: {
            ...state.entities,
            ...{
              [id]: {
                ...state.entities[id],
                ...{
                  rateType: action.payload[1],
                },
              },
            },
          },
        },
      };
    }
    case ProductsActionType.SELECT_ITEM_CATEGORY:
    case ProductsActionType.SELECT_ITEM_CATEGORY_EFFECT: {
      return { ...state, ...{ categoryId: action.payload } };
    }
    default:
      return state;
  }
}

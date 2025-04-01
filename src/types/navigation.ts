import { Product } from ".";
import { StoreLocation } from "../screens/shoppinglist/AddShoppingListScreen";

export type MainTabParamList = {
  Home: undefined;
  ShoppingList: undefined;
  Add: undefined;
  Stores: undefined;
  Setting: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  ProductDetail: {
    productId: string;
    userProductId: string;
  };
  PriceRecordInformation: { recordId: string };
  EditPriceRecord: { recordId: string };
};

export type StoreStackParamList = {
  StoreScreen: undefined;
  AddStore: undefined;
  StoreDetail: { storeId: string };
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  ShoppingListDetail: { id: string };
  AddShoppingList: {
    selectedLocation?: StoreLocation;
  };
  SupermarketMap: {
    onSelectStore?: (location: StoreLocation) => void;
  };
};

export type RootStackParamList = {
  Main: {
    screen?: string;
    params?: {
      screen: string;
      params: { needsRefresh?: boolean };
    };
  };
  AddRecordModal: {
    handleSave?: () => void;
  };
  ProductLibrary: {
    onSelectProduct?: (product: Product) => void;
    initialSearchText?: string;
  };
  AddProduct: undefined;
};

export type SettingStackParamList = {
  SettingScreen: undefined;
  EditProfile: undefined;
};

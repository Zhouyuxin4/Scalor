export type MainTabParamList = {
  Home: undefined;
  ShoppingList: undefined;
  Add: undefined;
  Stores: undefined;
  Setting: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  ProductDetail: { productId: string };
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  AddShoppingList: undefined;
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
  ProductLibrary: undefined;
};

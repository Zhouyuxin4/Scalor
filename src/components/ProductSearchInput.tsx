import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Product, UserProduct } from "../types";
import { globalStyles } from "../theme/styles";
import { colors } from "../theme/colors";
import GeneralPressable from "./GeneralPressable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { searchProducts, getAllProducts } from "../services/productService";

type ProductSearchNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

interface ProductSearchInputProps {
  inputValue: string;
  onChangeInputValue: (text: string) => void;
  onSelectProduct: (product: Product) => void;
}

const ProductSearchInput = ({
  inputValue,
  onChangeInputValue,
  onSelectProduct,
}: ProductSearchInputProps) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const navigation = useNavigation<ProductSearchNavigationProp>();

  // Initialize products on mount
  useEffect(() => {
    const products = getAllProducts();
    setAllProducts(products);
  }, []);

  // Handle input changes
  useEffect(() => {
    if (inputValue.trim().length > 0) {
      const results = searchProducts(inputValue);
      setSuggestions(results);

      // Check if there's an exact match
      const exactMatch = results.some(
        (product: Product) =>
          product.name.toLowerCase() === inputValue.toLowerCase()
      );

      // Only show suggestions if there's no exact match
      setShowSuggestions(!exactMatch);
      setIsNewProduct(!exactMatch && results.length === 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsNewProduct(false);
    }
  }, [inputValue]);

  return (
    <TouchableWithoutFeedback onPress={() => setShowSuggestions(false)}>
      <View style={styles.wrapper}>
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View>
            <View style={[globalStyles.inputContainer]}>
              <View style={globalStyles.labelContainer}>
                <Text style={globalStyles.inputLabel}>Product</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[globalStyles.input]}
                  value={inputValue}
                  onChangeText={onChangeInputValue}
                  placeholder="Search product..."
                  onFocus={() => setShowSuggestions(true)}
                />
                {isNewProduct && inputValue.length > 0 && (
                  <GeneralPressable
                    containerStyle={styles.questionIcon}
                    onPress={() => {
                      navigation.navigate("ProductLibrary", {
                        onSelectProduct: (product: Product) => {
                          onSelectProduct(product);
                          setShowSuggestions(false);
                          setSuggestions([]);
                        },
                        initialSearchText: inputValue,
                      });
                    }}
                  >
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={24}
                      color={colors.negative}
                    />
                  </GeneralPressable>
                )}
              </View>
            </View>

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.name}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <GeneralPressable
                      containerStyle={styles.suggestionItem}
                      onPress={() => {
                        onSelectProduct(item);
                        setShowSuggestions(false);
                        setSuggestions([]);
                      }}
                    >
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </GeneralPressable>
                  )}
                />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.mediumGray,
    zIndex: 1001,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray2,
  },
  suggestionText: {
    fontSize: 16,
    color: colors.darkText,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  questionIcon: {
    marginRight: 15,
  },
});

export default ProductSearchInput;

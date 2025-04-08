import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import React, { useEffect, useState, useLayoutEffect } from "react";
import { globalStyles } from "../../theme/styles";
import { colors } from "../../theme/colors";
import { UNITS, ALL_UNITS } from "../../constants/units";
import DropDownPicker from "react-native-dropdown-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
} from "expo-image-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, HomeStackParamList } from "../../types/navigation";

import {
  createDoc,
  readOneDoc,
  updateOneDocInDB,
} from "../../services/firebase/firebaseHelper";
import { COLLECTIONS } from "../../constants/firebase";
import {
  BasePriceRecord,
  BaseUserProduct,
  PriceRecord,
  Product,
  UserProduct,
  UserStore,
} from "../../types";
import ProductSearchInput from "../../components/ProductSearchInput";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc as firebaseUpdateDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase/firebaseConfig";
import StoreSearchInput from "../../components/StoreSearchInput";
import LoadingLogo from "../../components/LoadingLogo";
import { uploadImage } from "../../services/firebase/storageHelper";
import { analyzeReceiptImage } from "../../services/openai/openaiService";
import AILoadingScreen from "../../components/AILoadingScreen";
import { getProductById } from "../../services/productService";
type AddRecordScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type EditRecordScreenRouteProp = RouteProp<
  HomeStackParamList,
  "EditPriceRecord"
>;

const AddRecordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const isEditMode = route.name === "EditPriceRecord";
  const recordId = isEditMode ? route.params?.recordId : null;

  const [loading, setLoading] = useState(isEditMode);
  const [selectedProduct, setSelectedProduct] = useState<BaseUserProduct>();
  const [selectedStore, setSelectedStore] = useState<UserStore>();
  const [product, setProduct] = useState<Product | null>(null);

  const [image, setImage] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [price, setPrice] = useState("");
  const [unitType, setUnitType] = useState<string>(UNITS.WEIGHT.LB);
  const [unitValue, setUnitValue] = useState("");

  // state for DropDownPicker
  const [open, setOpen] = useState(false);
  const [items] = useState(
    ALL_UNITS.map((unit) => ({
      label: unit,
      value: unit,
    }))
  );

  const [isAILoading, setIsAILoading] = useState(false);

  // fetch record data if in edit mode
  useEffect(() => {
    if (isEditMode && recordId) {
      const fetchRecordData = async () => {
        try {
          setLoading(true);

          // TODO: get user id from auth
          const userId = "user123";

          const recordPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.PRICE_RECORDS}`;
          const recordData = await readOneDoc<PriceRecord>(
            recordPath,
            recordId
          );

          if (recordData) {
            setPrice(recordData.price.toString());
            setUnitType(recordData.unit_type);
            if (recordData.photo_url) {
              setImage(recordData.photo_url);
            }

            if (recordData.user_product_id) {
              const userProductPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.USER_PRODUCTS}`;
              const userProductData = await readOneDoc<UserProduct>(
                userProductPath,
                recordData.user_product_id
              );

              if (userProductData && userProductData.product_id) {
                const productData = getProductById(userProductData.product_id);

                if (productData) {
                  setProduct(productData);
                  setProductName(productData.name);
                  setSelectedProduct({
                    product_id: productData.id,
                    name: productData.name,
                    category: productData.category || "",
                    image_type: productData.image_type || "emoji",
                    image_source: productData.image_source || "",
                    plu_code: productData.plu_code || "",
                    barcode: productData.barcode || "",
                    total_price: 0,
                    average_price: 0,
                    lowest_price: 0,
                    highest_price: 0,
                    lowest_price_store: {
                      store_id: "",
                      store_name: "",
                    },
                    total_price_records: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                  });
                }
              }
            }

            if (recordData.store_id) {
              const storePath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.USER_STORES}`;
              const storeData = await readOneDoc<UserStore>(
                storePath,
                recordData.store_id
              );

              if (storeData) {
                setStoreName(storeData.name);
                setSelectedStore(storeData);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching record data:", error);
          Alert.alert("Error", "Failed to load record data");
        } finally {
          setLoading(false);
        }
      };

      fetchRecordData();
    }
  }, [isEditMode, recordId]);

  const takePhoto = async () => {
    try {
      const permissionResult = await requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        alert("Need camera permission to take photo");
        return;
      }

      const result = await launchCameraAsync({
        mediaTypes: "images",
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);

        try {
          setIsAILoading(true);

          const receiptData = await analyzeReceiptImage(
            result.assets[0].base64 || ""
          );

          // auto fill form
          if (receiptData.productName) {
            setProductName(receiptData.productName);
          }
          if (receiptData.priceValue) {
            setPrice(receiptData.priceValue);
          }
          if (receiptData.unitValue) {
            setUnitValue(receiptData.unitValue);
          }
          if (receiptData.unitType) {
            // check if unit is in allowed units list
            const validUnit = ALL_UNITS.find(
              (unit) =>
                unit.toLowerCase() === receiptData.unitType?.toLowerCase()
            );
            if (validUnit) {
              setUnitType(validUnit);
            }
          }
        } catch (error) {
          console.error("Error testing OpenAI API:", error);
          Alert.alert(
            "Error",
            "Failed to analyze receipt image. Check console for details."
          );
        } finally {
          setIsAILoading(false);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      alert("Failed to take photo");
    }
  };

  const pickFromLibrary = async () => {
    try {
      const permissionResult = await requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        alert("Need photo library permission to select photo");
        return;
      }

      const result = await launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.2,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error selecting photo:", error);
      alert("Failed to select photo");
    }
  };

  const pickImage = () => {
    Alert.alert(
      "Select Photo",
      "Please select photo source",
      [
        {
          text: "Take Photo",
          onPress: takePhoto,
        },
        {
          text: "Select from Library",
          onPress: pickFromLibrary,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    try {
      // verify
      if (!productName || !storeName || !price || !unitType) {
        alert("Please fill in all required fields");
        return;
      }

      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice)) {
        alert("Please enter a valid price");
        return;
      }

      if (!selectedProduct) {
        alert("Please select a product from the list");
        return;
      }

      if (!selectedStore) {
        alert("Please select a store from the list");
        return;
      }

      // TODO: Link to real user, now hardcoded to user123
      const userId = "user123";
      const userPath = `${COLLECTIONS.USERS}/${userId}`;

      let photoUrl = "";
      if (image) {
        // use timestamp as unique identifier
        const timestamp = new Date().getTime();
        const imagePath = `price_records/${userId}/${timestamp}.jpg`;

        // upload image and get URL
        photoUrl = await uploadImage(image, imagePath);
      }

      if (isEditMode && recordId) {
        // update existing record
        const recordPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.PRICE_RECORDS}`;
        const updatedRecord = {
          price: numericPrice,
          unit_type: unitType,
          unit_price: numericPrice,
          photo_url: photoUrl || "",
          store_id: selectedStore.id,
          updated_at: new Date(),
        };

        const success = await updateOneDocInDB(
          recordPath,
          recordId,
          updatedRecord
        );

        if (success) {
          navigation.goBack();
        } else {
          Alert.alert("Error", "Failed to update record");
        }
      } else {
        // create new record - original add record logic
        // Check if user already has this product
        const userProductsRef = collection(
          db,
          COLLECTIONS.USERS,
          userId,
          COLLECTIONS.SUB_COLLECTIONS.USER_PRODUCTS
        );

        const querySnapshot = await getDocs(userProductsRef);
        const existingUserProduct = querySnapshot.docs.find(
          (doc) => doc.data().product_id === selectedProduct.product_id
        );

        let userProductId;
        if (existingUserProduct) {
          // If product exists, use its ID directly
          userProductId = existingUserProduct.id;
        } else {
          // If product doesn't exist, get complete product information
          const completeProduct = selectedProduct.product_id
            ? getProductById(selectedProduct.product_id)
            : null;

          // Prepare complete user product data
          let userProduct: BaseUserProduct;
          if (completeProduct) {
            // If a local product is found, copy all fields
            userProduct = {
              product_id: completeProduct.id,
              name: completeProduct.name,
              category: completeProduct.category || "",
              image_type: completeProduct.image_type || "emoji",
              image_source: completeProduct.image_source || "",
              plu_code: completeProduct.plu_code || "",
              barcode: completeProduct.barcode || "",
              total_price: 0,
              average_price: 0,
              lowest_price: 0,
              highest_price: 0,
              lowest_price_store: {
                store_id: "",
                store_name: "",
              },
              total_price_records: 0,
              created_at: new Date(),
              updated_at: new Date(),
            };
          } else {
            // If no local product is found (exceptional case), use minimal information set
            userProduct = {
              product_id: selectedProduct.product_id,
              name: productName, // Use input field name
              category: "", // May need a default category
              image_type: "emoji",
              image_source: "🛒", // Default icon
              plu_code: "",
              barcode: "",
              total_price: 0,
              average_price: 0,
              lowest_price: 0,
              highest_price: 0,
              lowest_price_store: {
                store_id: "",
                store_name: "",
              },
              total_price_records: 0,
              created_at: new Date(),
              updated_at: new Date(),
            };
          }

          // Save complete user product
          const userProductPath = `${userPath}/${COLLECTIONS.SUB_COLLECTIONS.USER_PRODUCTS}`;
          userProductId = await createDoc(userProductPath, userProduct);

          if (!userProductId) {
            alert("Failed to save user product");
            return;
          }
        }

        // Create price record, associate with user_product_id
        const priceRecord: BasePriceRecord = {
          user_product_id: userProductId,
          store_id: selectedStore.id,
          price: numericPrice,
          unit_type: unitType,
          unit_price: numericPrice,
          photo_url: photoUrl,
          currency: "$", // TODO: Get from user settings
          recorded_at: new Date(),
        };

        // Save price record
        const priceRecordPath = `${userPath}/${COLLECTIONS.SUB_COLLECTIONS.PRICE_RECORDS}`;
        const recordId = await createDoc(priceRecordPath, priceRecord);

        if (recordId) {
          // Update user product stats after saving the record
          // Update stats directly in the user product document, not a separate stats collection

          // Get the latest user product data
          const userProductRef = doc(
            db,
            COLLECTIONS.USERS,
            userId,
            COLLECTIONS.SUB_COLLECTIONS.USER_PRODUCTS,
            userProductId
          );

          const userProductDoc = await getDoc(userProductRef);

          if (userProductDoc.exists()) {
            const existingProduct = userProductDoc.data() as UserProduct;

            // Calculate new stats
            const newTotalPrice =
              (existingProduct.total_price || 0) + numericPrice;
            const newTotalRecords =
              (existingProduct.total_price_records || 0) + 1;
            const newAveragePrice = newTotalPrice / newTotalRecords;

            // Determine if it's the lowest price
            const isLowestPrice =
              !existingProduct.lowest_price ||
              numericPrice < existingProduct.lowest_price;

            // Determine if it's the highest price
            const isHighestPrice =
              !existingProduct.highest_price ||
              numericPrice > existingProduct.highest_price;

            // Prepare update data
            const updateData = {
              total_price: newTotalPrice,
              average_price: newAveragePrice,
              lowest_price: isLowestPrice
                ? numericPrice
                : existingProduct.lowest_price,
              highest_price: isHighestPrice
                ? numericPrice
                : existingProduct.highest_price,
              lowest_price_store: isLowestPrice
                ? { store_id: selectedStore.id, store_name: selectedStore.name }
                : existingProduct.lowest_price_store,
              total_price_records: newTotalRecords,
              updated_at: new Date(),
            };

            // Update user product data
            await updateOneDocInDB(
              `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.USER_PRODUCTS}`,
              userProductId,
              updateData
            );
          } else {
            console.error("User product not found after creating price record");
          }

          alert("Record saved successfully!");
          navigation.goBack();
        } else {
          alert("Failed to save record");
        }
      }
    } catch (error) {
      console.error("Error saving record:", error);
      Alert.alert("Error", "Failed to save record");
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Text style={globalStyles.headerButton} onPress={handleSave}>
          {isEditMode ? "Update" : "Save"}
        </Text>
      ),
    });
  }, [navigation, handleSave, isEditMode]);

  if (loading) {
    return <LoadingLogo />;
  }

  if (isAILoading) {
    return <AILoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardContainer}>
        {image ? (
          <TouchableOpacity
            style={[
              styles.imageContainer,
              { borderWidth: 1, borderStyle: "solid" },
            ]}
            onPress={pickImage}
          >
            <Image source={{ uri: image }} style={styles.previewImage} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              <View style={styles.imageContent}>
                <View style={styles.cameraIconContainer}>
                  <MaterialCommunityIcons
                    name="camera-plus-outline"
                    size={80}
                    color={colors.mediumGray}
                  />
                </View>
                <Text style={styles.uploadText}>Click to take photo</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
        <View style={globalStyles.inputsContainer}>
          {!isEditMode && (
            <ProductSearchInput
              inputValue={productName}
              onChangeInputValue={setProductName}
              onSelectProduct={(product) => {
                setProductName(product.name);
                setSelectedProduct({
                  product_id: product.id,
                  name: product.name,
                  category: product.category || "",
                  image_type: product.image_type || "emoji",
                  image_source: product.image_source || "",
                  plu_code: product.plu_code || "",
                  barcode: product.barcode || "",
                  total_price: 0,
                  average_price: 0,
                  lowest_price: 0,
                  highest_price: 0,
                  lowest_price_store: {
                    store_id: "",
                    store_name: "",
                  },
                  total_price_records: 0,
                  created_at: new Date(),
                  updated_at: new Date(),
                });
              }}
            />
          )}
          {/* TODO: replace with general search dropdown */}
          <StoreSearchInput
            inputValue={storeName}
            onChangeInputValue={setStoreName}
            onSelectStore={(store) => {
              setSelectedStore(store);
            }}
            initialStoreId={selectedStore?.id}
            disabled={false}
          />
          <View style={[globalStyles.inputContainer]}>
            <View style={globalStyles.labelContainer}>
              <Text style={globalStyles.inputLabel}>Price</Text>
            </View>
            <View
              style={[styles.priceContainer, { backgroundColor: colors.white }]}
            >
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[globalStyles.input, styles.priceInput]}
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.unitContainer}>
                <TextInput
                  style={styles.unitValueInput}
                  value={unitValue}
                  onChangeText={setUnitValue}
                  keyboardType="decimal-pad"
                  placeholder="/"
                />
                <DropDownPicker
                  open={open}
                  value={unitType}
                  items={items}
                  setOpen={setOpen}
                  setValue={setUnitType}
                  style={styles.unitPicker}
                  containerStyle={styles.dropdownContainer}
                  textStyle={{ fontSize: 16 }}
                  dropDownContainerStyle={{
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: colors.lightGray2,
                    position: "absolute",
                    width: 60,
                  }}
                  maxHeight={200}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AddRecordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  cardContainer: {
    paddingHorizontal: 30,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.mediumGray,
    borderRadius: 8,
    marginVertical: 20,
  },
  imageContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  priceContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightGray2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: colors.darkText,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    minHeight: 48,
    paddingHorizontal: 0,
  },
  unitContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 180,
  },
  unitValueInput: {
    backgroundColor: colors.lightGray2,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 8,
    minHeight: 48,
    width: 50,
    fontSize: 16,
    textAlign: "center",
  },
  perText: {
    fontSize: 16,
    color: colors.darkText,
  },
  unitPicker: {
    backgroundColor: colors.lightGray2,
    borderRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 0,
    minHeight: 48,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  dropdownContainer: {
    width: 80,
    zIndex: 1,
  },
  cameraIconContainer: {
    marginBottom: 15,
  },
  uploadText: {
    color: colors.darkGray,
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
});

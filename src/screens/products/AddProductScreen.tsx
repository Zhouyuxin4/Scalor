import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from "react-native";
import React, { useState, useLayoutEffect, useEffect } from "react";
import { globalStyles } from "../../theme/styles";
import { colors } from "../../theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import { PRODUCT_CATEGORIES } from "../../data/Product";
import SearchDropdown from "../../components/SearchDropdown";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  createDoc,
  readOneDoc,
  updateOneDocInDB,
  deleteOneDocFromDB,
} from "../../services/firebase/firebaseHelper";
import { COLLECTIONS } from "../../constants/firebase";
import {
  ImageType,
  Product,
  BaseCustomizedProduct,
  CustomizedProduct,
} from "../../types";
import LoadingLogo from "../../components/LoadingLogo";
import ProductImage from "../../components/ProductImage";
import EditProductImage from "../../components/EditProductImage";
import EmojiSelector from "react-native-emoji-selector";
import {
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
  MediaTypeOptions,
} from "expo-image-picker";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/firebaseConfig";
import { uploadProductImage } from "../../services/firebase/storageHelper";

const AddProductScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const isEditMode = route.name === "EditProduct";
  const productId = isEditMode ? route.params?.productId : null;

  const [loading, setLoading] = useState(isEditMode);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [imageType, setImageType] = useState<ImageType | "">("");
  const [pluCode, setPluCode] = useState("");
  const [imageSource, setImageSource] = useState<string>("");
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);

  // get product data
  useEffect(() => {
    if (isEditMode && productId) {
      const fetchProductData = async () => {
        try {
          setLoading(true);
          const userId = "user123"; // TODO: get user id from auth
          const customizedProductPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.CUSTOMIZED_PRODUCTS}`;

          const productData = await readOneDoc<CustomizedProduct>(
            customizedProductPath,
            productId
          );

          if (productData) {
            setName(productData.name);
            setCategory(productData.category);
            setPluCode(productData.plu_code || "");
            setImageSource(productData.image_source || "");
          }
        } catch (error) {
          console.error("Error fetching custom product:", error);
          Alert.alert("Error", "Failed to load custom product data");
        } finally {
          setLoading(false);
        }
      };
      fetchProductData();
    }
  }, [isEditMode, productId]);

  const handleSave = async () => {
    try {
      if (!name || !category) {
        Alert.alert("Error", "Please fill in all required fields");
        return;
      }

      const userId = "user123"; // TODO: get from auth
      const customizedProductPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.CUSTOMIZED_PRODUCTS}`;

      const customizedProductData: BaseCustomizedProduct = {
        name,
        category,
        plu_code: pluCode,
        image_source: imageSource,
        barcode: "", // Adding empty barcode as it's in the interface
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (isEditMode) {
        // Update existing customized product
        await updateOneDocInDB(
          customizedProductPath,
          productId,
          customizedProductData
        );
        Alert.alert("Success", "Custom product updated successfully!");
      } else {
        // Create new customized product
        const newProductId = await createDoc(
          customizedProductPath,
          customizedProductData
        );
        if (!newProductId) {
          throw new Error("Failed to create custom product");
        }
        Alert.alert("Success", "Custom product created successfully!");
      }
      navigation.goBack();
    } catch (error) {
      console.error("Error saving custom product:", error);
      Alert.alert(
        "Error",
        `Failed to ${isEditMode ? "update" : "create"} custom product`
      );
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !productId) return;

    Alert.alert(
      "Delete Custom Product",
      "Are you sure you want to delete this custom product? All related price records will also be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = "user123"; // TODO: get from auth
              const customizedProductPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.CUSTOMIZED_PRODUCTS}`;

              // 1. Delete all related price records
              const recordsPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.PRICE_RECORDS}`;
              const recordsQuery = query(
                collection(db, recordsPath),
                where("user_product_id", "==", productId)
              );
              const recordsSnapshot = await getDocs(recordsQuery);

              // Delete each record
              const recordDeletePromises = recordsSnapshot.docs.map((doc) =>
                deleteOneDocFromDB(recordsPath, doc.id)
              );
              await Promise.all(recordDeletePromises);

              // 2. Delete product stats
              const statsPath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.USER_PRODUCT_STATS}`;
              await deleteOneDocFromDB(statsPath, productId);

              // 3. Delete the customized product
              await deleteOneDocFromDB(customizedProductPath, productId);

              Alert.alert(
                "Success",
                "Custom product and related records deleted successfully",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      navigation.navigate("HomeScreen");
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("Error deleting custom product:", error);
              Alert.alert("Error", "Failed to delete the custom product");
            }
          },
        },
      ]
    );
  };

  const pickImage = () => {
    Alert.alert(
      "Select Image",
      "Please select image source",
      [
        {
          text: "Choose Emoji",
          onPress: () => setIsEmojiPickerVisible(true),
        },
        {
          text: "Take Photo",
          onPress: handleTakePhoto,
        },
        {
          text: "Select from Library",
          onPress: handleSelectFromLib,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleTakePhoto = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to take photos"
      );
      return;
    }

    const result = await launchCameraAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        const userId = "user123"; // TODO: get from auth
        const imageName = await uploadProductImage(
          result.assets[0].uri,
          userId
        );
        setImageSource(imageName);
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert("Error", "Failed to upload image");
      }
    }
  };

  const handleSelectFromLib = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Library permission is required to select photos"
      );
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        const userId = "user123"; // TODO: get from auth
        const imageName = await uploadProductImage(
          result.assets[0].uri,
          userId
        );
        setImageSource(imageName);
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert("Error", "Failed to upload image");
      }
    }
  };

  if (loading) {
    return <LoadingLogo />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Picture */}
        <EditProductImage
          userId="user123" // TODO: get from auth
          imageType={imageType as ImageType}
          imageSource={imageSource}
          onPress={pickImage}
        />

        {/* Inputs */}
        <View style={globalStyles.inputsContainer}>
          {/* Product Name */}
          <View style={globalStyles.inputContainer}>
            <View style={globalStyles.labelContainer}>
              <Text style={globalStyles.inputLabel}>Name</Text>
              <Text style={styles.requiredMark}>*</Text>
            </View>
            <TextInput
              style={globalStyles.input}
              placeholder="Enter product name"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Category */}
          <SearchDropdown
            label="Category"
            value={category}
            items={Object.values(PRODUCT_CATEGORIES).map((category) => ({
              label: category,
              value: category,
            }))}
            onChangeValue={setCategory}
            placeholder="Select category"
          />

          {/* PLU Code */}
          <View style={globalStyles.inputContainer}>
            <View style={globalStyles.labelContainer}>
              <Text style={globalStyles.inputLabel}>PLU</Text>
            </View>
            <TextInput
              style={globalStyles.input}
              placeholder="Enter PLU code"
              keyboardType="numeric"
              value={pluCode}
              onChangeText={setPluCode}
            />
          </View>
          {/* Add buttons container at the bottom */}
          {isEditMode ? (
            <View style={styles.buttonsContainer}>
              <View
                style={[globalStyles.buttonsContainer, { marginBottom: 20 }]}
              >
                <TouchableOpacity
                  style={[globalStyles.button, globalStyles.primaryButton]}
                  onPress={handleDelete}
                >
                  <Text style={globalStyles.primaryButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.button, globalStyles.primaryButton]}
                  onPress={handleSave}
                >
                  <Text style={globalStyles.primaryButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Add mode - show single save button
            <View style={styles.buttonsContainer}>
              <View
                style={[globalStyles.buttonsContainer, { marginBottom: 20 }]}
              >
                <TouchableOpacity
                  style={[
                    globalStyles.button,
                    globalStyles.primaryButton,
                    { flex: 1 },
                  ]}
                  onPress={handleSave}
                >
                  <Text style={globalStyles.primaryButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <Modal
          visible={isEmojiPickerVisible}
          animationType="slide"
          onRequestClose={() => setIsEmojiPickerVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.emojiHeader}>
              <TouchableOpacity
                onPress={() => setIsEmojiPickerVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <EmojiSelector
              onEmojiSelected={(emoji) => {
                setImageType("emoji");
                setImageSource(emoji);
                setIsEmojiPickerVisible(false);
              }}
              showSearchBar={true}
              showHistory={true}
              showSectionTitles={true}
              columns={8}
            />
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default AddProductScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  cardContainer: {
    paddingHorizontal: 30,
  },
  requiredMark: {
    color: colors.negative,
    marginLeft: 4,
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
  cameraIconContainer: {
    marginBottom: 15,
  },
  uploadText: {
    color: colors.darkGray,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: colors.lightGray2,
    borderWidth: 0,
    borderRadius: 8,
    minHeight: 48,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray2,
    borderRadius: 8,
  },
  emojiHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray2,
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  buttonsContainer: {
    // marginHorizontal: 16,
  },
});

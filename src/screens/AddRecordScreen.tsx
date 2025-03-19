import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { globalStyles } from "../theme/styles";
import { colors } from "../theme/colors";
import { UNITS, ALL_UNITS } from "../constants/units";
import DropDownPicker from "react-native-dropdown-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
} from "expo-image-picker";

import { PRODUCTS } from "../data/Product";
import { createDoc } from "../services/firebase/firebaseHelper";
import { COLLECTIONS } from "../constants/firebase";
import { PriceRecord } from "../types";
import ProductSearchInput from "../components/ProductSearchInput";

const AddRecordScreen = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [price, setPrice] = useState("");
  const [unitType, setUnitType] = useState(UNITS.WEIGHT.LB);
  const [photoUrl, setPhotoUrl] = useState("");

  // state for DropDownPicker
  const [open, setOpen] = useState(false);
  const [items] = useState(
    ALL_UNITS.map((unit) => ({
      label: unit,
      value: unit,
    }))
  );

  const pickImage = async () => {
    try {
      const permissionResult = await requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        alert("You need to enable permission to access the photo library!");
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
      console.error("Error picking image:", error);
      alert("Failed to pick image");
    }
  };

  const handleSave = async () => {
    try {
      if (!productName || !storeName || !price || !unitType) {
        alert("Please fill in all required fields");
        return;
      }

      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice)) {
        alert("Please enter a valid price");
        return;
      }

      const priceRecord: PriceRecord = {
        record_id: "", // Firebase will generate this
        user_product_id: "", // TODO: Link to real product
        store_id: "", // TODO: Link to real store
        price: numericPrice,
        unit_type: unitType,
        unit_price: numericPrice, //TODO: Calculate unit price
        photo_url: image || "",
        recorded_at: new Date(),
      };

      const recordId = await createDoc(
        // TODO: Link to real user
        COLLECTIONS.USERS +
          "/user123/" +
          COLLECTIONS.SUB_COLLECTIONS.PRICE_RECORDS,
        priceRecord
      );

      if (recordId) {
        alert("Record saved successfully!");
        navigation.goBack();
      } else {
        alert("Failed to save record");
      }
    } catch (error) {
      console.error("Error saving record:", error);
      alert("Failed to save record");
    }
  };

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
                <Text style={styles.uploadText}>Click to add photo</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
        <View style={globalStyles.inputsContainer}>
          <ProductSearchInput
            inputValue={productName}
            onChangeInputValue={setProductName}
            products={PRODUCTS}
            onSelectProduct={(product) => {
              setProductName(product.name);
            }}
          />
          <View style={globalStyles.inputContainer}>
            <View style={globalStyles.labelContainer}>
              <Text style={globalStyles.inputLabel}>Store</Text>
            </View>
            <TextInput
              style={globalStyles.input}
              placeholder="Store Name"
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>
          <View style={globalStyles.inputContainer}>
            <View style={globalStyles.labelContainer}>
              <Text style={globalStyles.inputLabel}>Price</Text>
            </View>
            <View style={styles.priceContainer}>
              <TextInput
                style={[globalStyles.input]}
                placeholder="Price"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              <DropDownPicker
                open={open}
                value={unitType}
                items={items}
                setOpen={setOpen}
                setValue={setUnitType}
                style={[
                  {
                    backgroundColor: colors.lightGray2,
                    borderWidth: 0,
                    minHeight: 48,
                    paddingHorizontal: 12,
                  },
                ]}
                containerStyle={styles.dropdownContainer}
                textStyle={{ fontSize: 16 }}
                dropDownContainerStyle={{
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.lightGray2,
                }}
                maxHeight={200}
              />
            </View>
          </View>
        </View>
        <View style={[globalStyles.buttonsContainer, { marginTop: 20 }]}>
          <TouchableOpacity
            style={[globalStyles.button, globalStyles.primaryButton]}
          >
            <Text style={globalStyles.primaryButtonText}>Add More</Text>
          </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
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
    gap: 8,
  },
  dropdownContainer: {
    width: 100,
    zIndex: 0,
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

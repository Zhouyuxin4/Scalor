import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { globalStyles } from "../../theme/styles";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StoreStackParamList } from "../../types/navigation";
import { createDoc } from "../../services/firebase/firebaseHelper";
import { COLLECTIONS } from "../../constants/firebase";
import { BaseUserStore } from "../../types";
import SearchBar from "../../components/SearchBar";
import { useBrands } from "../../hooks/useBrands";

type AddStoreScreenNavigationProp =
  NativeStackNavigationProp<StoreStackParamList>;

const AddStoreScreen = () => {
  const navigation = useNavigation<AddStoreScreenNavigationProp>();
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const { brands, loading } = useBrands();

  // TODO: get location from user's device, now use a fixed location
  const [location, setLocation] = useState({
    latitude: 49.2827, // Vancouver's approximate coordinates
    longitude: -123.1207,
  });

  const searchAddress = (query: string) => {
    // TODO: access google map api to search address, now treat it as a text input
    setAddress(query);
  };

  const handleSaveStore = async () => {
    // validate input
    if (!storeName.trim()) {
      Alert.alert("Error", "Please enter a store name");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Error", "Please enter a store address");
      return;
    }

    try {
      // 查找匹配的品牌
      const matchingBrand = brands.find(
        (brand) => brand.name.toLowerCase() === storeName.trim().toLowerCase()
      );

      if (!matchingBrand) {
        Alert.alert("Error", "Please enter a valid store brand name");
        return;
      }

      // create store data object
      const storeData: BaseUserStore = {
        brand_id: matchingBrand.id, // 使用找到的品牌 ID
        name: storeName.trim(),
        address: address.trim(),
        location: location,
        is_favorite: false,
        last_visited: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // TODO: get current user id, now use a fixed user id
      const userId = "user123";
      const userStorePath = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.SUB_COLLECTIONS.USER_STORES}`;

      const docId = await createDoc(userStorePath, storeData);

      if (docId) {
        Alert.alert("Success", "Store information saved", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", "Failed to save, please try again");
      }
    } catch (error) {
      console.error("Error saving store:", error);
      Alert.alert("Error", "Failed to save, please try again");
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.formContainer}>
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Logo</Text>
            </View>

            <View style={styles.nameInputContainer}>
              <Text style={styles.inputLabel}>
                Name<Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Store name (e.g., Costco, Walmart)"
                value={storeName}
                onChangeText={setStoreName}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationSection}>
            <View style={styles.mapPlaceholder}>
              <Text>Google Map (TODO)</Text>
            </View>

            <View style={styles.searchAddressContainer}>
              <SearchBar
                value={address}
                onChangeText={setAddress} // TODO: search address
                placeholder="Search for an address"
              />
            </View>
          </View>

          <View style={[globalStyles.buttonsContainer, { marginTop: 20 }]}>
            <TouchableOpacity
              style={[globalStyles.button, globalStyles.primaryButton]}
              onPress={handleCancel}
            >
              <Text style={globalStyles.primaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[globalStyles.button, globalStyles.primaryButton]}
              onPress={handleSaveStore}
            >
              <Text style={globalStyles.primaryButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddStoreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    backgroundColor: "#fff",
  },
  logoText: {
    fontSize: 16,
  },
  nameInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  requiredStar: {
    color: "red",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#fff",
  },
  locationSection: {
    marginBottom: 10,
    backgroundColor: "pink",
    borderRadius: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  mapPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "teal"
  },
  addressInput: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  locationButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  locationButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    padding: 10,
    width: "48%",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  buttonText: {
    fontSize: 16,
  },
  bottomButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    padding: 10,
    width: "48%",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  saveButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    padding: 10,
    width: "48%",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  cancelButtonText: {
    fontSize: 16,
  },
  saveButtonText: {
    fontSize: 16,
  },
  searchAddressContainer: {
    marginBottom: 15,
  },
});

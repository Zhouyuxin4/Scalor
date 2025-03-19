import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import MainTabNavigator from "./MainTabNavigator";
import AddRecordScreen from "../screens/AddRecordScreen";
import { Text } from "react-native";
import { globalStyles } from "../theme/styles";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddRecordModal"
        component={AddRecordScreen}
        options={({ navigation, route }) => ({
          presentation: "modal",
          title: "Add Record",
          headerLeft: () => (
            <Text
              style={globalStyles.headerButton}
              onPress={() => navigation.goBack()}
            >
              Cancel
            </Text>
          ),
          headerRight: () => (
            <Text
              style={globalStyles.headerButton}
              onPress={() => route.params?.handleSave?.()}
            >
              Save
            </Text>
          ),
        })}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

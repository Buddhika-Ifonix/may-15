import React, { useEffect } from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SCREEN_NAMES } from "./src/navigators/screenNames";

import { LogBox, Text, Alert } from "react-native";
import Home from "./src/scenes/home";
import Test from "./src/scenes/Test";
import Call from "./src/scenes/voxScreens/CallScreen"
import IncomingCall from "./src/scenes/voxScreens/IncomingCallScreen"
import LoginScreen from "./src/scenes/voxScreens/LoginScreen";
import RNCallKeep from "react-native-callkeep";
import { QueryClient, QueryClientProvider } from "react-query";


const queryClient = new QueryClient();
const { Navigator, Screen } = createStackNavigator();


export default function App() {
  useEffect(() => {
    const options = {
      ios: {
        appName: "CallKeep",
      },
      android: {
        alertTitle: "Permissions required",
        alertDescription:
          "This application needs to access your phone accounts",
        cancelButton: "Cancel",
        okButton: "ok",
        imageName: "phone_account_icon",
      },
    };
    RNCallKeep.setup(options);
    RNCallKeep.setAvailable(true);

    if (Platform.OS === "android") {
      // OverlayPermissionModule.requestOverlayPermission();
    }
  }, []);

  return (
    <NavigationContainer fallback={<Text>Loading...</Text>}>
       <QueryClientProvider client={queryClient}>
      <Navigator
        screenOptions={{
          animationEnabled: false,
          presentation: "modal",
        }}
        initialRouteName={SCREEN_NAMES.Home}
      >
        <Screen
          name={SCREEN_NAMES.Login}
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Screen
          name={SCREEN_NAMES.Home}
          component={Home}
          options={{ headerShown: false }}
        />

        <Screen
          name={SCREEN_NAMES.Test}
          component={Test}
          options={{ headerShown: false }}
        />

        <Screen
          name={SCREEN_NAMES.Call}
          component={Call}
          options={{ headerShown: false }}
        />
          <Screen
          name={SCREEN_NAMES.InCall}
          component={IncomingCall}
          options={{ headerShown: false }}
        />
        
      </Navigator>
      </QueryClientProvider>
    </NavigationContainer>
  );
}

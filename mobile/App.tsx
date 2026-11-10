import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "./src/auth/session";
import { colors } from "./src/theme/theme";
import { RootNavigator } from "./src/nav/RootNavigator";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
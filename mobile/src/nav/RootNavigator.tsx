import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSession } from "../auth/session";
import { colors } from "../theme/theme";
import { AuthScreen } from "../screens/AuthScreen";
import { TripDetailScreen } from "../screens/TripDetailScreen";
import { ExpenseFormScreen } from "../screens/ExpenseFormScreen";
import { MainTabs } from "./Tabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading } = useSession();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      {!user ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Trip" component={TripDetailScreen} />
          <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
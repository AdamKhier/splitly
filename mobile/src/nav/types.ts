import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabsParamList> | undefined;
  Trip: { tripId: string };
  ExpenseForm: { tripId: string; expenseId?: string };
};

export type MainTabsParamList = {
  Trips: undefined;
  Requests: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    interface RootParamList extends RootStackParamList {}
  }
}
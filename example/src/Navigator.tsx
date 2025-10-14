import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Screen1 } from './screens/screen-1';
import { Screen2 } from './screens/screen-2';
import { Screen3 } from './screens/screen-3';

export enum Screens {
  screen1 = 'screen-1',
  screen2 = 'screen-2',
  screen3 = 'screen-3',
}

export type RootStackParamList = {
  [Screens.screen1]: undefined;
  [Screens.screen2]: undefined;
  [Screens.screen3]: undefined;
};

const RootStack = createNativeStackNavigator({
  initialRouteName: Screens.screen1,
  screens: {
    [Screens.screen1]: Screen1,
    [Screens.screen2]: Screen2,
    [Screens.screen3]: Screen3,
  },
  screenOptions: {
    headerShown: false,
    animationTypeForReplace: 'pop',
  },
});

const Navigation = createStaticNavigation(RootStack);

export default Navigation;

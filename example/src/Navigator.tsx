import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Screen1 } from './screens/screen-1';
import { Screen2 } from './screens/screen-2';
import { Screen3 } from './screens/screen-3';
import { Screens } from './navigation/types';

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

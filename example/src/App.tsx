import { AnimatedPortalProvider } from 'react-native-portal-animation';
import Navigation from './Navigator';

const App = () => {
  return (
    <AnimatedPortalProvider>
      <Navigation />
    </AnimatedPortalProvider>
  );
};

export default App;

import React, {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  type MeasuredDimensions,
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';

type ElementConfig = {
  onAnimationComplete?: () => void;
} & MeasuredDimensions;

interface AnimatedPortalContextType {
  portalContent: ReactNode | null;
  setPortalContent: (content: ReactNode | null) => void;
  sourceConfig: SharedValue<ElementConfig | null>;
  targetConfig: SharedValue<ElementConfig | null>;
  clean: () => void;
}

const AnimatedPortalContext = createContext<AnimatedPortalContextType | null>(
  null
);

const useAnimatedPortal = () => {
  const context = React.useContext(AnimatedPortalContext);
  if (!context) {
    throw new Error(
      'useAnimatedPortal must be used within an AnimatedPortalProvider'
    );
  }
  return context;
};

const AnimatedPortalProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [portalContent, setPortalContent] = useState<ReactNode | null>(null);
  const sourceConfig = useSharedValue<ElementConfig | null>(null);
  const targetConfig = useSharedValue<ElementConfig | null>(null);

  const clean = useCallback(() => {
    sourceConfig.value = null;
    targetConfig.value = null;
    setPortalContent(null);
  }, [sourceConfig, targetConfig]);

  const contextValue = useMemo(
    () => ({
      portalContent,
      setPortalContent,
      sourceConfig,
      targetConfig,
      clean,
    }),
    [portalContent, setPortalContent, sourceConfig, targetConfig, clean]
  );

  return (
    <AnimatedPortalContext.Provider value={contextValue}>
      {children}
      {portalContent ? (
        <View style={StyleSheet.absoluteFill}>{portalContent}</View>
      ) : null}
    </AnimatedPortalContext.Provider>
  );
};

export { AnimatedPortalProvider, useAnimatedPortal };

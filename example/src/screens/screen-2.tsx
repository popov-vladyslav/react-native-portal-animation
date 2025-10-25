import { type NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { type RootStackParamList, Screens } from '../navigation/types';
import { SimpleElement } from '../components';
import {
  AnimatedPortalElement,
  type AnimatedPortalElementRef,
} from 'react-native-portal-animation';
import { useComplexAnimation } from '../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DIFFERENT_ANIMATION_CONFIG = [
  // Snappy & light (fast, playful)
  {
    corner: 'bottom-right',
    gravity: 2100,
    restitution: 0.62,
    airDrag: 0.45,
    apexPad: 8,
    flightTimeMs: 520,
    morphMs: 420,
    toBackgroundColor: '#0E1116',
    toBorderRadius: 12,
  },
  // Dramatic arc (cinematic lob)
  {
    corner: 'top-left',
    gravity: 2300,
    airDrag: 0.55,
    restitution: 0.58,
    apexPad: 6, // very high last hop
    landingPauseMs: 180,
    flightTimeMs: 850, // tall arc
    morphMs: 700,
  },
  // Heavy, rubbery ball
  {
    corner: 'bottom-right',
    gravity: 2800,
    airDrag: 0.7,
    restitution: 0.65, // springy floor bounce
    groundFriction: 2.6,
    hopStretchMs: 120,
    flightTimeMs: 680,
  },
  // Gentle, subtle (less playful)
  {
    gravity: 2000,
    airDrag: 0.8,
    restitution: 0.42,
    apexPad: 18,
    landingPauseMs: 100,
    flightTimeMs: 600,
    morphMs: 500,
  },
  // High-energy pinball start, tidy finish
  {
    corner: 'top-right',
    restitution: 0.7,
    wallRestitution: 0.55,
    airDrag: 0.5,
    apexPad: 10,
    flightTimeMs: 580,
    morphMs: 520,
  },
  // Instant morph at the end (UI-focused)
  {
    flightTimeMs: 500,
    morphMs: 300,
    apexPad: 12,
    restitution: 0.5,
    gravity: 2300,
    toBorderRadius: 8,
    toBackgroundColor: '#111827',
  },
];

export const Screen2: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const { navigate, goBack } =
    useNavigation<NavigationProp<RootStackParamList>>();

  const animatedRef = useRef<AnimatedPortalElementRef>(null);

  useLayoutEffect(() => {
    animatedRef.current?.measureLayout({
      type: 'target',
    });
  }, []);

  const navigation = useCallback(() => {
    navigate(Screens.screen3);
  }, [navigate]);

  const action = useCallback(() => {
    animatedRef.current?.measureLayout({
      type: 'source',
      onAnimationComplete: () => {
        navigate(Screens.screen3);
      },
    });
  }, [navigate]);

  return (
    <View
      style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}
    >
      <Text style={styles.text}>Screen 2</Text>
      <View style={styles.content}>
        <AnimatedPortalElement
          animationProps={{
            ...DIFFERENT_ANIMATION_CONFIG[1],

            backgroundColor: 'lightgray',
            borderRadius: 60,
            toBackgroundColor: 'green',
            toBorderRadius: 0,
          }}
          ref={animatedRef}
          animationHook={useComplexAnimation}
        >
          <SimpleElement onPress={action} styles={styles.element} />
        </AnimatedPortalElement>
      </View>

      <View style={styles.buttonGroup}>
        <Button title="go back" onPress={() => goBack()} />
        <Button title="go to screen 3" onPress={navigation} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  element: {
    width: 120,
    height: 120,
    backgroundColor: 'lightgray',
    borderRadius: 60,
  },
});

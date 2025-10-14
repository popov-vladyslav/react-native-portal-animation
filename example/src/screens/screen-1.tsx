import { type NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { type RootStackParamList, Screens } from '../Navigator';
import { SimpleElement } from '../components';

import {
  AnimatedPortalElement,
  type AnimatedPortalElementRef,
} from 'react-native-portal-animation';
import { useSimpleAnimation } from '../hooks';

export const Screen1: React.FC = () => {
  const { navigate } = useNavigation<NavigationProp<RootStackParamList>>();
  const animatedRef = useRef<AnimatedPortalElementRef>(null);

  useEffect(() => {
    animatedRef.current?.measureLayout({
      type: 'target',
    });
  }, []);

  const navigation = useCallback(() => navigate(Screens.screen2), [navigate]);

  const action = useCallback(() => {
    animatedRef.current?.measureLayout({
      type: 'source',
      onAnimationComplete: navigation,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Screen 1</Text>

      <AnimatedPortalElement
        animationProps={{
          borderRadius: 16,
          backgroundColor: 'lightblue',
          toBorderRadius: 60,
          toBackgroundColor: 'lightgray',
        }}
        animationHook={useSimpleAnimation}
        ref={animatedRef}
      >
        <SimpleElement styles={styles.element} onPress={action} />
      </AnimatedPortalElement>

      <Button title="go to details" onPress={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  element: {
    width: 200,
    height: 200,
    backgroundColor: 'lightblue',
    borderRadius: 16,
  },
});

import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, Dimensions } from 'react-native';
import { type RootStackParamList, Screens } from '../Navigator';
import { type NavigationProp, useNavigation } from '@react-navigation/native';
import {
  AnimatedPortalElement,
  type AnimatedPortalElementRef,
} from 'react-native-portal-animation';
import { useSimpleAnimation } from '../hooks';
import { SimpleElement } from '../components';

const { width } = Dimensions.get('window');

export const Screen3: React.FC = () => {
  const { reset } = useNavigation<NavigationProp<RootStackParamList>>();

  const animatedRef = useRef<AnimatedPortalElementRef>(null);

  useEffect(() => {
    animatedRef.current?.measureLayout({
      type: 'target',
    });
  }, []);

  const navigation = useCallback(() => {
    reset({
      index: 0,
      routes: [{ name: Screens.screen1 }],
    });
  }, [reset]);

  const action = useCallback(() => {
    animatedRef.current?.measureLayout({
      type: 'source',
      onAnimationComplete: navigation,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Screen 3</Text>
      <View style={styles.extraElement} />
      <View style={styles.left}>
        <AnimatedPortalElement
          animationProps={{
            backgroundColor: 'green',
            toBorderRadius: 16,
            toBackgroundColor: 'lightblue',
          }}
          ref={animatedRef}
          animationHook={useSimpleAnimation}
        >
          <SimpleElement onPress={action} styles={styles.element} />
        </AnimatedPortalElement>
      </View>

      <Button title="go to screen 1" onPress={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  element: {
    width: 100,
    height: 200,
    backgroundColor: 'green',
  },
  left: { alignSelf: 'flex-start' },
  extraElement: {
    backgroundColor: 'red',
    width,
    height: 10,
    alignSelf: 'flex-end',
  },
});

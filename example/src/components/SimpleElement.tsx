import React from 'react';
import {
  Text,
  type StyleProp,
  type ViewStyle,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';

const s = StyleSheet.create({
  button: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { textAlign: 'center' },
});

type SimpleElementProps = {
  animatedStyle?: StyleProp<ViewStyle>;
  styles?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

const SimpleElement: React.FC<SimpleElementProps> = ({
  animatedStyle,
  styles,
  onPress,
}) => {
  return (
    <Animated.View style={[styles, animatedStyle]}>
      <Pressable onPress={onPress} style={s.button}>
        <Text style={s.text}>Press Me</Text>
      </Pressable>
    </Animated.View>
  );
};

export { SimpleElement };

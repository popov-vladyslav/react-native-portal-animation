import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAnimatedPortal } from 'react-native-portal-animation';
import { scheduleOnRN } from 'react-native-worklets';

const ANIMATION_DURATION = { duration: 600 };

type Props =
  | {
      borderRadius?: number;
      backgroundColor?: string;
      toBorderRadius?: number;
      toBackgroundColor?: string;
    }
  | undefined;

const useSimpleAnimation = (props: Props) => {
  const {
    backgroundColor = '#fff',
    borderRadius = 0,
    toBackgroundColor = '#fff',
    toBorderRadius = 0,
  } = props || {};
  const { sourceConfig, targetConfig } = useAnimatedPortal();

  const translateY = useSharedValue(sourceConfig.value?.pageY || 0);
  const translateX = useSharedValue(sourceConfig.value?.pageX || 0);
  const width = useSharedValue(sourceConfig.value?.width || 0);
  const height = useSharedValue(sourceConfig.value?.height || 0);
  const bRadius = useSharedValue(borderRadius);
  const bgColor = useSharedValue(backgroundColor);

  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
      ],
      width: width.value,
      height: height.value,
      borderRadius: bRadius.value,
      backgroundColor: props?.toBackgroundColor ? bgColor.value : undefined,
    }),
    [translateX, translateY, width, height]
  );

  useAnimatedReaction(
    () => ({ source: sourceConfig.value, target: targetConfig.value }),
    ({ source, target }, prev) => {
      // first time we get a source - going from point A
      if (source && !prev?.source) {
        if (source.onAnimationComplete)
          scheduleOnRN(source.onAnimationComplete);
      }

      // going from last animated point to point B
      if (source !== null && !prev?.target && target) {
        translateX.value = withTiming(target.pageX, ANIMATION_DURATION);
        translateY.value = withTiming(target.pageY, ANIMATION_DURATION);
        bRadius.value = withTiming(toBorderRadius || 0, ANIMATION_DURATION);
        bgColor.value = withTiming(toBackgroundColor, ANIMATION_DURATION);
        width.value = withTiming(target.width, ANIMATION_DURATION);
        height.value = withTiming(target.height, ANIMATION_DURATION, () => {
          // cleanup values to be ready for next animation
          if (target.onAnimationComplete)
            scheduleOnRN(target.onAnimationComplete);
        });
      }
    }
  );

  return { animatedStyle };
};

export { useSimpleAnimation };

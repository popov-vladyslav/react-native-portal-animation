import React, {
  forwardRef,
  type ForwardRefRenderFunction,
  type PropsWithChildren,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useAnimatedPortal } from './Provider';
import Animated, {
  measure,
  useAnimatedReaction,
  useAnimatedRef,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { scheduleOnUI, scheduleOnRN } from 'react-native-worklets';
import { View, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    width: 'auto',
    alignSelf: 'baseline',
  },
});

type MeasureLayoutProps = {
  type: 'source' | 'target';
  onAnimationComplete?: () => void;
};

export type AnimatedPortalElementRef = {
  measureLayout: (props: MeasureLayoutProps) => void;
  isPortalActive: boolean;
};

type AnimatedPortalElementProps = PropsWithChildren<{
  animationHook?: (props?: Record<string, unknown>) => void;
  animationProps?: Record<string, unknown>;
}>;

const InternalElement: ForwardRefRenderFunction<
  AnimatedPortalElementRef,
  AnimatedPortalElementProps
> = (props, ref) => {
  const { children, animationHook, animationProps } = props;
  const { portalContent, setPortalContent, sourceConfig, targetConfig, clean } =
    useAnimatedPortal();

  const containerStyle = useMemo(
    () => ({ opacity: portalContent ? 0 : 1 }),
    [portalContent]
  );

  const isFocused = useIsFocused();

  const animatedRef = useAnimatedRef();

  const PortalWrapper = useCallback(() => {
    const result = animationHook?.(animationProps) || {};
    if (!React.isValidElement(children)) return null;

    return React.cloneElement(children, {
      ...result,
    });
  }, [animationHook, animationProps, children]);

  const handleSetPortalContent = useCallback(() => {
    if (!portalContent && isFocused) {
      setPortalContent(<PortalWrapper />);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, portalContent]);

  const measureLayout = useCallback(
    ({ type, onAnimationComplete }: MeasureLayoutProps) => {
      if (!animatedRef.current) return;
      if (type === 'target' && !sourceConfig.value) return;

      const handleClean = () => {
        if (clean) clean();
        if (onAnimationComplete) onAnimationComplete();
      };

      scheduleOnUI(() => {
        const measurement = measure(animatedRef);

        if (!measurement) return;

        if (type === 'source') {
          sourceConfig.value = {
            ...measurement,
            onAnimationComplete,
          };
        }

        if (type === 'target' && sourceConfig.value) {
          targetConfig.value = {
            ...measurement,
            onAnimationComplete: handleClean,
          };
        }
      });
    },
    [animatedRef, clean, sourceConfig, targetConfig]
  );

  useAnimatedReaction(
    () => sourceConfig.value,
    (source, prev) => {
      if (source && !prev) scheduleOnRN(handleSetPortalContent);

      if (!source && prev) scheduleOnRN(setPortalContent, null);
    }
  );

  useImperativeHandle(ref, () => ({
    measureLayout,
    isPortalActive: !!portalContent,
  }));

  return (
    <View>
      <Animated.View
        style={[styles.container, containerStyle]}
        ref={animatedRef}
        collapsable={false}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export const AnimatedPortalElement = forwardRef(InternalElement);

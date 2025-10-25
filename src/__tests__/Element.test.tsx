import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import {
  AnimatedPortalElement,
  type AnimatedPortalElementRef,
} from '../Element';
import { useAnimatedPortal } from '../Provider';
import { scheduleOnRN } from 'react-native-worklets';

type Measurement = {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
  onAnimationComplete?: () => void;
};

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnUI: jest.fn((worklet: () => void) => worklet()),
  scheduleOnRN: jest.fn(
    (worklet: (...args: unknown[]) => void, ...args: unknown[]) =>
      worklet(...args)
  ),
}));

const mockSourceConfig: { value: Measurement | null } = {
  value: null,
};
const mockTargetConfig: { value: Measurement | null } = {
  value: null,
};
const mockSetPortalContent = jest.fn((element: React.ReactElement | null) => {
  if (element && typeof element.type === 'function') {
    const Component = element.type as (
      props: Record<string, unknown>
    ) => unknown;
    Component(element.props as Record<string, unknown>);
  }
});
const mockClean = jest.fn();

jest.mock('../Provider', () => ({
  useAnimatedPortal: jest.fn(),
}));

describe('AnimatedPortalElement', () => {
  const useAnimatedPortalMock = useAnimatedPortal as jest.Mock;
  const measurement: Measurement = {
    x: 12,
    y: 6,
    width: 140,
    height: 64,
    pageX: 20,
    pageY: 40,
  };

  let reactionCallback:
    | ((current: unknown, previous: unknown) => void)
    | undefined;

  const createAnimatedRefStub = () => {
    const ref = Object.assign(
      jest.fn(() => null),
      {
        current: {} as Record<string, unknown>,
        observe: jest.fn(),
      }
    );
    return ref as unknown as ReturnType<typeof Reanimated.useAnimatedRef>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSourceConfig.value = null;
    mockTargetConfig.value = null;

    useAnimatedPortalMock.mockReturnValue({
      portalContent: null,
      setPortalContent: mockSetPortalContent,
      sourceConfig: mockSourceConfig,
      targetConfig: mockTargetConfig,
      clean: mockClean,
    });

    jest
      .spyOn(Reanimated, 'measure')
      .mockImplementation(() => ({ ...measurement }));
    jest
      .spyOn(Reanimated, 'useAnimatedRef')
      .mockReturnValue(createAnimatedRefStub());
    jest
      .spyOn(Reanimated, 'useAnimatedReaction')
      .mockImplementation((_prepare, react) => {
        reactionCallback = react;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    reactionCallback = undefined;
  });

  const renderElement = (
    props: Partial<React.ComponentProps<typeof AnimatedPortalElement>> = {},
    ref?: React.RefObject<AnimatedPortalElementRef | null>
  ) =>
    render(
      <AnimatedPortalElement ref={ref} {...props}>
        <View>
          <Text>Test Content</Text>
        </View>
      </AnimatedPortalElement>
    );

  it('renders its children content', () => {
    const { getByText } = renderElement();
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('stores source measurement when requested', () => {
    const onAnimationComplete = jest.fn();
    const ref = React.createRef<AnimatedPortalElementRef>();

    renderElement({}, ref);

    act(() => {
      ref.current?.measureLayout({
        type: 'source',
        onAnimationComplete,
      });
    });

    expect(mockSourceConfig.value).toEqual({
      ...measurement,
      onAnimationComplete,
    });
  });

  it('stores target measurement and cleans up after completion', () => {
    const onAnimationComplete = jest.fn();
    const ref = React.createRef<AnimatedPortalElementRef>();
    mockSourceConfig.value = { ...measurement };

    renderElement({}, ref);

    act(() => {
      ref.current?.measureLayout({
        type: 'target',
        onAnimationComplete,
      });
    });

    expect(mockTargetConfig.value).toMatchObject(measurement);
    expect(typeof mockTargetConfig.value?.onAnimationComplete).toBe('function');

    act(() => {
      mockTargetConfig.value?.onAnimationComplete?.();
    });

    expect(mockClean).toHaveBeenCalledTimes(1);
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores target measurement when source config is missing', () => {
    const ref = React.createRef<AnimatedPortalElementRef>();

    renderElement({}, ref);

    act(() => {
      ref.current?.measureLayout({ type: 'target' });
    });

    expect(mockTargetConfig.value).toBeNull();
  });

  it('activates and clears portal content based on shared value changes', () => {
    const animationHook = jest.fn(() => ({ accessible: true }));
    const animationProps = { duration: 250 };
    const ref = React.createRef<AnimatedPortalElementRef>();
    const scheduleOnRNMock = scheduleOnRN as jest.Mock;

    renderElement({ animationHook, animationProps }, ref);

    act(() => {
      ref.current?.measureLayout({ type: 'source' });
    });

    expect(mockSourceConfig.value).toMatchObject(measurement);

    act(() => {
      reactionCallback?.(mockSourceConfig.value, null);
    });

    expect(scheduleOnRNMock).toHaveBeenCalled();
    expect(mockSetPortalContent).toHaveBeenCalledTimes(1);
    expect(animationHook).toHaveBeenCalledWith(animationProps);

    const previous = mockSourceConfig.value;
    mockSourceConfig.value = null;

    act(() => {
      reactionCallback?.(null, previous);
    });

    expect(mockSetPortalContent).toHaveBeenLastCalledWith(null);
  });

  it('hides original content when portal content is set', () => {
    useAnimatedPortalMock.mockReturnValueOnce({
      portalContent: <View testID="portal-view" />,
      setPortalContent: mockSetPortalContent,
      sourceConfig: mockSourceConfig,
      targetConfig: mockTargetConfig,
      clean: mockClean,
    });

    const ref = React.createRef<AnimatedPortalElementRef>();
    const { getByTestId } = renderElement({}, ref);

    expect(ref.current?.isPortalActive).toBe(true);
    const container = getByTestId('portal-element');
    expect(container.props.style).toContainEqual({ opacity: 0 });
  });
});

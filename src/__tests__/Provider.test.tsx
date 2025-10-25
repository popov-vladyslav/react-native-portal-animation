import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { AnimatedPortalProvider, useAnimatedPortal } from '../Provider';

describe('AnimatedPortalProvider', () => {
  it('throws when useAnimatedPortal is called outside the provider', () => {
    const Consumer = () => {
      useAnimatedPortal();
      return null;
    };

    expect(() => render(<Consumer />)).toThrow(
      'useAnimatedPortal must be used within an AnimatedPortalProvider'
    );
  });

  it('provides portal context and cleans shared values', async () => {
    type PortalContext = ReturnType<typeof useAnimatedPortal>;
    const contextRef: { current: PortalContext | null } = { current: null };
    const handleContext = jest.fn((ctx: PortalContext) => {
      contextRef.current = ctx;
    });

    const Consumer: React.FC<{ onReady: (ctx: PortalContext) => void }> = ({
      onReady,
    }) => {
      const ctx = useAnimatedPortal();

      useEffect(() => {
        onReady(ctx);
      }, [ctx, onReady]);

      return (
        <View>
          <Text>Screen</Text>
        </View>
      );
    };

    const { getByText, queryByTestId } = render(
      <AnimatedPortalProvider>
        <Consumer onReady={handleContext} />
      </AnimatedPortalProvider>
    );

    await waitFor(() => expect(contextRef.current).not.toBeNull());
    expect(handleContext).toHaveBeenCalled();

    const getContext = () => {
      if (!contextRef.current) {
        throw new Error('Portal context is not available');
      }

      return contextRef.current;
    };

    expect(getByText('Screen')).toBeTruthy();
    expect(getContext().portalContent).toBeNull();

    act(() => {
      getContext().setPortalContent(
        <View testID="portal-overlay">
          <Text>Portal Content</Text>
        </View>
      );
    });

    expect(getByText('Portal Content')).toBeTruthy();

    act(() => {
      getContext().sourceConfig.value = {
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        pageX: 5,
        pageY: 6,
      };
      getContext().targetConfig.value = {
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        pageX: 50,
        pageY: 60,
      };
    });

    act(() => {
      getContext().clean();
    });

    await waitFor(() => {
      expect(getContext().portalContent).toBeNull();
      expect(getContext().sourceConfig.value).toBeNull();
      expect(getContext().targetConfig.value).toBeNull();
    });

    expect(queryByTestId('portal-overlay')).toBeNull();
  });
});

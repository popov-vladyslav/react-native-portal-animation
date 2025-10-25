# react-native-portal-animation

Animate any React Native view across screens or navigation layers by temporarily lifting it into a dedicated portal. Capture the element's layout, render it above everything (even headers and modals), and drive buttery‑smooth shared element transitions with Reanimated + Worklets while keeping 60 FPS.

## Highlights
- Reusable portal layer that renders on top of the app (great for overlapping headers, sheets, and modals).
- Programmatic `source → target` measurements so you can animate unrelated components or screens.
- BYO animation logic: plug in simple hooks or advanced physics-based motion built with `react-native-reanimated` and `react-native-worklets`.
- Navigation friendly: trigger transitions before pushing a screen and finish once the destination is ready.

## Requirements
| Dependency | Version |
| --- | --- |
| React Native | `>= 0.81`
| React | `>= 19`
| `react-native-reanimated` | `>= 4.1`
| `react-native-worklets` | `>= 0.6`
| `@react-navigation/native` | optional but recommended for cross-screen flows

## Installation
```sh
# npm
npm install react-native-portal-animation
# or yarn
yarn add react-native-portal-animation
```
Make sure Reanimated and Worklets are already configured in your project (Hermes engine + Babel plugin, etc.).

## Quick start
1. **Wrap your app with the provider** so every screen shares the same portal layer.
2. **Attach an `AnimatedPortalElement`** to each UI piece you want to animate.
3. **Measure layouts** before and after navigation to teleport the element into the portal and run your animation hook.

### 1. Provide the portal
```tsx
// App.tsx
import { AnimatedPortalProvider } from 'react-native-portal-animation';

export function App() {
  return (
    <AnimatedPortalProvider>
      <Navigation />
    </AnimatedPortalProvider>
  );
}
```

### 2. Register the destination (target)
```tsx
// DetailsScreen.tsx
import { useLayoutEffect, useRef } from 'react';
import { AnimatedPortalElement, type AnimatedPortalElementRef } from 'react-native-portal-animation';
import { useSimpleAnimation } from './useSimpleAnimation';

export function DetailsScreen() {
  const cardRef = useRef<AnimatedPortalElementRef>(null);

  useLayoutEffect(() => {
    cardRef.current?.measureLayout({ type: 'target' });
  }, []);

  return (
    <AnimatedPortalElement ref={cardRef} animationHook={useSimpleAnimation}>
      <Card style={{ width: 220, height: 280 }} />
    </AnimatedPortalElement>
  );
}
```

### 3. Launch from the source
```tsx
// FeedCard.tsx
const cardRef = useRef<AnimatedPortalElementRef>(null);
const navigation = useNavigation();

const handlePress = () => {
  cardRef.current?.measureLayout({
    type: 'source',
    onAnimationComplete: () => navigation.navigate('Details'),
  });
};

return (
  <AnimatedPortalElement
    ref={cardRef}
    animationHook={useSimpleAnimation}
    animationProps={{
      borderRadius: 16,
      backgroundColor: '#d8e9ff',
      toBorderRadius: 48,
      toBackgroundColor: '#f4f4f5',
    }}
  >
    <Card onPress={handlePress} />
  </AnimatedPortalElement>
);
```
When `measureLayout({ type: 'source' })` runs, the element is measured, cloned into the portal overlay, and hidden in-place. Once the destination calls `type: 'target'`, your animation hook receives both measurements and can drive the transition. `onAnimationComplete` lets you defer navigation until the animation finishes.

## Writing animation hooks
`AnimatedPortalElement` is intentionally unopinionated: pass any hook that returns additional props for the cloned child (usually an animated style).

```tsx
import { useAnimatedPortal } from 'react-native-portal-animation';
import { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function useFadeAndScale({ duration = 450 } = {}) {
  const { sourceConfig, targetConfig } = useAnimatedPortal();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useAnimatedReaction(
    () => ({ source: sourceConfig.value, target: targetConfig.value }),
    ({ source, target }, previous) => {
      if (source && !previous?.source) {
        opacity.value = 1;
        scale.value = 1;
      }

      if (source && target && !previous?.target) {
        scale.value = withTiming(target.width / source.width, { duration });
        opacity.value = withTiming(0, { duration }, () => {
          target.onAnimationComplete?.();
        });
      }
    }
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle };
}
```
Any keys returned from the hook (like `animatedStyle`) are merged onto your child via `React.cloneElement`, so design your child to accept the props you emit.

## API
### `AnimatedPortalProvider`
Wrap your application once. It renders the portal layer at the top of the tree and exposes shared measurement state to every `AnimatedPortalElement`.

### `AnimatedPortalElement`
- `children`: a single React element to be animated (should accept styles/props you plan to inject).
- `animationHook?`: a hook invoked inside the portal overlay. Use it to read measurements and return animated props.
- `animationProps?`: custom parameters forwarded to `animationHook`.
- `ref`: gives access to `measureLayout` and `isPortalActive`.

### `AnimatedPortalElementRef`
```ts
measureLayout({
  type: 'source' | 'target',
  onAnimationComplete?: () => void,
});
```
- `source`: call right before triggering navigation or state changes. Captures `x`, `y`, `width`, `height`, `pageX`, `pageY`.
- `target`: call when the destination layout is ready (usually `useLayoutEffect`). Stores the measurement and, once the animation finishes, invokes `onAnimationComplete` and cleans the portal.
- `isPortalActive`: `true` while the element is rendered inside the portal.

### `useAnimatedPortal`
Advanced escape hatch for custom animations. Returns `{ portalContent, setPortalContent, sourceConfig, targetConfig, clean }` so you can:
- read live `SharedValue<MeasuredDimensions>` for both ends,
- trigger portal cleanup when you are done,
- react to `useAnimatedReaction` changes just like in the example hooks.

## Tips
- Call `measureLayout({ type: 'target' })` every time a screen mounts or its layout changes so the portal always knows where to land.
- If you need suspense-like flows, wait for data/fetching before invoking `type: 'source'` so the measurements are precise.
- Because the portal renders above everything, you no longer have to fight with `zIndex` or header clipping.
- Multiple portal elements can exist simultaneously—each animation cleans itself once `target.onAnimationComplete` runs.

## Example app
The `example/` workspace showcases simple and complex motion recipes.
```sh
yarn
yarn workspace react-native-portal-animation-example start
# or run a platform directly inside example/
cd example
yarn ios   # expo run:ios
yarn android
```

## Contributing & License
See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Licensed under the [MIT License](LICENSE).

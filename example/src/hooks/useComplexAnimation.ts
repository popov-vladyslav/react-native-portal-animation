import {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { useAnimatedPortal } from 'react-native-portal-animation';
import { scheduleOnRN } from 'react-native-worklets';

type Corner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

type Props =
  | {
      borderRadius?: number;
      backgroundColor?: string;
      toBorderRadius?: number;
      toBackgroundColor?: string;

      corner?: Corner;
      margin?: number;

      gravity?: number; // px/s^2 (downwards)
      airDrag?: number; // per-second damping in air
      restitution?: number; // Phase A bounce
      groundFriction?: number;
      wallRestitution?: number;

      // big final hop in Phase A
      apexPad?: number; // px below top after margin
      hopStretchMs?: number; // takeoff squash/stretch

      // landing pause before Phase C
      landingPauseMs?: number;

      // Phase C exact ballistic flight
      flightTimeMs?: number; // 450–900ms feels natural
      morphMs?: number; // size/color/radius morph duration
      morphEase?: (t: number) => number;
    }
  | undefined;

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const normDeg = (deg: number) => {
  'worklet';
  // map any angle to (-180, 180]
  return (((deg % 360) + 540) % 360) - 180;
};

export const useComplexAnimation = (props?: Props) => {
  const {
    borderRadius = 0,
    backgroundColor = '#fff',
    toBorderRadius = 12,
    toBackgroundColor = '#0E1116',

    corner = 'bottom-left',
    margin = 16,

    gravity = 2300,
    airDrag = 0.6,
    restitution = 0.56,
    groundFriction = 2.0,
    wallRestitution = 0.45,

    apexPad = 12,
    hopStretchMs = 100,
    landingPauseMs = 140,

    flightTimeMs = 650,
    morphMs = 520,
    morphEase = easeOut,
  } = props || {};

  const { width: SW, height: SH } = Dimensions.get('window');
  const { sourceConfig, targetConfig } = useAnimatedPortal();

  // TOP-LEFT pose
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const r = useSharedValue(borderRadius);
  const bg = useSharedValue(backgroundColor);

  // extras
  const rot = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  // physics for Phase A
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);

  // bounds for Phase A (use current w/h)
  const minX = useSharedValue(margin);
  const maxX = useSharedValue(SW - margin);
  const floor = useSharedValue(SH - margin);

  // phases: 0=A (corner+bounce+final hop), 1=landing pause, 2=C (exact ballistic), 3=done
  const phase = useSharedValue<0 | 1 | 2 | 3>(0);
  const apexY = useSharedValue(margin + apexPad);
  const hopStarted = useSharedValue(false);
  const midHopCalled = useSharedValue(false);

  // Phase C analytic flight
  const cActive = useSharedValue(false); // true while analytic trajectory controls x/y
  const cTf = useSharedValue(Math.max(0.25, flightTimeMs / 1000)); // seconds
  const cX0 = useSharedValue(0);
  const cY0 = useSharedValue(0);
  const cVx0 = useSharedValue(0);
  const cVy0 = useSharedValue(0);
  const cProg = useSharedValue(-1); // 0..1 (-1 inactive)

  // Analytic x/y during Phase C so we ALWAYS hit target; gravity included
  useDerivedValue(() => {
    if (!cActive.value || cProg.value < 0) return;
    const t = cProg.value * cTf.value;
    x.value = cX0.value + cVx0.value * t;
    y.value = cY0.value + cVy0.value * t + 0.5 * gravity * t * t;
  });

  // Init from source
  useAnimatedReaction(
    () => sourceConfig.value,
    (src, prev) => {
      if (!src || prev) return;

      cancelAnimation(x);
      cancelAnimation(y);

      x.value = src.pageX;
      y.value = src.pageY;
      w.value = src.width;
      h.value = src.height;
      r.value = borderRadius;
      bg.value = backgroundColor;

      rot.value = 0;
      sx.value = 1;
      sy.value = 1;

      // bounds based on current size
      minX.value = margin;
      maxX.value = SW - margin - w.value;
      floor.value = SH - margin - h.value;

      apexY.value = margin + apexPad;
      hopStarted.value = false;
      midHopCalled.value = false;

      // launch towards the chosen corner (Phase A)
      const cx = corner.includes('right') ? maxX.value : minX.value;
      const cy = corner.includes('bottom') ? floor.value : margin;
      const dx = cx - x.value;
      const dy = cy - y.value;
      const speed = 1300;
      const len = Math.max(1, Math.hypot(dx, dy));
      vx.value = (dx / len) * speed;
      vy.value = (dy / len) * speed * 0.6;

      // reset Phase C state
      cActive.value = false;
      cProg.value = -1;
      cTf.value = Math.max(0.25, flightTimeMs / 1000);

      phase.value = 0;
    }
  );

  // -------- Phase A physics (bounces, big hop, mid-hop callback) --------
  useFrameCallback(({ timeSincePreviousFrame: dtMs = 0 }) => {
    if (phase.value !== 0) return;
    const dt = Math.min(0.032, Math.max(0, dtMs! / 1000));

    // gravity + drag
    vy.value += gravity * dt;
    const drag = Math.exp(-airDrag * dt);
    vx.value *= drag;
    vy.value *= drag;

    // integrate
    x.value += vx.value * dt;
    y.value += vy.value * dt;

    // walls
    if (x.value < minX.value) {
      x.value = minX.value;
      vx.value = -vx.value * wallRestitution;
    } else if (x.value > maxX.value) {
      x.value = maxX.value;
      vx.value = -vx.value * wallRestitution;
    }

    // floor
    if (y.value >= floor.value) {
      y.value = floor.value;

      // squash/stretch on impact
      const impact = Math.min(0.22, Math.abs(vy.value) / 2600);
      sx.value = 1 + impact;
      sy.value = 1 - impact;
      sx.value = withTiming(1, { duration: hopStretchMs, easing: easeOut });
      sy.value = withTiming(1, { duration: hopStretchMs, easing: easeOut });

      vy.value = -vy.value * restitution;
      vx.value *= Math.exp(-groundFriction * dt);

      // trigger big hop when almost still
      const still =
        Math.abs(floor.value - y.value) < 1.5 &&
        Math.abs(vx.value) < 16 &&
        Math.abs(vy.value) < 22;

      if (!hopStarted.value && still) {
        const climb = Math.max(8, floor.value - apexY.value);
        const vy0 = -Math.sqrt(2 * gravity * climb) * 0.98;
        vy.value = vy0;
        vx.value *= 0.6;
        // takeoff stretch
        sx.value = withTiming(0.94, {
          duration: hopStretchMs,
          easing: easeOut,
        });
        sy.value = withTiming(1.06, {
          duration: hopStretchMs,
          easing: easeOut,
        });
        hopStarted.value = true;
      }

      // after mid-hop callback, first landing → Phase 1
      if (midHopCalled.value) {
        vy.value = 0;
        vx.value *= 0.6;
        phase.value = 1;
      }
    }

    // ceiling clamp
    if (y.value < margin) {
      y.value = margin;
      vy.value = -vy.value * restitution;
    }

    // spin ONLY in Phase A so Phase C can unwind to 0 smoothly
    const rad = Math.max(8, Math.min(w.value, h.value) / 2);
    rot.value += (vx.value / (2 * Math.PI * rad)) * 360 * dt;
  });

  // Call source.onAnimationComplete at mid altitude of big hop
  useFrameCallback(() => {
    if (phase.value !== 0 || !hopStarted.value || midHopCalled.value) return;
    const midY = (floor.value + apexY.value) / 2;
    if (vy.value < 0 && y.value <= midY) {
      const src = sourceConfig.value;
      if (src?.onAnimationComplete) scheduleOnRN(src.onAnimationComplete);
      sx.value = withTiming(1, { duration: 140, easing: easeOut });
      sy.value = withTiming(1, { duration: 140, easing: easeOut });
      midHopCalled.value = true;
    }
  });

  // -------- Phase 1: landing pause → setup exact ballistic to TARGET (Phase C) --------
  useAnimatedReaction(
    () => ({ ph: phase.value, tgt: targetConfig.value }),
    ({ ph, tgt }) => {
      if (ph !== 1 || !tgt) return;

      // short pause on floor
      y.value = withTiming(
        y.value,
        { duration: landingPauseMs, easing: easeOut },
        () => {
          const T = Math.max(0.25, flightTimeMs / 1000);
          cTf.value = T;

          // start point
          cX0.value = x.value;
          cY0.value = y.value;

          // compute velocities to hit TARGET TOP-LEFT in time T (with gravity)
          cVx0.value = (tgt.pageX - cX0.value) / T;
          cVy0.value = (tgt.pageY - cY0.value - 0.5 * gravity * T * T) / T;

          // ---- ROTATION FIX: normalize current angle and tween to 0 during flight ----
          const startDeg = normDeg(rot.value);
          rot.value = startDeg;
          rot.value = withTiming(0, {
            duration: flightTimeMs,
            easing: Easing.out(Easing.cubic),
          });

          // morph visuals while flying
          r.value = withTiming(toBorderRadius ?? borderRadius, {
            duration: morphMs,
            easing: morphEase,
          });
          bg.value = withTiming(toBackgroundColor ?? backgroundColor, {
            duration: morphMs,
            easing: morphEase,
          });
          w.value = withTiming(tgt.width, {
            duration: morphMs,
            easing: morphEase,
          });
          h.value = withTiming(tgt.height, {
            duration: morphMs,
            easing: morphEase,
          });

          // activate analytic flight and drive 0→1 progress
          cActive.value = true;
          cProg.value = 0;
          phase.value = 2;

          cProg.value = withTiming(
            1,
            { duration: flightTimeMs, easing: Easing.linear },
            () => {
              // final pixel snap and completion
              x.value = withTiming(tgt.pageX, {
                duration: 120,
                easing: easeOut,
              });
              y.value = withTiming(tgt.pageY, {
                duration: 120,
                easing: easeOut,
              });
              // rot already at 0 — no glitch
              phase.value = 3;
              if (tgt.onAnimationComplete)
                scheduleOnRN(tgt.onAnimationComplete);
            }
          );
        }
      );
    }
  );

  // Style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotateZ: `${rot.value}deg` },
      { scaleX: sx.value },
      { scaleY: sy.value },
    ],
    width: w.value,
    height: h.value,
    borderRadius: r.value,
    backgroundColor: toBackgroundColor ? bg.value : backgroundColor,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  }));

  return { animatedStyle };
};

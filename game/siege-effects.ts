/** Visual-only travel and recoil. These never change enemy speed or scoring. */
export const SHOT_FLIGHT = 0.16;
export const SHOT_AIM = 0.075;
export const SHOT_RETURN = 0.12;
export const HIT_RECOIL = 0.3;
export const HIT_RISE = 0.045;
export const HIT_PUSH = 12;
export const MAX_RECOIL = 18;
/** Word box captured before typing removes it; center is normalized to the field. */
export type WordPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};
export const BURST_DURATION = 0.65;

/** Ease into the firing direction, then return as the bolt leaves the nose. */
export function shotHeading(
  from: number,
  to: number,
  age: number,
  launch: number,
  motion: boolean,
) {
  if (!motion) return age < 0.06 ? to : 0;
  if (age >= launch + SHOT_RETURN) return 0;
  const ease = (t: number) => {
    const p = Math.max(0, Math.min(1, t));
    return p * p * (3 - 2 * p);
  };
  if (age < launch)
    return from + (to - from) * ease((age - (launch - SHOT_AIM)) / SHOT_AIM);
  return to * (1 - ease((age - launch) / SHOT_RETURN));
}

export function shotGeometry(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const origin = { x: width * 0.5, y: height * 0.94 };
  const distance = Math.hypot(x - origin.x, y - origin.y);
  const direction = distance
    ? { x: (x - origin.x) / distance, y: (y - origin.y) / distance }
    : { x: 0, y: -1 };
  return {
    direction,
    // The ship artwork points up; Canvas rotation starts along the x axis.
    angle: Math.atan2(direction.y, direction.x) + Math.PI / 2,
    muzzle: { x: origin.x + direction.x * 25, y: origin.y + direction.y * 25 },
  };
}

export function impactAge(age: number, motion: boolean) {
  return age - (motion ? SHOT_FLIGHT : 0);
}

export function hitRecoil(age: number, motion: boolean) {
  const t = impactAge(age, motion);
  if (!motion || t <= 0 || t >= HIT_RECOIL) return 0;
  const ease = (p: number) => p * p * (3 - 2 * p);
  return t < HIT_RISE
    ? HIT_PUSH * ease(t / HIT_RISE)
    : HIT_PUSH * (1 - ease((t - HIT_RISE) / (HIT_RECOIL - HIT_RISE)));
}

/** A circular wave in actual pixels, including tall mobile/fullscreen fields. */
export const PULSE_TRAVEL = 0.7;
export function pulseGeometry(width: number, height: number) {
  return {
    x: width * 0.5,
    y: height * 0.94,
    radius: Math.hypot(width * 0.5, height * 0.94),
  };
}
export function pulseContact(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const wave = pulseGeometry(width, height);
  return Math.min(
    PULSE_TRAVEL,
    (Math.hypot(x * width - wave.x, y * height - wave.y) /
      Math.max(1, wave.radius)) *
      PULSE_TRAVEL,
  );
}
export function burstProfile(kind = "scout") {
  return kind === "boss"
    ? { duration: 1.2, radius: 95, particles: 24 }
    : kind === "sentinel"
      ? { duration: 0.8, radius: 62, particles: 14 }
      : kind === "interceptor"
        ? { duration: 0.55, radius: 65, particles: 16 }
        : { duration: BURST_DURATION, radius: 44, particles: 10 };
}
/** Heat follows clean-word completions, then decays smoothly after a mistake/pulse. */
export function comboHeat(current: number, combo: number, dt: number) {
  const target = Math.min(1, Math.max(0, combo) / 10);
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 3));
}

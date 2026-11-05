/** World pixels / seconds. Runtime debug values are copied per character. */
export const PHYSICS_CONFIG={
  gravity:1500,
  jumpSpeed:600,
  maxFallSpeed:720,
  groundAcceleration:680,
  groundDeceleration:900,
  airControl:.75,
  jumpReleaseRatio:.72,
  coyoteTime:.11,
  jumpBufferTime:.12,
  landDuration:.16,
  groundSnap:4,
  footBevel:26,
} as const;
export type PhysicsConfig={-readonly [K in keyof typeof PHYSICS_CONFIG]:number};

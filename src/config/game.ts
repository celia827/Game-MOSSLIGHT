export const DESIGN = { width: 1280, height: 720 } as const;
// High DPI texture rasterization is capped to bound GPU memory.
export const ART_SCALE = Math.min(window.devicePixelRatio || 1, 2);

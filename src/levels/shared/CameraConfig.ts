/** World/design pixels and seconds; Art V1.0 baseline values remain available for A/B QA. */
export const CAMERA_CONFIG={viewportWidth:1280,viewportHeight:720,horizontalAnchor:640,footAnchor:480,horizontalTau:.16,verticalTau:.22,jumpSlack:120,fallThreshold:12,fallLook:40} as const;
export type CameraMode='stable'|'baseline';

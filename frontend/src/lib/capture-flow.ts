export const CAPTURE_ANGLES = ["depan", "kanan", "kiri", "belakang"] as const;

export type CaptureAngle = (typeof CAPTURE_ANGLES)[number];

export function getInitialCaptureAngle(): CaptureAngle {
  return CAPTURE_ANGLES[0];
}

export function getNextCaptureAngle(current: CaptureAngle): CaptureAngle | null {
  const idx = CAPTURE_ANGLES.indexOf(current);
  if (idx === -1 || idx === CAPTURE_ANGLES.length - 1) return null;
  return CAPTURE_ANGLES[idx + 1];
}

export function isFinalAngle(angle: CaptureAngle): boolean {
  return angle === CAPTURE_ANGLES[CAPTURE_ANGLES.length - 1];
}

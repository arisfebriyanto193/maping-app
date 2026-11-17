import { DroneProfile } from '@/types/drone';

export const DRONE_PRESETS: DroneProfile[] = [
  {
    id: 'dji-mini-4-pro',
    name: 'DJI Mini 4 Pro (24mm eq)',
    manufacturer: 'DJI',
    sensorWidthMm: 9.6,   // 1/1.3" CMOS
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,  // 24mm equivalent
    imageWidthPx: 8064,   // 48MP mode (or 4032 for 12MP)
    imageHeightPx: 6048,
    maxSpeedMs: 16,
    maxFlightTimeMin: 34,
    djiEnumCode: 89,
  },
  {
    id: 'dji-mini-3-pro',
    name: 'DJI Mini 3 / 3 Pro',
    manufacturer: 'DJI',
    sensorWidthMm: 9.6,
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,
    imageWidthPx: 8064,
    imageHeightPx: 6048,
    maxSpeedMs: 16,
    maxFlightTimeMin: 34,
    djiEnumCode: 77,
  },
  {
    id: 'dji-air-3',
    name: 'DJI Air 3 (Wide 24mm)',
    manufacturer: 'DJI',
    sensorWidthMm: 9.6,
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,
    imageWidthPx: 8064,
    imageHeightPx: 6048,
    maxSpeedMs: 21,
    maxFlightTimeMin: 46,
    djiEnumCode: 87,
  },
  {
    id: 'dji-mavic-3-pro',
    name: 'DJI Mavic 3 / 3 Pro (4/3 CMOS)',
    manufacturer: 'DJI',
    sensorWidthMm: 17.3,  // 4/3" CMOS Hasselblad
    sensorHeightMm: 13.0,
    focalLengthMm: 12.29, // 24mm equivalent
    imageWidthPx: 5280,
    imageHeightPx: 3956,
    maxSpeedMs: 21,
    maxFlightTimeMin: 43,
    djiEnumCode: 67,
  },
  {
    id: 'dji-mavic-3-enterprise',
    name: 'DJI Mavic 3 Enterprise (M3E)',
    manufacturer: 'DJI',
    sensorWidthMm: 17.3,
    sensorHeightMm: 13.0,
    focalLengthMm: 12.29,
    imageWidthPx: 5280,
    imageHeightPx: 3956,
    maxSpeedMs: 21,
    maxFlightTimeMin: 42,
    djiEnumCode: 67,
  },
  {
    id: 'litchi-generic',
    name: 'Litchi / Lito x1 / Generic Drone',
    manufacturer: 'Litchi',
    sensorWidthMm: 9.6,
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,
    imageWidthPx: 4000,
    imageHeightPx: 3000,
    maxSpeedMs: 15,
    maxFlightTimeMin: 28,
  },
  {
    id: 'custom-drone',
    name: 'Kustom Drone / Kamera',
    manufacturer: 'Kustom',
    sensorWidthMm: 9.6,
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,
    imageWidthPx: 4000,
    imageHeightPx: 3000,
    maxSpeedMs: 15,
    maxFlightTimeMin: 30,
  },
];

export function calculatePhotogrammetry(
  drone: DroneProfile,
  altitudeM: number,
  frontOverlapPercent: number,
  sideOverlapPercent: number
) {
  // GSD = (Altitude * SensorWidth) / (FocalLength * ImageWidth) * 100 (cm/px)
  const gsdCmPx = (altitudeM * drone.sensorWidthMm) / (drone.focalLengthMm * drone.imageWidthPx) * 100;

  // Ground Footprint (m)
  const footprintWidthM = (altitudeM * drone.sensorWidthMm) / drone.focalLengthMm;
  const footprintHeightM = (altitudeM * drone.sensorHeightMm) / drone.focalLengthMm;

  // Spacing between flight lines (side overlap)
  const lineSpacingM = Math.max(1, footprintWidthM * (1 - sideOverlapPercent / 100));

  // Distance between consecutive photo triggers along line (front overlap)
  const photoDistanceM = Math.max(1, footprintHeightM * (1 - frontOverlapPercent / 100));

  return {
    gsdCmPx: Math.round(gsdCmPx * 100) / 100,
    footprintWidthM: Math.round(footprintWidthM * 10) / 10,
    footprintHeightM: Math.round(footprintHeightM * 10) / 10,
    lineSpacingM: Math.round(lineSpacingM * 10) / 10,
    photoDistanceM: Math.round(photoDistanceM * 10) / 10,
  };
}

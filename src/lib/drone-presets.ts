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
    id: 'dji-mini-5-pro',
    name: 'DJI Mini 5 Pro (24mm eq)',
    manufacturer: 'DJI',
    sensorWidthMm: 9.6,
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,
    imageWidthPx: 8064,
    imageHeightPx: 6048,
    maxSpeedMs: 18,
    maxFlightTimeMin: 36,
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
    id: 'dji-air-3s',
    name: 'DJI Air 3S (1-inch 24mm)',
    manufacturer: 'DJI',
    sensorWidthMm: 13.2,  // 1" CMOS
    sensorHeightMm: 8.8,
    focalLengthMm: 8.8,   // 24mm equivalent
    imageWidthPx: 8192,   // 50MP
    imageHeightPx: 6144,
    maxSpeedMs: 21,
    maxFlightTimeMin: 45,
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
    id: 'dji-mavic-4-pro',
    name: 'DJI Mavic 4 Pro (Triple Cam)',
    manufacturer: 'DJI',
    sensorWidthMm: 17.3,  // 4/3" CMOS Hasselblad
    sensorHeightMm: 13.0,
    focalLengthMm: 12.29,
    imageWidthPx: 8064,
    imageHeightPx: 6048,
    maxSpeedMs: 22,
    maxFlightTimeMin: 45,
    djiEnumCode: 68,
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
    id: 'dji-lito-x1',
    name: 'DJI Lito X1 / Litchi Custom',
    manufacturer: 'DJI / Litchi',
    sensorWidthMm: 9.6,
    sensorHeightMm: 7.2,
    focalLengthMm: 6.72,
    imageWidthPx: 4000,
    imageHeightPx: 3000,
    maxSpeedMs: 15,
    maxFlightTimeMin: 28,
  },
  {
    id: 'potensic-atom',
    name: 'Potensic Atom / Atom 3',
    manufacturer: 'Potensic',
    sensorWidthMm: 6.4,   // 1/2.3" CMOS
    sensorHeightMm: 4.8,
    focalLengthMm: 4.5,
    imageWidthPx: 4000,
    imageHeightPx: 3000,
    maxSpeedMs: 16,
    maxFlightTimeMin: 32,
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
  sideOverlapPercent: number,
  sensorMode: '12mp' | '48mp' = '48mp'
) {
  // Support 12MP binned mode vs 48MP/50MP high-res mode (AerialNav feature)
  let effectiveWidthPx = drone.imageWidthPx;
  let effectiveHeightPx = drone.imageHeightPx;

  if (sensorMode === '12mp') {
    // If drone default is 48MP (8064x6048) or 50MP (8192x6144), 12MP mode uses standard binned pixels
    if (drone.imageWidthPx >= 7000) {
      effectiveWidthPx = 4032;
      effectiveHeightPx = 3024;
    } else if (drone.imageWidthPx > 5000) {
      // e.g. Mavic 3 20MP (5280) -> scaled 12MP (4000)
      effectiveWidthPx = 4000;
      effectiveHeightPx = 3000;
    }
  }

  // GSD = (Altitude * SensorWidth) / (FocalLength * ImageWidth) * 100 (cm/px)
  const gsdCmPx = (altitudeM * drone.sensorWidthMm) / (drone.focalLengthMm * effectiveWidthPx) * 100;

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

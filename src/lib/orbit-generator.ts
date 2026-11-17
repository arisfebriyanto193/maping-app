import * as turf from '@turf/turf';
import { Waypoint, DroneProfile, MissionStats } from '@/types/drone';
import { calculatePhotogrammetry } from './drone-presets';

export interface OrbitGeneratorOptions {
  center: [number, number]; // [lat, lng]
  radiusM: number;
  altitude: number;
  speed: number;
  photoCount?: number;
  drone: DroneProfile;
}

export function generateOrbitPath(options: OrbitGeneratorOptions): {
  waypoints: Waypoint[];
  stats: MissionStats;
} {
  const { center, radiusM, altitude, speed, photoCount = 18, drone } = options;

  if (!center || radiusM <= 0) {
    return {
      waypoints: [],
      stats: {
        areaM2: 0,
        areaHectares: 0,
        totalDistanceM: 0,
        flightTimeSeconds: 0,
        photoCount: 0,
        gsdCmPx: 0,
        batteriesRequired: 0,
        batteryRemainingPercent: 100,
      },
    };
  }

  const centerPt = turf.point([center[1], center[0]]);
  const waypoints: Waypoint[] = [];
  const stepAngle = 360 / photoCount;

  // Gimbal pitch towards center
  const pitchRad = Math.atan2(altitude, radiusM);
  const gimbalPitch = -Math.round((pitchRad * 180) / Math.PI);

  const photoParams = calculatePhotogrammetry(drone, altitude, 75, 65);

  for (let i = 0; i <= photoCount; i++) {
    const angle = (i * stepAngle) % 360;
    // Calculate point at distance radiusM and bearing angle
    const dest = turf.destination(centerPt, radiusM / 1000, angle, { units: 'kilometers' });
    const coords = dest.geometry.coordinates;

    // Heading pointing back to center
    const headingToCenter = Math.round((angle + 180) % 360);

    waypoints.push({
      id: i + 1,
      lat: Math.round(coords[1] * 1e7) / 1e7,
      lng: Math.round(coords[0] * 1e7) / 1e7,
      altitude,
      speed,
      heading: headingToCenter,
      gimbalPitch,
      action: { type: 'takePhoto', param: 0 },
    });
  }

  const perimeterM = 2 * Math.PI * radiusM;
  const areaM2 = Math.PI * radiusM * radiusM;
  const flightTimeSeconds = Math.round(perimeterM / Math.max(1, speed) + waypoints.length * 1.5);

  const maxFlightTimeSec = (drone.maxFlightTimeMin || 30) * 60;
  const usableFlightTimeSec = maxFlightTimeSec * 0.75;
  const batteriesRequired = Math.max(1, Math.ceil(flightTimeSeconds / usableFlightTimeSec));
  const batteryRemainingPercent = Math.max(
    5,
    Math.round(100 - ((flightTimeSeconds % usableFlightTimeSec) / usableFlightTimeSec) * 75)
  );

  return {
    waypoints,
    stats: {
      areaM2: Math.round(areaM2),
      areaHectares: Math.round((areaM2 / 10000) * 100) / 100,
      totalDistanceM: Math.round(perimeterM),
      flightTimeSeconds,
      photoCount: waypoints.length,
      gsdCmPx: photoParams.gsdCmPx,
      batteriesRequired,
      batteryRemainingPercent,
    },
  };
}

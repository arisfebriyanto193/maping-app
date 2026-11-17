import * as turf from '@turf/turf';
import { Waypoint, DroneProfile, MissionStats } from '@/types/drone';
import { calculatePhotogrammetry } from './drone-presets';

export interface CorridorGeneratorOptions {
  pathCoords: [number, number][]; // [lat, lng]
  corridorWidthM: number;
  altitude: number;
  speed: number;
  overlapFront: number;
  overlapSide: number;
  gimbalPitch: number;
  drone: DroneProfile;
}

export function generateCorridorPath(options: CorridorGeneratorOptions): {
  waypoints: Waypoint[];
  stats: MissionStats;
} {
  const { pathCoords, corridorWidthM, altitude, speed, overlapFront, overlapSide, gimbalPitch, drone } =
    options;

  if (!pathCoords || pathCoords.length < 2) {
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

  const lineGeojson = turf.lineString(pathCoords.map((pt) => [pt[1], pt[0]]));
  const lineLengthM = turf.length(lineGeojson, { units: 'meters' });
  const areaM2 = lineLengthM * corridorWidthM;
  const areaHectares = Math.round((areaM2 / 10000) * 100) / 100;

  const photoParams = calculatePhotogrammetry(drone, altitude, overlapFront, overlapSide);
  const lineSpacingM = photoParams.lineSpacingM;
  const photoDistanceM = photoParams.photoDistanceM;

  // Number of parallel passes
  const numPasses = Math.max(1, Math.ceil(corridorWidthM / lineSpacingM));
  const passOffsets: number[] = [];

  if (numPasses === 1) {
    passOffsets.push(0);
  } else {
    const halfWidth = corridorWidthM / 2;
    const step = corridorWidthM / (numPasses - 1);
    for (let i = 0; i < numPasses; i++) {
      passOffsets.push(-halfWidth + i * step);
    }
  }

  const allPoints: { lng: number; lat: number }[] = [];

  for (let pIndex = 0; pIndex < passOffsets.length; pIndex++) {
    const offsetM = passOffsets[pIndex];
    let offsetLine = lineGeojson;
    if (Math.abs(offsetM) > 0.5) {
      try {
        offsetLine = turf.lineOffset(lineGeojson, offsetM / 1000, { units: 'kilometers' });
      } catch {
        offsetLine = lineGeojson;
      }
    }

    const len = turf.length(offsetLine, { units: 'meters' });
    const count = Math.max(1, Math.ceil(len / photoDistanceM));
    const stepDist = len / count;

    const linePts: { lng: number; lat: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const pt = turf.along(offsetLine, (i * stepDist) / 1000, { units: 'kilometers' });
      linePts.push({
        lng: pt.geometry.coordinates[0],
        lat: pt.geometry.coordinates[1],
      });
    }

    if (pIndex % 2 === 1) {
      linePts.reverse();
    }

    allPoints.push(...linePts);
  }

  const waypoints: Waypoint[] = [];
  let totalDistanceM = 0;

  for (let i = 0; i < allPoints.length; i++) {
    const pt = allPoints[i];
    let heading = 0;

    if (i < allPoints.length - 1) {
      const nextPt = allPoints[i + 1];
      const bearing = turf.bearing(
        turf.point([pt.lng, pt.lat]),
        turf.point([nextPt.lng, nextPt.lat])
      );
      heading = Math.round((bearing + 360) % 360);
      totalDistanceM += turf.distance(
        turf.point([pt.lng, pt.lat]),
        turf.point([nextPt.lng, nextPt.lat]),
        { units: 'meters' }
      );
    } else if (i > 0) {
      heading = waypoints[i - 1]?.heading || 0;
    }

    waypoints.push({
      id: i + 1,
      lat: Math.round(pt.lat * 1e7) / 1e7,
      lng: Math.round(pt.lng * 1e7) / 1e7,
      altitude,
      speed,
      heading,
      gimbalPitch,
      action: { type: 'takePhoto', param: 0 },
    });
  }

  totalDistanceM = Math.round(totalDistanceM);
  const flightTimeSeconds = Math.round(totalDistanceM / Math.max(1, speed) + waypoints.length * 1.5);
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
      areaHectares,
      totalDistanceM,
      flightTimeSeconds,
      photoCount: waypoints.length,
      gsdCmPx: photoParams.gsdCmPx,
      batteriesRequired,
      batteryRemainingPercent,
    },
  };
}

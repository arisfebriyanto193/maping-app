import * as turf from '@turf/turf';
import { Waypoint, DroneProfile, MissionStats, WaypointPathType } from '@/types/drone';
import { calculatePhotogrammetry } from './drone-presets';

export interface GridGeneratorOptions {
  polygonCoords: [number, number][]; // [lat, lng] array
  altitude: number; // m
  speed: number; // m/s
  overlapFront: number; // %
  overlapSide: number; // %
  gridAngle: number; // 0-360 deg
  doubleGrid: boolean; // 3D crosshatch
  gimbalPitch: number; // -90 nadir
  drone: DroneProfile;
  sensorMode?: '12mp' | '48mp';
  margin?: number; // meters (overshoot beyond polygon boundary)
  waypointPathType?: WaypointPathType; // 'full' (all photo points) vs 'turnOnly' (corners only)
}

export function generateMappingGrid(options: GridGeneratorOptions): {
  waypoints: Waypoint[];
  stats: MissionStats;
} {
  const {
    polygonCoords,
    altitude,
    speed,
    overlapFront,
    overlapSide,
    gridAngle,
    doubleGrid,
    gimbalPitch,
    drone,
    sensorMode = '48mp',
    margin = 15,
    waypointPathType = 'turnOnly',
  } = options;

  if (!polygonCoords || polygonCoords.length < 3) {
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

  // Convert to GeoJSON [lng, lat] ring
  const geojsonCoords: [number, number][] = polygonCoords.map((pt) => [pt[1], pt[0]]);
  // Ensure closed ring
  if (
    geojsonCoords[0][0] !== geojsonCoords[geojsonCoords.length - 1][0] ||
    geojsonCoords[0][1] !== geojsonCoords[geojsonCoords.length - 1][1]
  ) {
    geojsonCoords.push([geojsonCoords[0][0], geojsonCoords[0][1]]);
  }

  const poly = turf.polygon([geojsonCoords]);
  const areaM2 = turf.area(poly);
  const areaHectares = Math.round((areaM2 / 10000) * 100) / 100;

  // Apply margin / overshoot buffer if margin > 0
  let sweepPoly = poly;
  if (margin > 0) {
    try {
      const buffered = turf.buffer(poly, margin, { units: 'meters' });
      if (buffered && buffered.geometry) {
        // Turf buffer can return Feature<Polygon | MultiPolygon>
        if (buffered.geometry.type === 'Polygon') {
          sweepPoly = buffered as turf.Feature<turf.Polygon>;
        } else if (buffered.geometry.type === 'MultiPolygon') {
          // Take outer polygon
          sweepPoly = turf.polygon(buffered.geometry.coordinates[0]);
        }
      }
    } catch (e) {
      console.warn('Buffer polygon failed, fallback to original poly', e);
      sweepPoly = poly;
    }
  }

  // Calculate photogrammetry spacing
  const photoParams = calculatePhotogrammetry(drone, altitude, overlapFront, overlapSide, sensorMode);
  const lineSpacingM = photoParams.lineSpacingM;
  const photoDistanceM = photoParams.photoDistanceM;

  // Generate single or double grid
  let allPoints: { lng: number; lat: number }[] = [];

  const anglesToRun = doubleGrid ? [gridAngle, (gridAngle + 90) % 360] : [gridAngle];

  for (const angle of anglesToRun) {
    const gridPassPoints = generatePassLines(
      sweepPoly,
      angle,
      lineSpacingM,
      photoDistanceM,
      waypointPathType,
      margin
    );
    allPoints = allPoints.concat(gridPassPoints);
  }

  // Build Waypoints with heading, speed, altitude, and action
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

      const segmentDist = turf.distance(
        turf.point([pt.lng, pt.lat]),
        turf.point([nextPt.lng, nextPt.lat]),
        { units: 'meters' }
      );
      totalDistanceM += segmentDist;
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
      curveSize: 0,
    });
  }

  totalDistanceM = Math.round(totalDistanceM);
  // Flight time: distance / speed + turning overhead (approx 2s per corner)
  const flightTimeSeconds = Math.round(
    totalDistanceM / Math.max(1, speed) + waypoints.length * 1.5
  );
  const maxFlightTimeSec = (drone.maxFlightTimeMin || 30) * 60;
  // Reserve 25% battery for safe RTH
  const usableFlightTimeSec = maxFlightTimeSec * 0.75;
  const batteriesRequired = Math.max(1, Math.ceil(flightTimeSeconds / usableFlightTimeSec));
  const batteryRemainingPercent = Math.max(
    5,
    Math.round(100 - ((flightTimeSeconds % usableFlightTimeSec) / usableFlightTimeSec) * 75)
  );

  // Even in turnOnly mode, calculate accurate estimated photos taken by timed shot
  const estimatedPhotos = Math.max(
    1,
    Math.round(totalDistanceM / Math.max(1, photoDistanceM))
  );

  return {
    waypoints,
    stats: {
      areaM2: Math.round(areaM2),
      areaHectares,
      totalDistanceM,
      flightTimeSeconds,
      photoCount: estimatedPhotos,
      gsdCmPx: photoParams.gsdCmPx,
      batteriesRequired,
      batteryRemainingPercent,
    },
  };
}

function generatePassLines(
  poly: turf.Feature<turf.Polygon>,
  angleDeg: number,
  lineSpacingM: number,
  photoDistanceM: number,
  waypointPathType: WaypointPathType,
  marginM: number
): { lng: number; lat: number }[] {
  const points: { lng: number; lat: number }[] = [];

  const centroid = turf.centroid(poly);
  const centerCoord = centroid.geometry.coordinates;

  // Rotate polygon so flight lines become horizontal
  const rotatedPoly = turf.transformRotate(poly, -angleDeg, { pivot: centerCoord });
  const bbox = turf.bbox(rotatedPoly); // [minX, minY, maxX, maxY]

  // Earth distance conversions in degrees
  const latDegPerMeter = 1 / 111320;
  const lngDegPerMeter = 1 / (111320 * Math.cos((centerCoord[1] * Math.PI) / 180));

  const lineSpacingDeg = lineSpacingM * latDegPerMeter;
  const photoDistDeg = photoDistanceM * lngDegPerMeter;
  const overshootDeg = Math.max(2, marginM * 0.5) * lngDegPerMeter; // Extra lead-in/lead-out margin at line ends

  const minY = bbox[1];
  const maxY = bbox[3];
  const minX = bbox[0] - 0.002;
  const maxX = bbox[2] + 0.002;

  let currentY = minY + lineSpacingDeg / 2;
  let lineIndex = 0;

  while (currentY <= maxY) {
    const sweepLine = turf.lineString([
      [minX, currentY],
      [maxX, currentY],
    ]);

    const intersects = turf.lineIntersect(sweepLine, rotatedPoly);
    if (intersects.features.length >= 2) {
      // Sort intersection points by X
      const sortedPts = intersects.features
        .map((f) => f.geometry.coordinates as [number, number])
        .sort((a, b) => a[0] - b[0]);

      // Take outer pair and extend by overshoot margin
      const startX = sortedPts[0][0] - overshootDeg;
      const endX = sortedPts[sortedPts.length - 1][0] + overshootDeg;

      if (endX - startX > 0.00001) {
        const segPoints: [number, number][] = [];

        if (waypointPathType === 'turnOnly') {
          // Turn Only Mode: Only record the 2 turning points (start and end of pass line)
          segPoints.push([startX, currentY]);
          segPoints.push([endX, currentY]);
        } else {
          // Full Mode: Record a waypoint for every photo distance interval
          const numPhotos = Math.max(1, Math.ceil((endX - startX) / photoDistDeg));
          const actualStepX = (endX - startX) / numPhotos;

          for (let s = 0; s <= numPhotos; s++) {
            segPoints.push([startX + s * actualStepX, currentY]);
          }
        }

        // Boustrophedon serpentine alternate
        if (lineIndex % 2 === 1) {
          segPoints.reverse();
        }

        // Un-rotate points back to real coordinates
        for (const pt of segPoints) {
          const ptFeature = turf.point(pt);
          const unrotated = turf.transformRotate(ptFeature, angleDeg, { pivot: centerCoord });
          points.push({
            lng: unrotated.geometry.coordinates[0],
            lat: unrotated.geometry.coordinates[1],
          });
        }

        lineIndex++;
      }
    }

    currentY += lineSpacingDeg;
  }

  return points;
}

import { Waypoint } from '@/types/drone';

export function generateGeoJSON(
  missionTitle: string,
  waypoints: Waypoint[],
  boundaryCoords?: [number, number][]
) {
  const features: any[] = [];

  // Boundary feature
  if (boundaryCoords && boundaryCoords.length >= 3) {
    const ring = boundaryCoords.map((pt) => [pt[1], pt[0]]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    features.push({
      type: 'Feature',
      properties: { name: 'Survey Boundary Area', type: 'boundary' },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    });
  }

  // Flight Path LineString
  if (waypoints.length >= 2) {
    features.push({
      type: 'Feature',
      properties: {
        name: `${missionTitle} - Flight Track`,
        type: 'flight_track',
      },
      geometry: {
        type: 'LineString',
        coordinates: waypoints.map((wp) => [wp.lng, wp.lat, wp.altitude]),
      },
    });
  }

  // Waypoints Points
  waypoints.forEach((wp, idx) => {
    features.push({
      type: 'Feature',
      properties: {
        index: idx + 1,
        altitude: wp.altitude,
        speed: wp.speed,
        heading: wp.heading,
        gimbalPitch: wp.gimbalPitch,
        action: wp.action?.type,
      },
      geometry: {
        type: 'Point',
        coordinates: [wp.lng, wp.lat, wp.altitude],
      },
    });
  });

  return {
    type: 'FeatureCollection',
    name: missionTitle,
    features,
  };
}

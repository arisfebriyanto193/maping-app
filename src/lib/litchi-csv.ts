import { Waypoint } from '@/types/drone';

export function generateLitchiCSV(waypoints: Waypoint[]): string {
  const header = [
    'latitude',
    'longitude',
    'altitude(m)',
    'heading(deg)',
    'curvesize(m)',
    'rotationdir',
    'gimbalmode',
    'gimbalpitchangle',
    'actiontype1',
    'actionparam1',
    'actiontype2',
    'actionparam2',
    'actiontype3',
    'actionparam3',
    'actiontype4',
    'actionparam4',
    'actiontype5',
    'actionparam5',
    'actiontype6',
    'actionparam6',
    'actiontype7',
    'actionparam7',
    'actiontype8',
    'actionparam8',
    'actiontype9',
    'actionparam9',
    'actiontype10',
    'actionparam10',
    'actiontype11',
    'actionparam11',
    'actiontype12',
    'actionparam12',
    'actiontype13',
    'actionparam13',
    'actiontype14',
    'actionparam14',
    'actiontype15',
    'actionparam15',
    'altitudemode',
    'speed(m/s)',
    'poi_latitude',
    'poi_longitude',
    'poi_altitude(m)',
    'poi_altitudemode',
  ].join(',');

  const rows = waypoints.map((wp) => {
    const lat = wp.lat.toFixed(7);
    const lng = wp.lng.toFixed(7);
    const alt = Math.round(wp.altitude);
    const heading = Math.round(wp.heading || 0);
    const curve = wp.curveSize || 0;
    const rotationDir = 0; // 0 = clockwise
    const gimbalMode = 0; // 0 = disabled/focus, 2 = interpolate
    const gimbalPitch = wp.gimbalPitch ?? -90;

    // Action 1: 1 = Take Photo, param 0
    // Unused actions are -1, 0
    const actions: string[] = ['1', '0'];
    for (let a = 2; a <= 15; a++) {
      actions.push('-1', '0');
    }

    const altitudeMode = 0; // 0 = MSL / relative to takeoff
    const speed = wp.speed ? wp.speed.toFixed(1) : '5.0';
    const poiLat = '0';
    const poiLng = '0';
    const poiAlt = '0';
    const poiAltMode = '0';

    return [
      lat,
      lng,
      alt,
      heading,
      curve,
      rotationDir,
      gimbalMode,
      gimbalPitch,
      ...actions,
      altitudeMode,
      speed,
      poiLat,
      poiLng,
      poiAlt,
      poiAltMode,
    ].join(',');
  });

  return [header, ...rows].join('\r\n');
}

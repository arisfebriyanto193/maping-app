import { Waypoint } from '@/types/drone';

export function generateStandardKML(missionTitle: string, waypoints: Waypoint[]): string {
  const coordinatesStr = waypoints
    .map((wp) => `${wp.lng},${wp.lat},${wp.altitude}`)
    .join(' ');

  let placemarksXml = '';
  waypoints.forEach((wp, idx) => {
    placemarksXml += `
    <Placemark>
      <name>WP ${idx + 1}</name>
      <description>Altitude: ${wp.altitude}m, Speed: ${wp.speed}m/s, Heading: ${wp.heading || 0}°</description>
      <Point>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>${wp.lng},${wp.lat},${wp.altitude}</coordinates>
      </Point>
    </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${missionTitle || 'Drone Flight Mission'}</name>
    <Style id="flightPathStyle">
      <LineStyle>
        <color>ff00ff00</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>7f00ff00</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>Jalur Terbang Drone</name>
      <styleUrl>#flightPathStyle</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>
          ${coordinatesStr}
        </coordinates>
      </LineString>
    </Placemark>
    ${placemarksXml}
  </Document>
</kml>`;
}

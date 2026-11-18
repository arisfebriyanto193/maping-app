import JSZip from 'jszip';

/**
 * Parses Google Earth KML, KMZ, or GeoJSON files into an array of [lat, lng] coordinates
 */
export async function parseKmlOrKmz(file: File): Promise<[number, number][]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.kmz')) {
    const zip = await JSZip.loadAsync(file);
    // Find any file ending with .kml (often doc.kml)
    const kmlKey = Object.keys(zip.files).find((key) => key.toLowerCase().endsWith('.kml'));
    if (!kmlKey) {
      throw new Error('Tidak ditemukan file KML di dalam arsip KMZ.');
    }
    const kmlText = await zip.files[kmlKey].async('text');
    return extractCoordinatesFromKML(kmlText);
  } else if (fileName.endsWith('.kml') || fileName.endsWith('.xml')) {
    const kmlText = await file.text();
    return extractCoordinatesFromKML(kmlText);
  } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
    const jsonText = await file.text();
    const geojson = JSON.parse(jsonText);
    return extractCoordinatesFromGeoJSON(geojson);
  } else {
    throw new Error('Format file tidak didukung. Harap pilih file .kml, .kmz, atau .geojson');
  }
}

function extractCoordinatesFromKML(kmlString: string): [number, number][] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, 'text/xml');

  // Check for XML parse errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('File KML rusak atau format XML tidak valid.');
  }

  const coordElements = xmlDoc.getElementsByTagName('coordinates');
  if (coordElements.length === 0) {
    throw new Error('Tidak ditemukan tag <coordinates> di dalam file KML Google Earth.');
  }

  // Iterate over coordinate elements to find a polygon/linestring with >= 3 points
  for (let i = 0; i < coordElements.length; i++) {
    const rawCoords = coordElements[i].textContent?.trim();
    if (!rawCoords) continue;

    const parsed = parseCoordinatesString(rawCoords);
    if (parsed.length >= 3) {
      return parsed;
    }
  }

  // Fallback: any coordinate element with > 0 points
  for (let i = 0; i < coordElements.length; i++) {
    const rawCoords = coordElements[i].textContent?.trim();
    if (!rawCoords) continue;
    const parsed = parseCoordinatesString(rawCoords);
    if (parsed.length > 0) return parsed;
  }

  throw new Error('Tidak ada data koordinat yang valid di dalam file KML.');
}

function parseCoordinatesString(coordStr: string): [number, number][] {
  // Coordinates are separated by whitespace (spaces, tabs, newlines)
  const tokens = coordStr.trim().split(/\s+/);
  const result: [number, number][] = [];

  for (const token of tokens) {
    const parts = token.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          result.push([lat, lng]);
        }
      }
    }
  }

  // If closed loop (first equals last), remove the last duplicate
  if (result.length > 3) {
    const first = result[0];
    const last = result[result.length - 1];
    if (Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7) {
      result.pop();
    }
  }

  return result;
}

function extractCoordinatesFromGeoJSON(geojson: any): [number, number][] {
  let geometry = geojson;
  if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
    geometry = geojson.features[0].geometry;
  } else if (geojson.type === 'Feature') {
    geometry = geojson.geometry;
  }

  if (!geometry || !geometry.coordinates) {
    throw new Error('Format GeoJSON tidak memiliki data koordinat yang valid.');
  }

  let coords: any[] = [];
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0];
  } else if (geometry.type === 'LineString') {
    coords = geometry.coordinates;
  } else {
    throw new Error(`Tipe geometri ${geometry.type} belum didukung.`);
  }

  const result: [number, number][] = coords.map((c: any) => [c[1], c[0]]);

  if (result.length > 3) {
    const first = result[0];
    const last = result[result.length - 1];
    if (Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7) {
      result.pop();
    }
  }

  return result;
}

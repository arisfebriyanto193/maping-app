'use client';

/**
 * Loads a GeoTIFF (URL, File, or ArrayBuffer) and adds it as a GeoRasterLayer to a Leaflet map.
 * Dynamic imports are used to ensure compatibility with Next.js client-side execution.
 */
export async function loadGeoTiffOnMap(
  map: any,
  source: string | File | ArrayBuffer,
  options?: { opacity?: number; fitBounds?: boolean }
) {
  try {
    const parseGeorasterModule = await import('georaster');
    const parseGeoraster = parseGeorasterModule.default || parseGeorasterModule;

    const GeoRasterLayerModule = await import('georaster-layer-for-leaflet');
    const GeoRasterLayer = GeoRasterLayerModule.default || GeoRasterLayerModule;

    let georaster;
    if (typeof source === 'string') {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Gagal mengunduh file GeoTIFF: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      georaster = await parseGeoraster(arrayBuffer);
    } else if (source instanceof File) {
      const arrayBuffer = await source.arrayBuffer();
      georaster = await parseGeoraster(arrayBuffer);
    } else {
      georaster = await parseGeoraster(source);
    }

    const layer = new (GeoRasterLayer as any)({
      georaster,
      opacity: options?.opacity ?? 0.85,
      resolution: 256,
    });

    layer.addTo(map);

    if (options?.fitBounds !== false) {
      try {
        const bounds = layer.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
        }
      } catch (err) {
        console.warn('Could not fit bounds to GeoTIFF:', err);
      }
    }

    return {
      layer,
      georaster,
      bounds: layer.getBounds ? layer.getBounds() : null,
    };
  } catch (error) {
    console.error('loadGeoTiffOnMap error:', error);
    throw error;
  }
}

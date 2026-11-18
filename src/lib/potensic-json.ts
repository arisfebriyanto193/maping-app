import JSZip from 'jszip';
import { Waypoint, MissionSettings } from '@/types/drone';

export async function generatePotensicZip(
  missionTitle: string,
  waypoints: Waypoint[],
  settings: MissionSettings
): Promise<Blob> {
  const zip = new JSZip();
  const cleanTitle = (missionTitle || 'Potensic_Waypoints').replace(/\s+/g, '_');

  const globalConfig = {
    finishAction: settings.finishAction === 'autoHover' ? 'HOVER' : 'RETURN',
    globalHeight: Number(settings.altitude || 50),
    globalHeightType: 0,
    isOrder: true,
    lostAction: settings.rcLostAction === 'autoHover' ? 'HOVER' : settings.rcLostAction === 'goContinue' ? 'KEEP' : 'RETURN',
    speed: Number(settings.speed || 5),
  };

  const waypointsList = waypoints.map((wp) => {
    return {
      action: settings.cameraAction === 'recordVideo' ? 'VIDEO' : settings.cameraAction === 'none' ? 'NONE' : 'PHOTO',
      gimbalPitch: wp.gimbalPitch ?? -90,
      gimbalType: 'DEFINE',
      height: Number(wp.altitude || settings.altitude || 50),
      hoverTime: 0,
      lat: wp.lat,
      lng: wp.lng,
      poiHeight: 0,
      poiLat: 0,
      poiLng: 0,
      poiType: 0,
      speed: Number(wp.speed || settings.speed || 5),
      speedType: 'GLOBAL',
      yaw: wp.heading || 0,
      yawType: 'DEFINE',
      zoomRatio: 1,
      zoomType: 'HAND',
    };
  });

  zip.file(`${cleanTitle}.json`, JSON.stringify(waypointsList, null, 2));
  zip.file('global.json', JSON.stringify(globalConfig, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}

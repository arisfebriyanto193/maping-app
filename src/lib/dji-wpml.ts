import JSZip from 'jszip';
import { Waypoint, DroneProfile, FinishAction, RCLostAction } from '@/types/drone';

export interface WPMLOptions {
  missionTitle: string;
  drone?: DroneProfile;
  waypoints: Waypoint[];
  globalSpeed?: number;
  securityHeight?: number;
  finishAction?: FinishAction;
  rcLostAction?: RCLostAction;
  turnMode?: 'turnOnly' | 'smooth';
}

/**
 * Generates native DJI Fly KMZ (wpmz/template.kml & wpmz/waylines.wpml)
 * Structured exactly matching native DJI Fly waypoint files (e.g. wp-dari-dji.kmz)
 * Compatible with DJI Mini 4 Pro, Mini 5 Pro, Air 3, Air 3S, Mavic 3 series in DJI Fly app.
 */
export async function generateDJIWPMLKMZ(options: WPMLOptions): Promise<Blob> {
  const {
    waypoints,
    globalSpeed = 3,
    finishAction = 'goHome',
    rcLostAction = 'goContinue',
    turnMode: userTurnMode = 'smooth',
  } = options;

  const now = Date.now();

  // Mapping finishAction & rcLostAction exactly to DJI Fly schema
  const djiFinishAction =
    finishAction === 'goFirstWaypoint'
      ? 'goFirstWaypoint'
      : finishAction === 'autoHover'
      ? 'autoHover'
      : 'goHome';

  const djiExitOnRCLost =
    rcLostAction === 'goContinue' ? 'goContinue' : 'executeLostAction';
  const djiExecuteRCLostAction =
    rcLostAction === 'autoHover' ? 'autoHover' : 'goBack';

  // 1. Template KML - Exact DJI Fly schema (namespace: uav.com, author: fly, droneEnumValue: 68)
  const templateKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    <wpml:author>fly</wpml:author>
    <wpml:createTime>${now}</wpml:createTime>
    <wpml:updateTime>${now}</wpml:updateTime>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>${djiFinishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${djiExitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${djiExecuteRCLostAction}</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${globalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
  </Document>
</kml>`;

  // 2. Waylines WPML - Placemarks for all waypoints
  let placemarksXml = '';
  let globalActionId = 1;

  waypoints.forEach((wp, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === waypoints.length - 1;
    const pitch = wp.gimbalPitch ?? -90;
    const speed = wp.speed || globalSpeed;
    const turnMode = isStart || isEnd || userTurnMode === 'turnOnly'
      ? 'toPointAndStopWithContinuityCurvature'
      : 'toPointAndPassWithContinuityCurvature';

    placemarksXml += `
      <Placemark>
        <Point>
          <coordinates>
            ${wp.lng},${wp.lat}
          </coordinates>
        </Point>
        <wpml:index>${idx}</wpml:index>
        <wpml:executeHeight>${wp.altitude}</wpml:executeHeight>
        <wpml:waypointSpeed>${speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>
        <wpml:actionGroup>
          <wpml:actionGroupId>1</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${idx}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${idx}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>${globalActionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
              <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
          ${isStart ? `
          <wpml:action>
            <wpml:actionId>${globalActionId++}</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>${pitch}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>` : ''}
        </wpml:actionGroup>
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>${pitch}</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>`;
  });

  const waylinesWpml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>${djiFinishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${djiExitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${djiExecuteRCLostAction}</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${globalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>${globalSpeed}</wpml:autoFlightSpeed>
      ${placemarksXml}
    </Folder>
  </Document>
</kml>`;

  // Create KMZ ZIP archive
  const zip = new JSZip();
  zip.file('wpmz/template.kml', templateKml);
  zip.file('wpmz/waylines.wpml', waylinesWpml);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return blob;
}

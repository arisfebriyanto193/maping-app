export type MissionType = 'grid' | 'corridor' | 'waypoint' | 'orbit';
export type WaypointPathType = 'full' | 'turnOnly';

export type FinishAction = 'goHome' | 'autoHover' | 'goFirstWaypoint';
export type RCLostAction = 'goContinue' | 'executeLostAction' | 'autoHover';
export type CameraAction = 'takePhoto' | 'recordVideo' | 'none';

export interface DroneProfile {
  id: string;
  name: string;
  manufacturer: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  focalLengthMm: number;
  imageWidthPx: number;
  imageHeightPx: number;
  maxSpeedMs: number;
  maxFlightTimeMin: number;
  djiEnumCode?: number; // WPML droneEnumValue
}

export interface WaypointAction {
  type: 'takePhoto' | 'startRecord' | 'stopRecord' | 'hover' | 'gimbalPitch';
  param?: number;
}

export interface Waypoint {
  id: string | number;
  lat: number;
  lng: number;
  altitude: number; // in meters (AGL/MSL)
  speed: number; // in m/s
  heading?: number; // 0-360 degrees
  gimbalPitch?: number; // -90 to +20 degrees
  turnMode?: 'coordinateTurn' | 'toPointAndStopWithDiscontinuityCurvature' | 'toPointAndPassWithContinuityCurvature';
  action?: WaypointAction;
  curveSize?: number;
}

export interface MissionSettings {
  title: string;
  droneModel: string;
  missionType: MissionType;
  altitude: number; // meters (e.g. 15-200m)
  speed: number; // m/s (e.g. 2-15 m/s)
  overlapFront: number; // % (e.g. 75%)
  overlapSide: number; // % (e.g. 65%)
  gridAngle: number; // 0-360 degrees
  doubleGrid: boolean; // 3D crosshatch photogrammetry
  margin: number; // meters margin outside polygon
  gimbalPitch: number; // -90 nadir or oblique
  corridorWidth?: number; // meters for corridor
  orbitRadius?: number; // meters for orbit
  orbitCenter?: [number, number]; // [lat, lng] for orbit
  
  // AerialNav Safety & Behavior Parameters
  finishAction: FinishAction;
  rcLostAction: RCLostAction;
  cameraAction: CameraAction;
  takeoffSecurityHeight: number; // meters
  sensorMode?: '12mp' | '48mp'; // 12MP binned vs 48MP/50MP high-res
  turnMode?: 'turnOnly' | 'smooth'; // Turn Only (stop at point) vs Smooth Curvature
  waypointPathType?: WaypointPathType; // 'full' (all photo points) vs 'turnOnly' (corners only)
}

export interface MissionStats {
  areaM2: number;
  areaHectares: number;
  totalDistanceM: number;
  flightTimeSeconds: number;
  photoCount: number;
  gsdCmPx: number;
  batteriesRequired: number;
  batteryRemainingPercent: number;
}

export interface DroneMissionRecord {
  id?: number;
  user_id?: number;
  title: string;
  description?: string;
  drone_model: string;
  mission_type: MissionType;
  altitude: number;
  speed: number;
  overlap_front: number;
  overlap_side: number;
  grid_angle: number;
  gimbal_pitch: number;
  boundary_geojson?: any;
  waypoints_json: Waypoint[];
  stats_json?: MissionStats;
  created_at?: string;
  updated_at?: string;
}

export interface UserSession {
  id: number;
  username: string;
  email?: string;
  role: string;
}

export interface HistoryState {
  boundaryCoords: [number, number][];
  orbitCenter?: [number, number];
}

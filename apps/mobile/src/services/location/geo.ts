const EARTH_RADIUS_KM = 6371;

/** 두 WGS84 좌표 사이 거리(km). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * 1000);
}

export const MAP_RADIUS_KM = 1;

export function isWithinRadiusKm(
  centerLat: number,
  centerLng: number,
  lat: number,
  lng: number,
  radiusKm = MAP_RADIUS_KM
): boolean {
  return haversineKm(centerLat, centerLng, lat, lng) <= radiusKm;
}

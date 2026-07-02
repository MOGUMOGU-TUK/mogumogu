/** 공구 id를 지도상의 가짜 좌표(%)로 해싱한다. 데모용 마커 배치. */
export function mapPos(id: string): { left: string; top: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const left = 18 + Math.round(((h & 0xff) / 255) * 62);
  const top = 14 + Math.round((((h >> 8) & 0xff) / 255) * 64);
  return { left: `${left}%`, top: `${top}%` };
}

const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "";

type KakaoAddressDoc = {
  road_address: { address_name: string } | null;
  address: { address_name: string };
};

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
  );
  const data = (await res.json()) as { documents?: KakaoAddressDoc[] };
  const doc = data.documents?.[0];
  if (!doc) return "";
  return doc.road_address?.address_name ?? doc.address.address_name;
}

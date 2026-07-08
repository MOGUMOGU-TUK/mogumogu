const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "";
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";

export function buildMiniMapHtml(lat: number, lng: number, interactive = false) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    window.moveTo = function(lat, lng) {
      map.setCenter(new kakao.maps.LatLng(lat, lng));
    };
    kakao.maps.load(function() {
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${lat}, ${lng}),
        level: 4,
        draggable: ${interactive},
        scrollwheel: ${interactive},
        disableDoubleClickZoom: ${!interactive}
      });
    });
  </script>
</body>
</html>`;
}

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

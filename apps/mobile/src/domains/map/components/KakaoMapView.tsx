import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

export type KakaoMapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  selected?: boolean;
};

type LatLng = { lat: number; lng: number };

type Props = {
  center: LatLng;
  markers: KakaoMapMarker[];
  onMarkerPress?: (id: string) => void;
  style?: ViewStyle;
};

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";

function buildMapHtml(appKey: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #E8EDE6; }
  </style>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = null;
    var overlays = [];
    var youMarker = null;

    function post(type, payload) {
      var msg = JSON.stringify(Object.assign({ type: type }, payload || {}));
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      }
    }

    function clearOverlays() {
      overlays.forEach(function(o) { o.setMap(null); });
      overlays = [];
      if (youMarker) {
        youMarker.setMap(null);
        youMarker = null;
      }
    }

    function markerContent(label, selected) {
      var bg = selected ? "#FF6B9D" : "#ffffff";
      var color = selected ? "#ffffff" : "#1A1A1A";
      var border = selected ? "#FF6B9D" : "#E0E0E0";
      return '<div style="padding:6px 10px;border-radius:999px;background:' + bg + ';color:' + color + ';border:2px solid ' + border + ';font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12);">' + label + '</div>';
    }

    window.updateMap = function(payload) {
      if (!window.kakao || !window.kakao.maps) return;
      kakao.maps.load(function() {
        var center = new kakao.maps.LatLng(payload.center.lat, payload.center.lng);
        if (!map) {
          map = new kakao.maps.Map(document.getElementById('map'), {
            center: center,
            level: 4
          });
          post('ready');
        } else {
          map.setCenter(center);
        }

        clearOverlays();

        var youEl = document.createElement('div');
        youEl.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);';
        youMarker = new kakao.maps.CustomOverlay({
          position: center,
          content: youEl,
          yAnchor: 0.5
        });
        youMarker.setMap(map);

        (payload.markers || []).forEach(function(m) {
          var pos = new kakao.maps.LatLng(m.lat, m.lng);
          var overlay = new kakao.maps.CustomOverlay({
            position: pos,
            content: markerContent(m.label || '', !!m.selected),
            yAnchor: 1.2
          });
          overlay.setMap(map);
          overlays.push(overlay);

          var hit = document.createElement('div');
          hit.style.cssText = 'width:48px;height:48px;cursor:pointer;';
          hit.onclick = function() { post('marker', { id: m.id }); };
          var clickOverlay = new kakao.maps.CustomOverlay({
            position: pos,
            content: hit,
            yAnchor: 0.5
          });
          clickOverlay.setMap(map);
          overlays.push(clickOverlay);
        });
      });
    };

    kakao.maps.load(function() {
      post('sdkLoaded');
    });
  </script>
</body>
</html>`;
}

export function KakaoMapView({ center, markers, onMarkerPress, style }: Props) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const html = useMemo(() => buildMapHtml(KAKAO_JS_KEY), []);

  const payload = useMemo(
    () => JSON.stringify({ center, markers }),
    [center.lat, center.lng, markers]
  );

  const pushUpdate = useCallback(() => {
    if (!readyRef.current || !webRef.current) return;
    webRef.current.injectJavaScript(`window.updateMap(${payload}); true;`);
  }, [payload]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          id?: string;
        };
        if (data.type === "ready" || data.type === "sdkLoaded") {
          readyRef.current = true;
          pushUpdate();
        }
        if (data.type === "marker" && data.id) {
          onMarkerPress?.(data.id);
        }
      } catch {
        /* ignore malformed messages */
      }
    },
    [onMarkerPress, pushUpdate]
  );

  if (!KAKAO_JS_KEY) {
    return <View style={[styles.fallback, style]} />;
  }

  if (Platform.OS === "web") {
    return <View style={[styles.fallback, style]} />;
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://localhost" }}
      style={[styles.webview, style]}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#E8EDE6" },
  fallback: { flex: 1, backgroundColor: "#E8EDE6" }
});

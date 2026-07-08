import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import { LocationIcon, MapPinIcon } from "../../../shared/ui/icons";
import { reverseGeocode } from "../../map/services/kakaoGeo";

export type PickupPlace = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
};

type KakaoDoc = {
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string;
  y: string;
};

const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "";
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";
const DEFAULT_CENTER = { lat: 37.4812, lng: 126.9527 };

function buildPickerHtml(appKey: string, lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#E8EDE6;}</style>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    function post(type, payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify(Object.assign({type:type}, payload||{}))
      );
    }
    function postCenter() {
      var c = map.getCenter();
      post('center', {lat:c.getLat(), lng:c.getLng()});
    }
    window.moveTo = function(lat, lng) {
      map.setCenter(new kakao.maps.LatLng(lat, lng));
      // postCenter 호출 안 함 — RN 측에서 직접 세팅
    };
    kakao.maps.load(function() {
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${lat}, ${lng}),
        level: 4
      });
      postCenter();
      kakao.maps.event.addListener(map, 'dragend', postCenter);
    });
  </script>
</body>
</html>`;
}

export function PlaceSearchSheet({
  visible,
  initialCenter,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialCenter?: { lat: number; lng: number };
  onSelect: (place: PickupPlace) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);

  const [query, setQuery] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [results, setResults] = useState<KakaoDoc[]>([]);
  const [searching, setSearching] = useState(false);

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [centerAddress, setCenterAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // 검색 결과로 선택된 장소명 (지도 드래그 시 초기화)
  const [selectedName, setSelectedName] = useState("");

  const initialCenterResolved = initialCenter ?? DEFAULT_CENTER;
  const html = useMemo(
    () => buildPickerHtml(KAKAO_JS_KEY, initialCenterResolved.lat, initialCenterResolved.lng),
    [initialCenterResolved.lat, initialCenterResolved.lng],
  );

  // 지도 중심 변경 시 역지오코딩 (디바운스)
  useEffect(() => {
    if (!center) return;
    setGeocoding(true);
    setCenterAddress("");
    const timer = setTimeout(async () => {
      try {
        const address = await reverseGeocode(center.lat, center.lng);
        setCenterAddress(address);
      } catch {
        setCenterAddress("");
      } finally {
        setGeocoding(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [center]);

  // 검색 디바운스
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`,
          { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
        );
        const data = (await res.json()) as { documents?: KakaoDoc[] };
        setResults(data.documents ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; lat?: number; lng?: number };
      if (data.type === "center" && data.lat != null && data.lng != null) {
        setSelectedName("");
        setCenter({ lat: data.lat, lng: data.lng });
      }
    } catch { /* ignore */ }
  }, []);

  function handleSelectResult(doc: KakaoDoc) {
    const lat = parseFloat(doc.y);
    const lng = parseFloat(doc.x);
    Keyboard.dismiss();
    setSelectedName(doc.place_name);
    setQuery(doc.place_name);
    setDropdownVisible(false);
    setResults([]);
    setCenter({ lat, lng });
    setCenterAddress(doc.road_address_name || doc.address_name);
    setGeocoding(false);
    webRef.current?.injectJavaScript(`window.moveTo(${lat}, ${lng}); true;`);
  }

  function handleConfirm() {
    if (!center) return;
    onSelect({
      name: selectedName || centerAddress || "선택한 위치",
      address: centerAddress,
      latitude: center.lat,
      longitude: center.lng,
    });
    reset();
  }

  function reset() {
    setQuery("");
    setResults([]);
    setCenter(null);
    setCenterAddress("");
    setSelectedName("");
    setDropdownVisible(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={reset}>
      <View style={[styles.flex, { backgroundColor: t.bg, paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.simpleHeader}>
          <Pressable onPress={reset} style={{ padding: 4 }}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.simpleHeaderTitle}>픽업 장소 선택</Text>
        </View>

        {/* 지도 영역 */}
        <View style={styles.flex}>
          {Platform.OS !== "web" && KAKAO_JS_KEY ? (
            <WebView
              ref={webRef}
              originWhitelist={["*"]}
              source={{ html, baseUrl: "https://localhost" }}
              style={styles.flex}
              onMessage={onMessage}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              setSupportMultipleWindows={false}
            />
          ) : (
            <View style={[styles.flex, { backgroundColor: "#E8EDE6" }]} />
          )}

          {/* 중앙 고정 핀 (터치 통과) */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
          >
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.rose, borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 }} />
              <View style={{ width: 2, height: 14, backgroundColor: t.rose, marginTop: -1 }} />
              <View style={{ width: 8, height: 4, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.15)" }} />
            </View>
          </View>

          {/* 현위치 이동 버튼 */}
          {initialCenter && (
            <Pressable
              onPress={() => {
                setSelectedName("");
                setCenter(initialCenter);
                setCenterAddress("");
                webRef.current?.injectJavaScript(
                  `window.moveTo(${initialCenter.lat}, ${initialCenter.lng}); true;`
                );
              }}
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <LocationIcon size={20} color={t.ink} />
            </Pressable>
          )}

          {/* 검색창 (지도 위 오버레이) */}
          <View style={{ position: "absolute", top: 10, left: 12, right: 12 }}>
            <TextInput
              value={query}
              onChangeText={(v) => {
                setQuery(v);
                setDropdownVisible(!!v.trim());
                if (!v) setSelectedName("");
              }}
              placeholder="장소명 또는 주소 검색"
              placeholderTextColor={t.dim}
              style={{
                height: 44,
                backgroundColor: "#fff",
                borderRadius: 12,
                paddingHorizontal: 14,
                fontSize: 14,
                color: t.ink,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 4,
              }}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />

            {/* 검색 결과 드롭다운 */}
            {dropdownVisible && (
              <View style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                marginTop: 6,
                maxHeight: 240,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
                overflow: "hidden",
              }}>
                {searching ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 }}>
                    <ActivityIndicator size="small" color={t.rose} />
                    <Text style={{ fontSize: 13, color: t.muted }}>검색 중...</Text>
                  </View>
                ) : results.length === 0 ? (
                  <Text style={{ textAlign: "center", color: t.muted, paddingVertical: 16, fontSize: 13 }}>
                    검색 결과가 없어요
                  </Text>
                ) : (
                  <FlatList
                    data={results}
                    keyExtractor={(_, i) => String(i)}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item, index }) => (
                      <Pressable
                        onPress={() => handleSelectResult(item)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: pressed ? t.roseSoft : "#fff",
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: t.line,
                        })}
                      >
                        <View style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: t.roseSoft,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <MapPinIcon size={16} color={t.rose} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }} numberOfLines={1}>
                            {item.place_name}
                          </Text>
                          {(item.road_address_name || item.address_name) !== "" && (
                            <Text style={{ fontSize: 11, color: t.muted, marginTop: 1 }} numberOfLines={1}>
                              {item.road_address_name || item.address_name}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    )}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* 하단 주소 + 확정 버튼 */}
        <View style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: t.line,
          backgroundColor: "#fff",
          gap: 12,
        }}>
          {/* 주소 카드 */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: "#fff",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}>
            {/* 장소 아이콘 */}
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.roseSoft,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <MapPinIcon size={18} color={t.rose} />
            </View>

            {/* 주소 텍스트 */}
            <View style={{ flex: 1 }}>
              {geocoding ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color={t.rose} />
                  <Text style={{ fontSize: 13, color: t.muted }}>주소 불러오는 중...</Text>
                </View>
              ) : centerAddress ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }} numberOfLines={1}>
                    {selectedName || centerAddress}
                  </Text>
                  {selectedName ? (
                    <Text style={{ fontSize: 11, color: t.muted, marginTop: 2 }} numberOfLines={1}>
                      {centerAddress}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={{ fontSize: 13, color: t.muted }}>
                  지도를 움직여 위치를 선택하세요
                </Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={!center || geocoding}
            style={[styles.footerButton, { backgroundColor: center && !geocoding ? t.pink : t.trackOff }]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
              이 위치로 선택
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

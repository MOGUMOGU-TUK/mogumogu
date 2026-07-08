import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import { CREATE_CATS } from "../types";
import { fmt } from "../utils";
import { PlaceSearchSheet, type PickupPlace } from "./PlaceSearchSheet";
import { MapCenterPin } from "../../../shared/ui/icons";
import { buildMiniMapHtml } from "../../map/services/kakaoGeo";

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";
const DEFAULT_CENTER = { lat: 37.4812, lng: 126.9527 };

type CreateScreenProps = {
  cat: string;
  onCat: (c: string) => void;
  title: string;
  onTitle: (v: string) => void;
  total: string;
  qty: string;
  time: string;
  onTotal: (v: string) => void;
  onQty: (v: string) => void;
  onTime: (v: string) => void;
  pickupPlace: PickupPlace | null;
  onPickupPlace: (place: PickupPlace) => void;
  initialCenter?: { lat: number; lng: number };
  locationAvailable: boolean;
  onBack: () => void;
  onPost: () => void | Promise<void>;
};

export function CreateScreen({
  cat,
  onCat,
  title,
  onTitle,
  total,
  qty,
  time,
  onTotal,
  onQty,
  onTime,
  pickupPlace,
  onPickupPlace,
  initialCenter,
  locationAvailable,
  onBack,
  onPost,
}: CreateScreenProps) {
  const perUnit = fmt(Math.ceil((Number(total) || 0) / (Number(qty) || 1)));
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const miniMapRef = useRef<WebView>(null);

  const initialMapCenter = initialCenter ?? DEFAULT_CENTER;
  const miniMapHtml = useMemo(
    () => buildMiniMapHtml(initialMapCenter.lat, initialMapCenter.lng, true),
    [initialMapCenter.lat, initialMapCenter.lng],
  );

  useEffect(() => {
    if (!pickupPlace) return;
    miniMapRef.current?.injectJavaScript(
      `window.moveTo(${pickupPlace.latitude}, ${pickupPlace.longitude}); true;`
    );
  }, [pickupPlace]);

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>공구 만들기</Text>
      </View>

      <ScrollView contentContainerStyle={styles.createBody}>
        <View>
          <Text style={styles.fieldLabel}>상품 사진</Text>
          <View style={{ flexDirection: "row", gap: 9, marginTop: 9 }}>
            <Pressable style={styles.photoAdd}>
              <CameraIcon size={22} color={t.dim} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: t.dim }}>
                0/5
              </Text>
            </Pressable>
            <View style={[styles.photoThumb, { backgroundColor: "#EDDEE3" }]} />
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>제목</Text>
          <TextInput
            value={title}
            onChangeText={onTitle}
            placeholder="예) 코스트코 크루아상 나눠사요"
            placeholderTextColor={t.dim}
            style={styles.createInput}
          />
        </View>

        <View>
          <Text style={styles.fieldLabel}>카테고리</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
            {CREATE_CATS.map((label) => {
              const active = label === cat;
              return (
                <Pressable
                  key={label}
                  onPress={() => onCat(label)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? t.roseSoft : "#fff",
                      borderColor: active ? t.rose : t.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? t.rose : t.chipInk,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 11 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>총 가격</Text>
            <View style={styles.suffixField}>
              <TextInput
                value={total}
                onChangeText={onTotal}
                keyboardType="number-pad"
                style={styles.suffixInput}
              />
              <Text style={styles.suffix}>원</Text>
            </View>
          </View>
          <View style={{ width: 108 }}>
            <Text style={styles.fieldLabel}>총 수량</Text>
            <View style={styles.suffixField}>
              <TextInput
                value={qty}
                onChangeText={onQty}
                keyboardType="number-pad"
                style={styles.suffixInput}
              />
              <Text style={styles.suffix}>개</Text>
            </View>
          </View>
        </View>

        <View style={styles.perPersonBox}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: t.roseInk }}>
            1개당 가격
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: t.rose }}>
            {perUnit}
          </Text>
        </View>

        <View>
          <Text style={styles.fieldLabel}>픽업 장소</Text>
          <Pressable
            onPress={() => setShowPlaceSearch(true)}
            style={[
              styles.createInput,
              {
                height: undefined,
                minHeight: 46,
                paddingVertical: 10,
                justifyContent: "center",
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 10,
              },
            ]}
          >
            <Text
              style={{ fontSize: 14, color: pickupPlace ? t.ink : !locationAvailable ? t.rose : t.dim }}
              numberOfLines={1}
            >
              {pickupPlace
                ? pickupPlace.isDefault
                  ? `현위치: ${pickupPlace.address || pickupPlace.name}`
                  : pickupPlace.name
                : !locationAvailable
                  ? "위치를 찾을 수 없어요. GPS를 확인해주세요."
                  : "장소를 검색하세요"}
            </Text>
            {pickupPlace && !pickupPlace.isDefault && !!pickupPlace.address && pickupPlace.name !== pickupPlace.address && (
              <Text style={{ fontSize: 11, color: t.muted, marginTop: 2 }} numberOfLines={1}>
                {pickupPlace.address}
              </Text>
            )}
          </Pressable>

          {/* 미니 맵 */}
          <Pressable
            onPress={() => setShowPlaceSearch(true)}
            style={{
              height: 130,
              borderRadius: 10,
              overflow: "hidden",
              marginTop: 8,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            {Platform.OS !== "web" && KAKAO_JS_KEY ? (
              <WebView
                ref={miniMapRef}
                originWhitelist={["*"]}
                source={{ html: miniMapHtml, baseUrl: "https://localhost" }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                setSupportMultipleWindows={false}
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: "#E8EDE6" }} />
            )}
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ marginBottom: 32 }}>
                <MapCenterPin />
              </View>
            </View>
          </Pressable>
        </View>

        <View>
          <Text style={styles.fieldLabel}>픽업 시간</Text>
          <TextInput
            value={time}
            onChangeText={onTime}
            placeholder="오늘 저녁 7시"
            placeholderTextColor={t.dim}
            style={styles.createInput}
          />
        </View>

        <View>
          <Text style={styles.fieldLabel}>소분 방법</Text>
          <TextInput
            placeholder="예) 1인 4개씩 나눠가져요"
            placeholderTextColor={t.dim}
            style={styles.createInput}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable
          style={[styles.footerButton, { backgroundColor: t.pink }]}
          onPress={onPost}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
            공구 게시하기
          </Text>
        </Pressable>
      </View>

      <PlaceSearchSheet
        visible={showPlaceSearch}
        initialCenter={initialCenter}
        onSelect={(place) => {
          onPickupPlace(place);
          setShowPlaceSearch(false);
        }}
        onClose={() => setShowPlaceSearch(false)}
      />
    </View>
  );
}

function CameraIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s * 0.82 }}>
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: s * 0.62,
          backgroundColor: color,
          borderRadius: s * 0.12,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: s * 0.13,
          left: "50%",
          marginLeft: -s * 0.175,
          width: s * 0.35,
          height: s * 0.35,
          borderRadius: s * 0.175,
          backgroundColor: "rgba(255,255,255,0.85)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: "26%",
          width: s * 0.3,
          height: s * 0.2,
          backgroundColor: color,
          borderRadius: s * 0.06,
        }}
      />
    </View>
  );
}

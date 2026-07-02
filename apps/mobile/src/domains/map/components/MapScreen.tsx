import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import type { VerifiedLocation } from "../../location/services/verifyNeighborhood";
import type { Deal } from "../../gonggu/types";
import { fmt, qtyStr, unitPrice } from "../../gonggu/utils";
import { KakaoMapView } from "./KakaoMapView";

/** 인증 위치가 없을 때 지도 기본 중심(서울 관악 근처). */
const DEFAULT_CENTER = { lat: 37.4812, lng: 126.9527 };

export function MapScreen({
  deals,
  verifiedLocation,
  locationLabel,
  mapSel,
  pick,
  onPickMarker,
  onList,
  onOpen,
}: {
  deals: Deal[];
  verifiedLocation: VerifiedLocation | null;
  locationLabel: string;
  mapSel: string;
  pick: Deal | null;
  onPickMarker: (id: string) => void;
  onList: () => void;
  onOpen: () => void;
}) {
  const mapCenter = verifiedLocation
    ? { lat: verifiedLocation.latitude, lng: verifiedLocation.longitude }
    : DEFAULT_CENTER;

  const markers = useMemo(
    () =>
      deals
        .filter((d) => d.pickupLatitude != null && d.pickupLongitude != null)
        .map((d) => ({
          id: d.id,
          lat: d.pickupLatitude!,
          lng: d.pickupLongitude!,
          label: fmt(unitPrice(d)),
          selected: d.id === mapSel,
        })),
    [deals, mapSel],
  );

  return (
    <View style={styles.mapWrap}>
      <KakaoMapView
        center={mapCenter}
        markers={markers}
        onMarkerPress={onPickMarker}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {!verifiedLocation && (
        <View style={styles.mapOverlayBanner}>
          <Text style={styles.mapOverlayText}>
            동네 인증 후 내 위치 기준 지도를 이용할 수 있어요
          </Text>
        </View>
      )}

      {/* top bar */}
      <View style={styles.mapTopBar}>
        <View style={styles.mapPill}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>
            {locationLabel} · 반경 1km
          </Text>
        </View>
        <Pressable style={styles.mapPill} onPress={onList}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.rose }}>
            ☰ 리스트
          </Text>
        </Pressable>
      </View>

      {/* bottom sheet */}
      {pick && (
        <View style={styles.mapSheet}>
          <Pressable style={{ flexDirection: "row", gap: 12 }} onPress={onOpen}>
            <View
              style={[styles.mapSheetThumb, { backgroundColor: pick.tint }]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: pick.urgent ? t.urgentInk : t.chipInk,
                }}
              >
                {pick.deadline}
              </Text>
              <Text style={styles.mapSheetTitle} numberOfLines={1}>
                {pick.title}
              </Text>
              <Text style={styles.dealStore}>
                {pick.spot} · {qtyStr(pick)}
              </Text>
              <Text style={[styles.dealPrice, { marginTop: 3 }]}>
                1개당 {fmt(unitPrice(pick))}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.mapSheetButton} onPress={onOpen}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
              자세히 보기
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

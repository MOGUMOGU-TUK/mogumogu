import * as Location from "expo-location";
import { Platform } from "react-native";

export type VerifiedLocation = {
  latitude: number;
  longitude: number;
  /** 행정동/법정동 이름 (예: 봉천동) */
  neighborhood: string;
  /** 구/군 이름 (예: 관악구) */
  district: string | null;
};

/** UI에 표시할 인증 동네 라벨 (예: 관악구 봉천동) */
export function formatVerifiedLocationBrief(
  location: Pick<VerifiedLocation, "neighborhood" | "district"> | null | undefined
): string {
  if (!location?.neighborhood || location.neighborhood === "현재 위치") {
    return "동네 미인증";
  }

  const { neighborhood, district } = location;
  if (district && !neighborhood.includes(district)) {
    return `${district} ${neighborhood}`;
  }
  return neighborhood;
}

type KakaoRegionDocument = {
  region_type?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
};

type KakaoRegionResponse = {
  documents?: KakaoRegionDocument[];
};

const GPS_TOTAL_MS = 8_000;
const KAKAO_TIMEOUT_MS = 5_000;

function gpsTimeoutMessage(): string {
  return Platform.OS === "web"
    ? "위치 확인 시간이 초과됐어요. 브라우저 주소창 옆 위치 권한을 허용했는지 확인해 주세요."
    : "위치 확인 시간이 초과됐어요. 에뮬레이터면 터미널에서 adb emu geo fix 126.9527 37.4812 실행 후 다시 시도해 주세요.";
}

/** 카카오 coord2regioncode 서비스 가능 대략 범위 (WGS84) */
function isInKorea(latitude: number, longitude: number): boolean {
  return latitude >= 33 && latitude <= 39.5 && longitude >= 124 && longitude <= 132;
}

function normalizeCoords(coords: { latitude: number; longitude: number }) {
  return { latitude: coords.latitude, longitude: coords.longitude };
}

function isUsableCoords(coords: { latitude: number; longitude: number } | null): coords is {
  latitude: number;
  longitude: number;
} {
  return coords != null && isInKorea(coords.latitude, coords.longitude);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/** expo-location 영문 에러 → 사용자용 한국어 */
export function mapLocationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Current location is unavailable") ||
    message.includes("location services are enabled") ||
    message.includes("Location provider is disabled")
  ) {
    return Platform.OS === "web"
      ? "브라우저에서 위치 권한을 허용해 주세요."
      : "위치(GPS)를 켜 주세요. 에뮬레이터는 터미널에서 adb emu geo fix 경도 위도 실행 후 다시 시도해 주세요.";
  }

  if (message.includes("timeout") || message.includes("초과") || message.includes("NOT_KOREA")) {
    return gpsTimeoutMessage();
  }

  return message || "위치 확인에 실패했어요. 다시 시도해 주세요.";
}

async function tryLastKnown(): Promise<{ latitude: number; longitude: number } | null> {
  const cached = await Location.getLastKnownPositionAsync();
  if (!cached) return null;
  const coords = normalizeCoords(cached.coords);
  return isUsableCoords(coords) ? coords : null;
}

async function pollLastKnownPosition(): Promise<{ latitude: number; longitude: number } | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const coords = await tryLastKnown();
    if (coords) return coords;
    if (attempt < 3) await sleep(250);
  }
  return null;
}

function watchForKoreaPosition(timeoutMs: number): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    let subscription: Location.LocationSubscription | null = null;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void subscription?.remove();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error(gpsTimeoutMessage())));
    }, timeoutMs);

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Lowest,
        timeInterval: 200,
        distanceInterval: 0
      },
      (location) => {
        const coords = normalizeCoords(location.coords);
        if (isUsableCoords(coords)) {
          finish(() => resolve(coords));
        }
      }
    )
      .then((sub) => {
        subscription = sub;
      })
      .catch((error: unknown) => {
        finish(() => reject(error));
      });
  });
}

async function tryGetCurrentKorea(): Promise<{ latitude: number; longitude: number }> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Lowest
  });
  const coords = normalizeCoords(position.coords);
  if (!isUsableCoords(coords)) {
    throw new Error("NOT_KOREA");
  }
  return coords;
}

async function waitForKoreaCoords(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    void withTimeout(tryGetCurrentKorea(), 4_000, "NOT_KOREA")
      .then((coords) => finish(() => resolve(coords)))
      .catch(() => {
        /* watch가 이어서 시도 */
      });

    void watchForKoreaPosition(GPS_TOTAL_MS)
      .then((coords) => finish(() => resolve(coords)))
      .catch((error: unknown) => finish(() => reject(error)));
  });
}

async function readCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const cached = await pollLastKnownPosition();
  if (cached) return cached;

  if (Platform.OS === "web") {
    return withTimeout(tryGetCurrentKorea(), GPS_TOTAL_MS, gpsTimeoutMessage());
  }

  return withTimeout(waitForKoreaCoords(), GPS_TOTAL_MS, gpsTimeoutMessage());
}

async function getCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("Location provider is disabled");
  }

  return readCoordinates();
}

async function resolveNeighborhoodFromKakao(
  latitude: number,
  longitude: number
): Promise<Pick<VerifiedLocation, "neighborhood" | "district">> {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new Error(
      "카카오 REST API 키가 없어요. .env에 EXPO_PUBLIC_KAKAO_REST_API_KEY를 넣고 앱을 다시 시작해 주세요."
    );
  }

  if (!isInKorea(latitude, longitude)) {
    throw new Error(
      "한국 밖 좌표예요. 에뮬레이터면 adb emu geo fix 경도 위도 로 한국 좌표를 넣어 주세요."
    );
  }

  const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${longitude}&y=${latitude}&input_coord=WGS84`;
  const response = await withTimeout(
    fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` }
    }),
    KAKAO_TIMEOUT_MS,
    "동네 이름 확인 시간이 초과됐어요."
  );

  if (!response.ok) {
    let detail = "";
    try {
      const err = (await response.json()) as { msg?: string; code?: number };
      if (err.code === -2) {
        throw new Error(
          "한국 밖 좌표예요. 에뮬레이터면 adb emu geo fix 경도 위도 로 한국 좌표를 넣어 주세요."
        );
      }
      detail = err.msg ? ` (${err.msg})` : "";
    } catch (error) {
      if (error instanceof Error && error.message.includes("한국 밖")) throw error;
    }
    throw new Error(
      `동네 이름 확인에 실패했어요${detail}. 카카오 개발자 콘솔에서 로컬 API가 켜져 있는지 확인해 주세요.`
    );
  }

  const data = (await response.json()) as KakaoRegionResponse;
  const dong =
    data.documents?.find((doc) => doc.region_type === "H") ??
    data.documents?.find((doc) => doc.region_type === "B") ??
    data.documents?.[0];

  const neighborhood =
    dong?.region_3depth_name?.trim() ||
    dong?.region_2depth_name?.trim() ||
    dong?.region_1depth_name?.trim() ||
    null;
  if (!neighborhood) {
    throw new Error("동네 이름을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  const district = dong?.region_2depth_name?.trim() || null;
  return { neighborhood, district };
}

/** GPS + 카카오 로컬 API로 동네 이름을 확인한다. */
export async function verifyNeighborhood(): Promise<VerifiedLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("위치 권한이 필요해요. 설정 → 앱 → 모구모구 → 위치에서 허용해 주세요.");
  }

  const { latitude, longitude } = await getCoordinates();
  const resolved = await resolveNeighborhoodFromKakao(latitude, longitude);

  return { latitude, longitude, neighborhood: resolved.neighborhood, district: resolved.district };
}

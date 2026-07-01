import * as Location from "expo-location";
import { Platform } from "react-native";

export type VerifiedLocation = {
  latitude: number;
  longitude: number;
  neighborhood: string;
};

type KakaoRegionDocument = {
  region_type?: string;
  region_3depth_name?: string;
  region_2depth_name?: string;
};

type KakaoRegionResponse = {
  documents?: KakaoRegionDocument[];
};

const GPS_TIMEOUT_MS = 10_000;
const KAKAO_TIMEOUT_MS = 8_000;

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

  if (message.includes("timeout") || message.includes("초과")) {
    return "위치 확인 시간이 초과됐어요. 에뮬레이터면 adb emu geo fix 로 좌표를 넣은 뒤 다시 시도해 주세요.";
  }

  return message || "위치 확인에 실패했어요. 다시 시도해 주세요.";
}

async function tryLastKnown(): Promise<{ latitude: number; longitude: number } | null> {
  // maxAge 없이 — 에뮬레이터 mock 좌표도 받아들임
  const cached = await Location.getLastKnownPositionAsync();
  return cached ? cached.coords : null;
}

async function pollLastKnownPosition(): Promise<{ latitude: number; longitude: number } | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const coords = await tryLastKnown();
    if (coords) return coords;
    await sleep(500);
  }
  return null;
}

function watchFirstPosition(timeoutMs: number): Promise<Location.LocationObject> {
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
      finish(() => reject(new Error("위치 확인 시간이 초과됐어요.")));
    }, timeoutMs);

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Lowest,
        timeInterval: 300,
        distanceInterval: 0
      },
      (location) => {
        finish(() => resolve(location));
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

async function readCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const cached = await pollLastKnownPosition();
  if (cached) return cached;

  // getCurrentPosition — adb geo fix 후 종종 바로 됨
  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
      GPS_TIMEOUT_MS,
      "위치 확인 시간이 초과됐어요."
    );
    return position.coords;
  } catch {
    // watch로 재시도
  }

  if (Platform.OS === "android") {
    return (await watchFirstPosition(GPS_TIMEOUT_MS)).coords;
  }

  throw new Error("위치 확인 시간이 초과됐어요.");
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
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
  if (!apiKey) return null;

  const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${longitude}&y=${latitude}`;
  const response = await withTimeout(
    fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` }
    }),
    KAKAO_TIMEOUT_MS,
    "동네 이름 확인 시간이 초과됐어요."
  );

  if (!response.ok) return null;

  const data = (await response.json()) as KakaoRegionResponse;
  const dong =
    data.documents?.find((doc) => doc.region_type === "B") ?? data.documents?.[0];

  return dong?.region_3depth_name ?? dong?.region_2depth_name ?? null;
}

/** GPS + 카카오 로컬 API로 동네 이름을 확인한다. */
export async function verifyNeighborhood(): Promise<VerifiedLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("위치 권한이 필요해요. 설정 → 앱 → 모구모구 → 위치에서 허용해 주세요.");
  }

  const { latitude, longitude } = await getCoordinates();
  const neighborhood =
    (await resolveNeighborhoodFromKakao(latitude, longitude)) ?? "현재 위치";

  return { latitude, longitude, neighborhood };
}

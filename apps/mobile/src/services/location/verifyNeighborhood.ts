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

const GPS_TIMEOUT_MS = 20_000;
const KAKAO_TIMEOUT_MS = 8_000;
const CACHE_POLL_MS = 1_500;
const CACHE_POLL_ATTEMPTS = 8;

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
      : "위치(GPS)를 켜 주세요. 에뮬레이터면 Location에서 Set Location 후 2~3초 기다렸다가 다시 시도해 주세요.";
  }

  if (message.includes("timeout") || message.includes("초과")) {
    return "위치 확인 시간이 초과됐어요. Set Location 후 잠시 기다렸다가 다시 눌러 주세요.";
  }

  return message || "위치 확인에 실패했어요. 다시 시도해 주세요.";
}

/** Set Location 직후 에뮬레이터에 좌표가 반영될 때까지 잠깐 기다린다. */
async function pollLastKnownPosition(): Promise<{ latitude: number; longitude: number } | null> {
  for (let attempt = 0; attempt < CACHE_POLL_ATTEMPTS; attempt += 1) {
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 });
    if (cached) return cached.coords;
    if (attempt < CACHE_POLL_ATTEMPTS - 1) {
      await sleep(CACHE_POLL_MS);
    }
  }
  return null;
}

/** Android 에뮬레이터에서 getCurrentPosition보다 잘 동작하는 경우가 많다. */
function watchFirstPosition(timeoutMs: number): Promise<Location.LocationObject> {
  return new Promise((resolve, reject) => {
    let subscription: Location.LocationSubscription | null = null;

    const timer = setTimeout(() => {
      void subscription?.remove();
      reject(new Error("위치 확인 시간이 초과됐어요."));
    }, timeoutMs);

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Lowest,
        timeInterval: 500,
        distanceInterval: 0
      },
      (location) => {
        clearTimeout(timer);
        void subscription?.remove();
        resolve(location);
      }
    )
      .then((sub) => {
        subscription = sub;
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function readCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const cached = await pollLastKnownPosition();
  if (cached) return cached;

  if (Platform.OS === "android") {
    try {
      return (await watchFirstPosition(GPS_TIMEOUT_MS)).coords;
    } catch {
      // watch 실패 시 getCurrentPosition으로 폴백
    }
  }

  const position = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
    GPS_TIMEOUT_MS,
    "위치 확인 시간이 초과됐어요."
  );
  return position.coords;
}

async function getCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("Location provider is disabled");
  }

  if (Platform.OS === "android") {
    try {
      await Location.enableNetworkProviderAsync();
    } catch {
      // 네트워크 위치 활성화 거부
    }
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
